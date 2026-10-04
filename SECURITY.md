# Security policy

## Reporting a vulnerability

Please report it privately through GitHub: **Security tab, "Report a vulnerability"** on this repository (https://github.com/Rothenhall/things/security/advisories/new). Do not open a public issue or discussion.

Include what you found, how to reproduce it, and the version or commit. You can expect an acknowledgement within a few days. This is a volunteer-run open source project, so there is no guaranteed fix time, but confirmed issues are prioritized, and you will be credited in the advisory unless you prefer not to be.

## Supported versions

Only the latest release and the `main` branch receive fixes.

## Scope and things worth knowing

In scope: the Next.js app, `lib/`, `server/collector.mjs`, `public/things-chat.js` and the Docker image.

Design decisions that are not vulnerabilities by themselves:

- **User-agent based crawler detection can be spoofed.** The dashboard is analytics, not access control.
- **`ALLOWED_ORIGINS` unset means any website can call the chat and tracking endpoints.** Set it in production. The daily LLM call cap (`CHAT_DAILY_LLM_LIMIT`) limits cost abuse either way.
- **`SITE_KEY` is a public spam filter**, visible in page source. It is not a secret.
- **The admin dashboard** is protected by `ADMIN_TOKEN`, rate-limited on login, and (collector) blocked for proxied or tunnelled requests by default. Use a long random token and HTTPS.
- **Crawled content** (`CONTENT_SITEMAP`, `CONTENT_URLS`) is treated as untrusted text: it is escaped in HTML, and the LLM prompt tells the model to ignore instructions inside it. Prompt injection is still an open problem for any retrieval chatbot, so do not give the model tools or secrets.

Out of scope: denial of service by raw request volume, and findings that need a compromised server or `.env` file.
