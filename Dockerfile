# Things: the Next.js app (studio, landing, chat API, admin) in one image.
# Build:  docker build -t things .
# Run:    docker run -p 3000:3000 -v things-data:/app/data --env-file .env things
# The collector (embed mode) runs from the same image:  docker run ... things npm run collector
FROM node:26-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:26-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# SITE_URL is baked into page metadata at build time.
ARG SITE_URL=
ENV SITE_URL=$SITE_URL NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:26-alpine
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 DATA_DIR=/app/data
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/app ./app
COPY --from=build /app/lib ./lib
COPY --from=build /app/server ./server
COPY --from=build /app/content ./content
COPY --from=build /app/next.config.mjs /app/middleware.js ./
RUN mkdir -p /app/data && chown -R node:node /app/data
USER node
VOLUME ["/app/data"]
EXPOSE 3000 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["npm", "start"]
