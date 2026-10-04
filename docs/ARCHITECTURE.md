# How it fits together

A short tour of the parts, how data moves between them, and why it is built this way. Read this if you want to understand, audit or extend Things.

## The parts

```
┌───────────────────────── visitor's browser ─────────────────────────┐
│  your page                                                           │
│   └─ <script src=things-chat.js data-*>                              │
│        ├─ things-chat.js   corner UI, chat panel, AI-referral tracker│
│        ├─ things.umd.js    the 3D engine + nine preset characters    │
│        └─ three.min.js     three.js r128 (WebGL)                     │
└───────────────┬───────────────────────────────┬─────────────────────┘
                │ POST /api/chat                │ POST /api/track (AI-referred visits only)
                ▼                               ▼
┌───────────────────────── collector (Node, no dependencies) ─────────┐
│  lib/router.mjs     request handling, CORS, rate limits, auth       │
│  lib/content.mjs    markdown + sitemap crawl -> passages -> BM25    │
│  lib/answer.mjs     quote best passage, or ask your model           │
│  lib/bots.mjs       AI crawler + AI-referrer classification         │
│  lib/seo.mjs        llms.txt, markdown, JSON-LD, robots, sitemap    │
│  lib/dashboard.mjs  aggregation + the admin page                    │
│  lib/store.mjs      append-only JSONL files with rotation           │
└───────┬──────────────────────┬──────────────────────┬───────────────┘
        │ reads                │ writes               │ (optional, only if configured)
        ▼                      ▼                      ▼
  things-content/*.md     things-data/*.jsonl     your LLM provider
  (+ sitemap crawl)       questions, bot-hits,    (OpenAI, Anthropic, Ollama...)
                          visits
```

Crawlers never run the widget, so a second path reports them:

```
AI crawler ──► your web server ──► [Next.js middleware | Cloudflare Worker | access-log importer]
                                          │ POST /api/track {kind:"bot"}
                                          ▼
                                       collector ──► bot-hits.jsonl
```

## Repository map

| Path | What |
|---|---|
| `public/things.umd.js` | The 3D engine. Procedural plush characters: parametric bodies, shell-based fur, embroidery and knit shaders, accessories. No texture files. |
| `public/things-chat.js` | The widget. |
| `public/studio.js`, `app/Studio.js`, `app/markup.js` | The studio editor (plain scripts loaded by the Next.js page). |
| `app/Landing.js` | The landing page. |
| `app/`, `middleware.js` | The all-in-one Next.js app: pages for content files, `/api/*`, `/admin`, `llms.txt` and friends, crawler middleware. |
| `lib/*.mjs` | The framework-agnostic collector logic, used by both the Next.js app and the standalone collector. |
| `server/collector.mjs` | The standalone collector (zero dependencies). |
| `server/import-access-log.mjs` | Access-log importer. |
| `packages/things/` | The npm package. `scripts/sync-package.mjs` copies the engine, widget and collector into it when you pack or publish. |
| `snippets/cloudflare-worker.js` | Worker for sites you cannot edit. |
| `content/` | The sample content for the Things site itself. |
| `test/` | `node --test` suites. |
| `docs/` | These guides. |

## Request flows

### A visitor asks a question

1. The widget `POST`s `{question, page}` to `<endpoint>/api/chat`.
2. The router checks `CHAT_ENABLED`, the `Origin` against `ALLOWED_ORIGINS`, the optional site key, and the per-visitor rate limit.
3. `getContent` returns the cached passage index (rebuilt when a content file changes; a sitemap crawl is refreshed hourly).
4. `answerQuestion` searches with BM25, decides whether the content covers the question, and returns either quoted sentences or the model's reply.
5. The question is appended to `questions.jsonl` and the answer is returned.

### An AI crawler reads a page

1. The crawler requests a page on **your** server.
2. Your hook recognises the user-agent and `POST`s `{kind:"bot", ua, path, format}` to the collector, then lets the request continue (the middleware and Worker can also serve a markdown version).
3. The collector classifies the user-agent, checks whether the path is a known content page, and appends to `bot-hits.jsonl`.

### A visitor arrives from ChatGPT

1. The widget sees the referrer or `utm_source`, decides it is an AI source, and sends `start`.
2. On `visibilitychange` to hidden or `pagehide` it sends `end` with the time on page and whether the visitor interacted.
3. The collector appends both to `visits.jsonl`; the dashboard merges them by visit id.

## Design decisions

- **Plain files, no database.** Three append-only JSONL files are easy to back up, inspect, grep and delete, and need nothing installed. The trade-off is one process and modest scale.
- **No dependencies in the collector.** Only Node's standard library, so there is nothing to audit or keep patched except Node.
- **Keyword search, not embeddings.** BM25 over headings and text needs no model, no network and no cost, and behaves predictably. The trade-off is that paraphrases with no shared words can miss; the dashboard's content gaps show where that happens.
- **Answers come from your content or not at all.** The model gets only matching passages and a rule to say `NO_ANSWER` otherwise. A low coverage score skips the model entirely, which also saves money.
- **Local by default.** The dashboard refuses proxied requests unless you opt out; the data never leaves your machine unless you configure a provider.
- **The widget is a self-contained script.** It uses a shadow root and no framework, so it can be dropped into any page and cannot collide with your CSS or JavaScript.
- **Honest analytics.** User-agents and referrers can be missing or faked, so the product reports trends and documents its limits ([AGENT_READINESS.md](AGENT_READINESS.md)).

## What the chat is not

- Not a general-purpose assistant. It answers about **your** site from **your** content.
- Not a memory: each question is answered on its own, with no conversation history.
- Not multilingual by design: the keyword matching uses an English stop-word list. Content and questions in other languages can still match on shared words, but results will be weaker.
- Not a search engine over your whole site unless you give it the content (files or a sitemap crawl of up to 50 pages).

## Extending it

- **A different answer engine:** implement another branch in `lib/answer.mjs` (the OpenAI-compatible branch already covers most providers).
- **More AI crawlers:** add to the list in `lib/bots.mjs` (and the matching regex in `snippets/cloudflare-worker.js`).
- **Another storage backend:** replace `append` and `readAll` in `lib/store.mjs` (both are small and are the only functions that touch disk).
- **Run the collector inside your own Node server:** `lib/router.mjs` exports `handle(req)` taking a plain request object and returning `{status, headers, body}`; see `server/collector.mjs` and `lib/next-adapter.mjs` for the two existing adapters.
- **New characters:** add a preset to the `PRESETS` list in `public/things.umd.js`; the studio and widget pick it up automatically.

Contributions are welcome: see [CONTRIBUTING.md](../CONTRIBUTING.md).
