# Collector API reference

The collector is a small HTTP server (`things collector`, or `npm run collector` in the repo). The widget, the dashboard and your own scripts all talk to it through the endpoints below. Everything is plain HTTP with JSON bodies; there is no database and no state other than the log files in `DATA_DIR`.

Base URL: wherever you run it, by default `http://localhost:8787`.

## Overview

| Method and path | Who calls it | Auth | Purpose |
|---|---|---|---|
| `POST /api/chat` | the widget | origin + optional site key | Ask a question |
| `POST /api/track` | the widget, your server, the Cloudflare Worker | none (rate limited) | Record a crawler hit or an AI-referred visit |
| `GET /api/health` | you, monitors | none | Is it running, how many pages, is chat on |
| `GET /api/schema?path=` | the widget | none | JSON-LD for a page |
| `GET /llms.txt`, `/llms-full.txt` | AI agents | none | Site index for language models |
| `GET /md/<path>`, `GET /<path>.md` | AI agents | none | A page as markdown |
| `GET /robots.txt`, `GET /sitemap.xml` | crawlers | none | Generated from your content |
| `GET /things/<file>` | browsers | none | The widget files (`things-chat.js`, `things.umd.js`, `three.min.js`). Standalone collector only; in the all-in-one Next.js app they are static files in `public/`. |
| `GET /admin`, `POST /admin` | you | `ADMIN_TOKEN` | Dashboard and sign-in |
| `GET /api/admin/export` | you, scripts | `ADMIN_TOKEN` | Download your data |

Anything else answers `404 Not found`. Unexpected errors answer `500 {"error":"internal error"}` and are logged to the collector's console.

## Cross-origin access (CORS)

The public endpoints (`/api/chat`, `/api/track`, `/api/schema`, `/api/health`, `/llms*.txt`, `/md/*`) send CORS headers according to `ALLOWED_ORIGINS`:

- If `ALLOWED_ORIGINS` is empty, any origin is allowed (`Access-Control-Allow-Origin: *`).
- Otherwise the request's `Origin` is echoed back only if it is in the list (exact match, including scheme and `www`). A browser request from any other origin is refused by the browser, and `/api/chat` additionally answers `403 {"error":"origin not allowed"}`.
- Requests with no `Origin` header (curl, servers) are not subject to the list.
- `OPTIONS` pre-flight answers `204` with `Access-Control-Allow-Methods: GET, POST, OPTIONS`, `Access-Control-Allow-Headers: content-type, x-things-key`, `Access-Control-Max-Age: 86400`, and, when the browser asks (a public page calling a private-network address such as `localhost`), `Access-Control-Allow-Private-Network: true`.

`/admin` and `/api/admin/export` send no CORS headers; they are for direct use, not for pages on other sites.

## `POST /api/chat`

Ask a question. Rejects if chat is off, the origin is not allowed, or the site key is wrong.

Request (`application/json`, at most 16 KB):

```json
{ "question": "Do you ship to Canada?", "page": "/shipping", "key": "optional site key" }
```

| Field | Notes |
|---|---|
| `question` | Required. Whitespace is collapsed and the text is cut to 500 characters. |
| `page` | Optional. The page the visitor is on; stored with the question (cut to 200 characters). |
| `key` | Optional. The site key can be sent here or in the `x-things-key` header. |

Response `200`:

```json
{
  "answered": true,
  "answer": "Yes. Orders to Canada arrive in 3 to 5 business days.",
  "sources": [{ "title": "Shipping", "url": "https://example.com/shipping" }]
}
```

`answered: false` means the content did not cover the question: `answer` is your `CHAT_FALLBACK` message and `sources` is empty. The question is logged either way.

| Status | Body | Meaning |
|---|---|---|
| `400` | `{"error":"question required"}` | Empty question. |
| `401` | `{"error":"bad site key"}` | `SITE_KEY` is set and the key does not match. |
| `403` | `{"error":"chat disabled"}` | `CHAT_ENABLED=false`. |
| `403` | `{"error":"origin not allowed"}` | Browser origin not in `ALLOWED_ORIGINS`. |
| `429` | `{"error":"slow down"}` | Over `CHAT_RATE_LIMIT` questions a minute for this visitor. |

How an answer is chosen:

1. Your content is split into passages at `#`, `##` and `###` headings (long sections are split near 1,100 characters).
2. The question is reduced to its meaningful words (a small English stop-word list is removed, plurals are stemmed) and the passages are ranked with BM25. Words in headings count 2.5 times.
3. **Coverage** is the share of the question's meaningful words found in the best passage. Below 50% the question is treated as **not answered** (a content gap) and no model is called.
4. With no model configured, the best sentences of that passage that overlap the question are returned (up to two, 400 characters).
5. With a model configured and budget left (`CHAT_DAILY_LLM_LIMIT`), the question and up to four passages with coverage of 34% or more are sent to the provider with instructions to answer only from them in at most three short sentences. If the model replies `NO_ANSWER`, the question counts as a gap. If the provider fails or times out (20 seconds), the extractive answer from step 4 is used.

## `POST /api/track`

Records AI traffic. Always answers `204 No Content` when accepted. Limited to 120 requests a minute per visitor (`429 {"error":"slow down"}` beyond that). `400 {"error":"unknown kind"}` for an unrecognised `kind`.

The widget sends this as `text/plain` (to avoid a CORS pre-flight); the body is still JSON and `application/json` is accepted too.

### Crawler hit

```json
{ "kind": "bot", "ua": "Mozilla/5.0 ... GPTBot/1.1", "path": "/pricing", "format": "html" }
```

| Field | Notes |
|---|---|
| `ua` | The crawler's user-agent. If it does not match a known AI crawler, nothing is stored. |
| `path` | The path requested. Query strings and hashes are dropped, a trailing slash and `/md` prefix or `.md` suffix are removed, and it is cut to 200 characters. |
| `format` | `md` if you served markdown, otherwise `html`. |

The collector records whether a page exists at that path (`known`), so the dashboard can list **requested but missing** paths.

Known crawlers (matched case-insensitively against the user-agent): GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-SearchBot, Claude-User, anthropic-ai, Claude-Web, PerplexityBot, Perplexity-User, Applebot, Amazonbot, Meta-ExternalAgent, FacebookBot, Bytespider, CCBot, cohere-ai, DuckAssistBot, MistralAI-User, YouBot and Diffbot. Each is labelled **training** (collects data for models), **search** (builds an AI search index) or **user** (fetched live because a person asked an AI about the page). The list is in `lib/bots.mjs`.

### AI-referred visit

```json
{ "kind": "visit", "vid": "k3j2h1", "type": "end", "path": "/pricing",
  "referrer": "https://chatgpt.com/", "utm": "chatgpt.com", "ms": 8200, "engaged": true }
```

| Field | Notes |
|---|---|
| `vid` | A random id for this page view; links the `start` and `end` records. |
| `type` | `start` or `end`. |
| `referrer`, `utm` | Used to decide the source. If neither identifies an AI product (see [WIDGET_REFERENCE.md](WIDGET_REFERENCE.md#tracking)), nothing is stored. |
| `ms` | Milliseconds on the page (for `end`), capped at one hour. |
| `engaged` | True if the visitor scrolled, clicked or typed. |

## `GET /api/health`

```json
{ "ok": true, "mode": "collector", "pages": 12, "chat": true, "llm": "none" }
```

`pages` is the number of content pages loaded (0 means the chat has nothing to answer from). `llm` is `none`, `openai` or `anthropic`. Use it for uptime monitoring.

## `GET /api/schema?path=/pricing`

Returns JSON-LD (`WebSite`, plus `WebPage` for a known path, plus `FAQPage` when that page has `type: faq`), cached for five minutes. The widget injects it when `data-schema="true"`.

## Agent-readable pages

| Path | Returns |
|---|---|
| `/llms.txt` | A markdown index: site name, description and a link to the markdown version of every page. |
| `/llms-full.txt` | Every page's markdown in one file. |
| `/md/<path>` or `/<path>.md` | One page as markdown, with its description and source URL. `404` markdown message if the path is unknown. |
| `/robots.txt` | Allows everything except `/admin` and `/api/`. With `AI_BOTS=block` it also disallows each known AI crawler. Includes a `Sitemap:` line when `SITE_URL` is set. |
| `/sitemap.xml` | One entry per content page. |

These are generated from `content/*.md` (and any sitemap crawl) each time the content changes. Absolute links use `SITE_URL`, or the address of the request when it is empty.

## `GET /things/<file>`

Serves `things-chat.js`, `things.umd.js` and `three.min.js` with `Cache-Control: public, max-age=3600`. Any other name under `/things/` is `404`.

## Dashboard and export

### Sign in

`GET /admin` shows a sign-in form (or the dashboard if you are signed in). The form posts `token=<ADMIN_TOKEN>` to `/admin`. On success it sets a `things_admin` cookie (HttpOnly, SameSite=Strict, 30 days, `Secure` when the site is https) and redirects to `/admin`. Eight sign-in attempts a minute are allowed per IP. If `ADMIN_TOKEN` is empty, `/admin` answers `503` with a message. If `ADMIN_LOCAL_ONLY` is on and the request carries a proxy header, it answers `403`.

### Export your data

`GET /api/admin/export` with either the cookie or the header `Authorization: Bearer <ADMIN_TOKEN>`.

| Query | Returns |
|---|---|
| `days=7\|30\|90` | The window; default 30. |
| `type=json` (default) | Everything the dashboard shows, as JSON. |
| `type=gaps` | `content-gaps.csv`: `question, asked, best_match, last`. |
| `type=prompts` | `prompts.txt`: one unanswered question per line, to paste into ChatGPT or Perplexity. |

```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" "http://localhost:8787/api/admin/export?days=30" | jq '.topQuestions[:5]'
```

Shape of the JSON:

```json
{
  "days": 30,
  "questions": { "total": 120, "answered": 96, "unanswered": 24, "gapCount": 9 },
  "topQuestions": [{ "question": "Is it free?", "count": 14, "answered": 14, "last": 1791151636334 }],
  "topTerms": [{ "term": "ship", "count": 22 }],
  "gaps": [{ "question": "Do you ship to Canada?", "count": 5, "last": 1791151636334, "best": 0.33, "pages": ["/"] }],
  "bots": [{ "id": "GPTBot", "vendor": "OpenAI", "kind": "training", "hits": 31, "md": 0, "paths": 12, "last": 1791151636334 }],
  "botPages": [{ "path": "/pricing", "hits": 9, "bots": ["GPTBot"] }],
  "botMissed": [{ "path": "/old-page", "hits": 3, "bots": ["ClaudeBot"] }],
  "botHitsTotal": 44,
  "referrals": { "total": 7, "bounceRate": 0.43, "bySource": [], "byPage": [] },
  "daily": [{ "day": "2026-10-05", "q": 4, "bots": 2, "ref": 1 }]
}
```

Times are Unix milliseconds. `bounceRate` is `null` when no visit has ended yet.

## Data files

Three append-only JSON Lines files in `DATA_DIR`, one JSON object per line, UTC timestamps in milliseconds (`t`). See [DATA_AND_PRIVACY.md](DATA_AND_PRIVACY.md) for what each field means and how to delete or export data.

```jsonl
{"t":1791151636334,"q":"Do you ship to Canada?","answered":false,"score":0.33,"mode":"none","page":"/shipping","anon":"3fa9c1d20b7e","origin":"https://example.com"}
{"t":1791151640011,"bot":"GPTBot","vendor":"OpenAI","kind":"training","path":"/pricing","known":true,"format":"html"}
{"t":1791151651203,"vid":"k3j2h1","type":"end","source":"ChatGPT","path":"/pricing","ms":8200,"engaged":true}
```

## Calling the API from your own code

```js
const r = await fetch('https://things.example.com/api/chat', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-things-key': process.env.THINGS_KEY },
  body: JSON.stringify({ question: 'Do you ship to Canada?', page: '/shipping' })
});
const { answered, answer, sources } = await r.json();
```

From a server there is no `Origin` header, so `ALLOWED_ORIGINS` does not apply, but the rate limit does (it is per visitor, and all server calls share one IP). Build your own chat interface on top of this endpoint if the corner widget is not what you want.

## Limits to know

- One Node process; rate limits and the daily model-call counter live in memory and reset when it restarts.
- Log files are plain files; a very large site should rotate and archive them (see [DEPLOYMENT.md](DEPLOYMENT.md#backups-and-retention)).
- The collector is not a general web server: it does not serve your site or any file other than the three widget files.
