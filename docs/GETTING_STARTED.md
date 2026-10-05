# Getting started: put Things on your site and capture the data

This is the whole path in one place: pick a character, add it to your website, run the collector so it works for real visitors, and read what it captures. The other guides go deeper on single topics and are linked where they matter.

- [STUDIO_EXPORT.md](STUDIO_EXPORT.md): the shortest path, from the studio to a live site (start here if you just want it working)
- [NPM_PACKAGE.md](NPM_PACKAGE.md): the `@rothenhall/things` package, CLI and React components
- [FRAMEWORKS.md](FRAMEWORKS.md): Next.js, React, WordPress, Shopify, Webflow and more
- [DEPLOYMENT.md](DEPLOYMENT.md): keep the collector running and reachable
- [CONFIG_REFERENCE.md](CONFIG_REFERENCE.md), [WIDGET_REFERENCE.md](WIDGET_REFERENCE.md), [COLLECTOR_API.md](COLLECTOR_API.md): every setting and endpoint
- [DATA_AND_PRIVACY.md](DATA_AND_PRIVACY.md) and [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- [EMBEDDING.md](EMBEDDING.md), [SELF_HOSTING.md](SELF_HOSTING.md), [AGENT_READINESS.md](AGENT_READINESS.md)

## The fastest way: npm

```bash
cd your-website-project
npx @rothenhall/things init --site-url https://your-site.com --endpoint https://things.your-site.com
npx @rothenhall/things collector
npx @rothenhall/things doctor
```

`init` copies the widget into your project, creates your settings with a random dashboard password, makes a starter content folder, and prints the `<script>` tag to paste. `collector` starts the server and dashboard. `doctor` checks everything. The steps below explain each part in detail and also cover running from a clone of the repository instead of the npm package; the two are equivalent (`npm run collector` in a clone is the same server as `things collector`).

## What you get

| Piece | What it does |
|---|---|
| **Studio** (`/studio`) | Build a plush character: shape, fur, face, outfit. Runs in the browser. |
| **Chat widget** (`things-chat.js`) | A character in the corner of your site. Visitors ask it questions; it answers from your content. |
| **Collector** (`npm run collector`) | A small server you run. Answers the questions, and records them, plus AI crawler hits and visits that come from AI answers. |
| **Dashboard** (`/admin`) | Content gaps (questions it could not answer), AI crawler activity, AI-referred visits, and a readiness checklist. |
| **Agent-readable pages** | `llms.txt`, markdown versions of your pages, JSON-LD, `robots.txt`, `sitemap.xml`. |

Everything is MIT licensed and runs on hardware you control. No database, no account, no telemetry.

## Choose a mode

Things always captures data. What changes is whether the character also talks.

| | **Chat + insights** | **Capture only** |
|---|---|---|
| The character | Answers visitor questions in a chat bubble | Sits in the corner as decoration and reacts when clicked |
| Needs | Your content, plus an OpenAI API key for fluent answers (optional, see below) | Nothing extra |
| Widget | default | `data-chat="false"` |
| Server | `CHAT_ENABLED=true` (default) | `CHAT_ENABLED=false` |
| Captured | Questions, most-asked questions and topics, content gaps, AI crawler hits, visits from AI answers | AI crawler hits, visits from AI answers, readiness checks |

You can start in capture-only mode and switch chat on later; nothing else changes. When chat is on, the dashboard shows **what visitors ask most** and which of those questions your content could not answer.

**About the API key.** Fluent, chatbot-style answers come from a model you pay for with your own key. With an OpenAI key (create one at platform.openai.com; a ChatGPT subscription is a separate product and does not include an API key) set `LLM_API_KEY` and `LLM_MODEL`. Without a key the character still answers, but by quoting the best matching passage from your content. The key stays in your `.env` on the collector and is never sent to visitors' browsers.

## Pick your setup

| You have | Use | Time |
|---|---|---|
| Any website (WordPress, Webflow, Shopify, static, anything) and a PC or small server | **Embed + collector** (Path 1) | about 15 minutes |
| Nothing yet, or you want the studio and chat on one server | **All-in-one** (Path 2) | about 10 minutes |
| A site on Vercel or Netlify | Deploy it there, run the collector elsewhere (Path 1) | about 15 minutes |

You need Node.js 20.12 or newer (check with `node --version`), or Docker.

---

## Path 1: add Things to a site you already have

### Step 1. Get the code and install

```bash
git clone https://github.com/Rothenhall/Things.git
cd things
npm ci
cp .env.example .env
```

On Windows PowerShell use `Copy-Item .env.example .env`.

### Step 2. Choose a character

Open the studio (`npm run dev`, then http://localhost:3000/studio) and try the characters on the rail: Mallow, Plum, Mint, Tango, Pebble, Cosmo, Poppy, Dew and Truffle. Note the preset id (lowercase name). The widget attribute `data-preset` takes one of these ids.

Custom characters you built in the studio are exported from the **Use it** tab. The `data-preset` attribute only accepts preset ids. `ThingsChat.init({ preset: ... })` passes its value to the engine's `mount`, which also accepts a config object, but that route is not covered by the tests, so try it before you rely on it.

### Step 3. Give it your content

The character answers **only** from your content. Without content it will log every question as unanswered. Use one or both:

**Markdown files** in `content/`:

```markdown
---
title: Shipping
description: Where we ship and how long it takes.
path: /shipping
type: faq
---
# Shipping

## Do you ship to Canada?
Yes, in 3 to 5 business days.
```

`type: faq` turns each `## Question` into FAQ markup for search and AI engines. Delete the sample files in `content/` (they describe Things itself, not your business) and add your own.

**Or crawl your live site** in `.env`:

```bash
CONTENT_SITEMAP=https://your-site.com/sitemap.xml
```

Same-origin pages only, at most 50, refreshed hourly. Also available: `CONTENT_URLS=https://your-site.com/a,https://your-site.com/b`.

### Step 4. Configure `.env`

The minimum for a real site:

```bash
ADMIN_TOKEN=<long random string>
SITE_URL=https://your-site.com
ALLOWED_ORIGINS=https://your-site.com,https://www.your-site.com
CONTENT_SITEMAP=https://your-site.com/sitemap.xml
```

Make a token with:

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```

What each one does:

| Variable | Why it matters |
|---|---|
| `ADMIN_TOKEN` | Without it the dashboard is disabled. |
| `SITE_URL` | Used for absolute links in `llms.txt`, `sitemap.xml` and JSON-LD. No trailing slash. |
| `ALLOWED_ORIGINS` | Which websites may call your collector from a browser. Unset means **any** site can use it (and spend your LLM budget). Always set it in production. |
| `CONTENT_SITEMAP` / `content/` | What the chat knows. |

Optional but worth knowing: `SITE_KEY` (a spam filter the widget sends as `data-key`, not a secret), `CHAT_RATE_LIMIT` (questions per visitor per minute, default 20), `CHAT_DAILY_LLM_LIMIT` (hard cap on model calls per day, default 500), `DATA_DIR` (where logs go, default `data`), `LOG_MAX_MB` (log rotation, default 10).

### Step 5. Choose how it answers

Skip this step in capture-only mode: set `CHAT_ENABLED=false` in `.env` and go to Step 6.

**Free, no keys (default):** the character quotes the best matching passages from your content.

**Natural answers:** set a model in `.env`. The visitor's question and up to four matching passages are sent to that provider.

```bash
# OpenAI (your own API key) or any OpenAI-compatible API (OpenRouter, etc.)
LLM_API_KEY=sk-...
LLM_MODEL=gpt-4o-mini

# Fully local with Ollama (nothing leaves your machine)
LLM_BASE_URL=http://localhost:11434/v1
LLM_MODEL=llama3.2

# Anthropic
LLM_PROVIDER=anthropic
LLM_API_KEY=sk-ant-...
```

Keep the daily call cap on. A public endpoint with an API key is a bill waiting to happen.

### Step 6. Start the collector

```bash
npm run collector
```

You should see something like:

```
Things collector listening on http://localhost:8787
  content:  12 pages (content)
  data:     C:\...\data
  answers:  extractive (set LLM_API_KEY for natural answers)
  admin:    http://localhost:8787/admin (local only)
```

Read the warnings. `ALLOWED_ORIGINS is not set` and `no content found` are the two that matter.

Check it is alive:

```bash
curl http://localhost:8787/api/health
```

Expect `{"ok":true,"mode":"collector","pages":12,...}`. If `pages` is `0` the chat has nothing to answer from.

### Step 7. Make it reachable from your visitors

Your website's visitors need to reach the collector over HTTPS. `localhost` only works on your own computer. Options:

| Option | Command | Notes |
|---|---|---|
| Cloudflare quick tunnel | `cloudflared tunnel --url http://localhost:8787` | Free, no account. The address changes every run. Use a named tunnel for a stable one. |
| Tailscale Funnel | `tailscale funnel 8787` | Free for personal use. Stable `*.ts.net` address. |
| A small VPS | run the collector there | Put Caddy or nginx in front for HTTPS. |
| Testing on one PC | nothing | Use `http://localhost:8787`. |

The collector must stay running. If it is unreachable, the character says it cannot reach its brain and your page is unaffected. For anything permanent, run it under pm2, systemd, or Docker (`docker compose up -d --build`), not in a terminal you will close.

The dashboard is blocked for requests that arrive through a tunnel or proxy (it checks the `X-Forwarded-For` / `CF-Connecting-IP` headers), so exposing the port does not expose `/admin`. If you put your own proxy in front, set `COLLECTOR_HOST=127.0.0.1` and `ADMIN_LOCAL_ONLY=true`.

### Step 8. Add the script to your site

Paste before `</body>` on every page you want the character on. The script and the 3D engine are static files; serve them from your own copy of Things (`npm run build && npm start`, or the all-in-one deploy) or from any deployed Things site.

```html
<script src="https://YOUR-THINGS-SITE/things-chat.js"
        data-endpoint="https://YOUR-COLLECTOR-ADDRESS"
        data-preset="pebble"
        data-title="Ask Mallow"
        data-greeting="Hi! Ask me anything about us."
        async></script>
```

All options:

| Attribute | Default | Meaning |
|---|---|---|
| `data-endpoint` | the script's own origin | Your collector. |
| `data-preset` | `pebble` | Character id. |
| `data-title`, `data-greeting` | "Ask me" / "Hi! Ask me anything about this site." | Header text and first message. |
| `data-chat` | on | `false` = capture-only mode: the character is decoration, there is no chat panel, and no questions are asked or sent. Tracking still runs. Pair it with `CHAT_ENABLED=false` on the server. |
| `data-key` | none | Sent as `x-things-key`. Must equal `SITE_KEY` if you set one. |
| `data-position` | `right` | `left` or `right`. |
| `data-color` | `#a85c30` | Accent colour. |
| `data-track` | on | `false` turns off AI-referral tracking. |
| `data-schema` | off | `true` injects JSON-LD from the collector. Crawlers that do not run JavaScript will not see it. |
| `data-assets` | the script's own origin | Where `three.min.js` and `things.umd.js` load from. |

Add `data-manual` and call `ThingsChat.init({...})` yourself for full control. `ThingsChat.open()`, `.close()` and `.destroy()` exist. The widget lives in a shadow root, so your site's CSS cannot break it and it cannot break yours. On a device without WebGL it shows a plain "Ask" button; chat still works.

### Step 9. Test that data is really being captured

Do these in order. Each takes under a minute.

**1. Ask a question the content answers.** Open your site, click the character, ask something from your content. You should get an answer with sources.

**2. Ask something it cannot answer**, for example "Do you sell helicopters?" It should reply with its fallback message. This is logged as a content gap.

**3. Look at the data file:**

```bash
tail -n 3 data/questions.jsonl
```

PowerShell: `Get-Content data\questions.jsonl -Tail 3`. You should see both questions, with `"answered":true` and `"answered":false`.

**4. Simulate an AI crawler:**

```bash
curl -A "GPTBot/1.1" -H "content-type: application/json" \
  -d '{"kind":"bot","ua":"GPTBot/1.1","path":"/shipping","format":"html"}' \
  http://localhost:8787/api/track
```

A line appears in `data/bot-hits.jsonl`. (On a real site the crawler never calls `/api/track` itself; see Step 10.)

**5. Simulate a visit from an AI answer.** Open your site with `?utm_source=chatgpt.com` appended. Stay a few seconds, then close the tab. `data/visits.jsonl` gets a `start` and an `end` record. A plain visit with no referrer and no `utm_source` is deliberately not recorded.

**6. Capture-only mode:** with `CHAT_ENABLED=false`, `curl -X POST -d '{"question":"hi"}' http://localhost:8787/api/chat` returns 403 `chat disabled`, and `/api/health` shows `"chat":false`. Crawler and referral tracking from checks 4 and 5 still work.

**7. Open the dashboard** at http://localhost:8787/admin from the machine running the collector, and sign in with your `ADMIN_TOKEN`.

### Step 10. Capture AI crawler traffic

Crawlers do not run JavaScript, so the widget cannot see them. Something on the server side has to report them. Pick the one that fits:

| Your site | Use |
|---|---|
| Behind Cloudflare | `snippets/cloudflare-worker.js`. Route it in front of your site and set `COLLECTOR_URL` (and optionally `SERVE_MARKDOWN=true`, `SERVE_LLMS_TXT=true`). |
| nginx or Apache on a machine you can read | `npm run import-log -- /var/log/nginx/access.log` (add `--since=2026-10-01`). Reads the combined log format locally. Run it once per rotated log; it does not de-duplicate if you import the same lines twice. |
| A Next.js site you own | Copy `middleware.js` and set `COLLECTOR_URL`. |
| Hosted builder with no server access (Wix, Squarespace, ...) | Not possible to see crawlers. The chat widget and referral tracking still work. |

Test the Cloudflare Worker or middleware with `curl -A "GPTBot/1.1" https://your-site/` and check `data/bot-hits.jsonl`.

### Step 11. Make the site readable to agents

The collector also serves these from your content:

| URL | What |
|---|---|
| `/llms.txt`, `/llms-full.txt` | Summary and full text index for LLMs |
| `/md/<path>` or `/<path>.md` | Markdown version of any page |
| `/api/schema?path=/shipping` | JSON-LD (`WebSite`, `WebPage`, `FAQPage`) |
| `/robots.txt`, `/sitemap.xml` | Generated; `AI_BOTS=block` adds Disallow rules for known AI crawlers |

On a site you control, serve `llms.txt` from your own domain (the Cloudflare Worker can proxy it). `llms.txt` is a proposal, not a standard every AI engine reads, so use the dashboard to see whether anything actually fetches it.

---

## Path 2: all-in-one on one server

```bash
git clone https://github.com/Rothenhall/Things.git
cd things
cp .env.example .env     # set ADMIN_TOKEN, SITE_URL, ALLOWED_ORIGINS
docker compose up -d --build
```

Or without Docker:

```bash
npm ci
npm run build
npm start                # http://localhost:3000
```

You get the landing page, the studio at `/studio`, the chat, tracking, `llms.txt`, markdown pages and the dashboard at `/admin`, all on one origin. Put it behind Caddy or nginx for HTTPS and pass `X-Forwarded-For`, `X-Forwarded-Proto` and `Host`. Your `content/*.md` files also become real HTML pages at their `path`, so people and crawlers see the same text.

Note the Dockerfile has not been run in CI yet. If a build fails, open an issue.

Serverless hosts (Vercel, Netlify) have read-only or temporary file systems, so logs would be lost. Deploy the site there but run the collector somewhere with a normal disk, and set `COLLECTOR_URL`.

---

## Reading the dashboard

| Section | How to use it |
|---|---|
| **What visitors ask most** (chat on) | All questions grouped by wording, with how often each was asked and how often it was answered, plus the topics that come up most. Use it to decide what belongs on the page, in the FAQ, or in your navigation. |
| **Content gaps** | Questions ranked by how often visitors asked them. Each is a page you should write. "Download as prompts" gives one question per line to paste into ChatGPT or Perplexity to check whether they can answer it from your site. |
| **AI crawlers** | Which bots visited, whether they are training, search or user-triggered, and which pages they read. |
| **Requested but missing** | Paths crawlers asked for that do not exist: dead ends an AI engine ran into. |
| **AI-referred visits** | People who arrived from an AI answer, with time on page and a bounce flag (under 10 seconds and no interaction). |
| **Readiness checklist** | Missing content, no `SITE_URL`, open `ALLOWED_ORIGINS`, whether chat is on, and so on. |

Switch between 7, 30 and 90 days with `?days=`. Export from `/api/admin/export?type=json|gaps|prompts` with the header `Authorization: Bearer <ADMIN_TOKEN>` (the dashboard login uses a cookie).

The numbers have limits. User-agents are self-declared, many AI products strip the `Referer` header, and keyword search can log a paraphrased question as a gap when the answer exists. Read [AGENT_READINESS.md](AGENT_READINESS.md) before you quote a figure.

## What gets stored

Three append-only files in `DATA_DIR` (default `data/`):

| File | Contains |
|---|---|
| `questions.jsonl` (empty in capture-only mode) | question text, answered or not, match score, page, anonymous id, origin |
| `bot-hits.jsonl` | crawler name, path, whether the page exists, html or markdown |
| `visits.jsonl` | only visits arriving from an AI answer: source, path, time on page, interacted or not |

IP addresses are never stored. The anonymous id is a hash of IP, user-agent and the date, so it cannot be followed across days. Visitor questions are free text and can contain personal details, so tell your visitors the chat is logged and mention it in your privacy policy. If you configured an LLM provider, questions and matching passages are also sent to that provider.

Back up by copying the folder. Delete a file to delete that data. Logs rotate after `LOG_MAX_MB` and keep one old copy. Keep `DATA_DIR` outside any publicly served folder.

## Before you go live

- [ ] `ADMIN_TOKEN` is long and random
- [ ] `ALLOWED_ORIGINS` lists only your sites
- [ ] `SITE_URL` is set (and set at **build** time for the Next.js app)
- [ ] Sample `content/` files replaced with your own; `/api/health` shows the right page count
- [ ] Collector runs under pm2, systemd or Docker and survives a reboot
- [ ] HTTPS in front of the collector
- [ ] `CHAT_DAILY_LLM_LIMIT` is on if you use an API key
- [ ] The chat is mentioned in your privacy policy
- [ ] You tested a real question, an unanswerable question, and a crawler hit (Step 9)

## Updating

```bash
git pull
npm ci
npm run build      # all-in-one only
```

Then restart the collector or app.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Chat says it has no answer to everything | `/api/health` shows how many pages loaded. Check `CONTENT_DIR`, or whether your `CONTENT_SITEMAP` is reachable and same-origin. |
| `/admin` says disabled | `ADMIN_TOKEN` is empty. Set it and restart. |
| `/admin` says local-only | You are reaching it through a tunnel or proxy. Open it from the machine itself. |
| Widget blocked in the browser console (CORS) | The page's origin is not in `ALLOWED_ORIGINS`. Include `https://www.` variants. |
| Browser asks to allow access to local network devices | Expected when a public page calls `localhost`. Allow it, or use a tunnel address. |
| Crawler hits are missing | Test with `curl -A "GPTBot/1.1" https://your-site/`. In the Next.js app, set `INTERNAL_URL` if the app does not listen on `127.0.0.1:$PORT`. |
| Visits from ChatGPT do not show | Many AI products strip the referrer. Visits without a referrer or `utm_source` are invisible. The widget also has to be on the landing page. |
| Avatar missing, "Ask" button shown | The device has no WebGL. Chat still works. |
| 429 responses | Visitor hit `CHAT_RATE_LIMIT`. Raise it if it is too tight. |

## Help

Issues and pull requests are welcome: https://github.com/Rothenhall/Things. See [CONTRIBUTING.md](../CONTRIBUTING.md) and [SECURITY.md](../SECURITY.md).
