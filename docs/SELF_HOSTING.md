# Self-hosting Things

Things is free and MIT licensed. Everything below runs on hardware you control. There is no account, no license key and no telemetry: the server never contacts Rothenhall, and it contacts no one else unless you configure an LLM provider or a content crawl. One thing to know: the pages load their fonts (Caveat, Jost, Instrument Sans) from Google Fonts, so a visitor's browser makes that request. To avoid it, download the fonts into `public/` and replace the `<link>` tags in `app/layout.js` with `@font-face` rules.

Pick a setup:

| Setup | Use it when | Data lives |
|---|---|---|
| **A. All-in-one** | You want the studio, the landing page, the chat and the dashboard on one server. | On that server. |
| **B. Embed + your own collector** | You want the widget on any website, loaded from a deployed Things site, with chat logs and traffic data kept on your own PC or server. | On the machine running the collector. See [EMBEDDING.md](EMBEDDING.md). |

Requirements: Node.js 20.12 or newer (or Docker). No database.

## A. All-in-one

### Docker

```bash
git clone https://github.com/Rothenhall/Things.git
cd things
cp .env.example .env        # then set ADMIN_TOKEN, SITE_URL, ALLOWED_ORIGINS
docker compose up -d --build
```

Open http://localhost:3000. Data is in the `things-data` volume. Your content is the `./content` folder, mounted read-only; edit the files and the chat picks them up on the next request.

> The Dockerfile has not been run in CI yet. If a build fails, please open an issue.

### Node directly

```bash
git clone https://github.com/Rothenhall/Things.git
cd things
npm ci
cp .env.example .env
npm run build
npm start                   # http://localhost:3000
```

Keep it running with systemd, pm2 or your platform's process manager. Put it behind a reverse proxy (Caddy, nginx) for HTTPS, and pass `X-Forwarded-For`, `X-Forwarded-Proto` and `Host`.

### Serverless hosts (Vercel, Netlify)

The studio and landing page work. The chat, tracking and dashboard write JSONL files to `DATA_DIR`, and serverless file systems are read-only or ephemeral, so logs would be lost. Use setup B: deploy the site there, run the collector elsewhere, and set `COLLECTOR_URL`.

## Your content

The chat answers only from your content. There are three sources, which you can combine.

1. **Markdown files** in `content/`. Front matter is optional:

   ```markdown
   ---
   title: Shipping
   description: Where we ship and how long it takes.
   path: /shipping        # URL path; defaults to the file name (index.md = /)
   type: faq              # "faq" turns every "## Question" into FAQPage JSON-LD
   ---
   # Shipping

   ## Do you ship to Canada?
   Yes, in 3 to 5 business days.
   ```

   In the Next.js app each file also becomes a real page at its `path` (so crawlers and people see the same text). Files named `README.md` or starting with `_` are ignored.

2. **A sitemap crawl**: `CONTENT_SITEMAP=https://example.com/sitemap.xml`. Same-origin pages only, at most 50, refreshed hourly. Text is extracted from the HTML.
3. **A URL list**: `CONTENT_URLS=https://example.com/a,https://example.com/b`.

Answers are found with BM25 keyword search. A question counts as a **content gap** when fewer than half of its meaningful words appear in the best passage.

## Answer engine

By default there is no AI model: the character quotes the best matching sentences from your content. That costs nothing and sends nothing anywhere.

For fluent answers set a provider in `.env`:

```bash
# OpenAI-compatible (OpenAI, OpenRouter, ...)
LLM_API_KEY=sk-...
LLM_MODEL=gpt-4o-mini

# Fully local with Ollama
LLM_BASE_URL=http://localhost:11434/v1
LLM_MODEL=llama3.2

# Anthropic
LLM_PROVIDER=anthropic
LLM_API_KEY=sk-ant-...
```

With a provider set, the visitor's question and up to four matching passages are sent to it. The model is told to answer only from those passages and to say `NO_ANSWER` otherwise, which is logged as a gap. `CHAT_DAILY_LLM_LIMIT` (default 500) caps daily calls so a public endpoint cannot run up your bill.

## The dashboard

Set `ADMIN_TOKEN` and open `/admin`. Generate a token with:

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```

You get content gaps (with a copy-ready list of prompts to test in ChatGPT and Perplexity), AI crawler hits, the pages they read, the paths they requested that do not exist, visits from AI answers with bounce rate, and a readiness checklist. The same data downloads from `/api/admin/export?type=json|gaps|prompts` using `Authorization: Bearer <ADMIN_TOKEN>`.

## Data and privacy

Three append-only files in `DATA_DIR`:

| File | Contains |
|---|---|
| `questions.jsonl` | question text, answered or not, match score, page, daily-rotating anonymous id, origin |
| `bot-hits.jsonl` | crawler name, path, whether a page exists, html or markdown |
| `visits.jsonl` | only visits arriving from an AI answer: source, path, time on page, interacted or not |

IP addresses are never stored. The anonymous id is a hash of IP, user-agent and the date, so it cannot be followed across days. Visitor questions are free text, so tell your visitors the chat is logged. Each file rotates after `LOG_MAX_MB` (default 10) and keeps one old copy. Back up by copying the folder; delete a file to delete that data.

## Hardening checklist

- Set `ADMIN_TOKEN` to a long random value and serve over HTTPS.
- Set `ALLOWED_ORIGINS` to the sites that embed the widget.
- Leave the LLM daily limit on.
- Keep `DATA_DIR` outside any publicly served folder.
- Update with `git pull && npm ci && npm run build`.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Chat says it has no answer to everything | `/api/health` shows how many content pages loaded. Check `CONTENT_DIR`. |
| `/admin` says disabled | `ADMIN_TOKEN` is empty. Restart after setting it. |
| Crawler hits are missing | Test with `curl -A "GPTBot/1.1" https://your-site/`. In the Next.js app the middleware must be able to reach `/api/track`; set `INTERNAL_URL` if the app does not listen on `127.0.0.1:$PORT`. |
| Widget blocked in the browser console | The page's origin is not in `ALLOWED_ORIGINS`. |
| Avatar missing, "Ask" button shown | The device has no WebGL. Chat still works. |
