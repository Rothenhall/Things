# Data and privacy

Things is built so that the data stays with you. This page says exactly what is collected, where it is stored, who can see it, and how to export or delete it. It is written for site owners; it is not legal advice.

## The short version

- Everything is stored in three plain text files on **your** machine or server. There is no database, no cloud service, and no account with us.
- The software never contacts Rothenhall, and sends nothing to any third party unless **you** configure a language-model provider or a content crawl.
- IP addresses are never stored.
- The widget sets no cookies and uses no browser storage.
- Visitors' questions are free text and can contain personal details. You are responsible for telling your visitors and for how you use them.

## What is collected

### 1. Questions (`questions.jsonl`), only when chat is on

One line per question asked in the chat:

| Field | Example | Meaning |
|---|---|---|
| `t` | `1791151636334` | When (Unix milliseconds, UTC). |
| `q` | `Do you ship to Canada?` | The question exactly as typed (whitespace collapsed, cut to 500 characters). |
| `answered` | `false` | Whether your content covered it. |
| `score` | `0.33` | How much of the question the best passage matched, 0 to 1. |
| `mode` | `none` | `extractive` (quoted from your content), `llm` (written by your model), or `none` (not answered). |
| `page` | `/shipping` | The page the visitor was on. |
| `anon` | `3fa9c1d20b7e` | A 12-character hash of the visitor's IP address, browser and the **date**. It lets questions from the same visitor on the same day be told apart (the dashboard does not currently show per-visitor counts). Because the date is part of the hash it changes every day, so a visitor cannot be followed across days, and the IP address cannot be recovered from it in practice. |
| `origin` | `https://example.com` | The website the question came from. |

**The answers are not stored**, only the questions.

### 2. AI crawler hits (`bot-hits.jsonl`)

One line each time a known AI crawler (GPTBot, ClaudeBot, PerplexityBot and others, matched by user-agent) requests a page, **if** you installed a hook that reports them (middleware, the Cloudflare Worker, or the access-log importer):

`t`, the crawler name, its vendor, its kind (training, search or user), the path requested, whether a page exists at that path, and whether markdown or HTML was served. No visitor data: these are automated programs.

### 3. AI-referred visits (`visits.jsonl`)

Only visits that **arrive from an AI answer** (the referrer is ChatGPT, Perplexity, Claude and similar, or `utm_source` names one) are recorded, as two lines per visit:

`t`, a random visit id (generated in the browser for that page view, kept only in memory), `start` or `end`, the AI source name, the page path, the milliseconds on the page, and whether the visitor scrolled, clicked or typed. No IP address, no user agent, no identity. Visits from search engines, social media, direct traffic and everyone else are not recorded at all.

## What is not collected

- IP addresses (they are used in memory to apply rate limits and to compute the daily hash, then dropped)
- Cookies, local storage, fingerprints, or any identifier that survives a day
- The answers the chat gave
- Anything about visitors who do not use the chat and do not arrive from an AI answer
- Anything sent to Rothenhall

## What leaves your machine

| Situation | What is sent, and to whom |
|---|---|
| Default (no model) | Nothing. |
| `LLM_API_KEY` or `LLM_BASE_URL` set | For each answerable question, the question text and up to four passages of **your own content** go to that provider (OpenAI, Anthropic, or your own server such as Ollama). The provider's privacy terms apply. Not sent: IP address, page, or anything about the visitor. |
| `CONTENT_SITEMAP` or `CONTENT_URLS` set | The collector fetches those pages from your own site every hour. |
| Visitors load the widget | Their browser fetches the three script files from wherever you host them. If you use a CDN, that CDN sees the request. |
| The Things pages themselves | The studio and landing pages load fonts (Caveat, Jost, Instrument Sans) from Google Fonts. The widget itself loads no fonts. |

## Who can see the data

Anyone who can read the `DATA_DIR` folder or sign in to the dashboard with your `ADMIN_TOKEN`. The dashboard refuses requests that come through a proxy or tunnel by default (`ADMIN_LOCAL_ONLY`), the token is compared in constant time, and sign-in attempts are rate limited. Keep `DATA_DIR` outside any folder your web server serves, and keep `things.env` out of git.

## Telling your visitors

If you enable chat, tell visitors that their questions are recorded to improve the site, and who the controller is (you). A sentence next to the chat or in your privacy policy is typical:

> Our site assistant records the questions you type, without your IP address, so we can improve our answers. Please do not include personal information. If an AI model is used, your question and relevant parts of our content are sent to [provider] to write the reply.

Remove the last sentence if you do not configure a model. The widget has a `data-greeting` attribute where you can put a short notice, for example `data-greeting="Ask me anything. Questions are recorded, please don't share personal details."`

Whether you need consent depends on where your visitors are and how you use the data. Many sites treat a recorded support chat as legitimate interest, but ask your own advisor. In **capture-only mode** (`data-chat="false"`, `CHAT_ENABLED=false`) no visitor-typed text is collected at all; only the AI-referral records above are.

## Retention, export and deletion

| Task | How |
|---|---|
| See your data | The dashboard, or open the `.jsonl` files in any text editor. |
| Export | `GET /api/admin/export?type=json`, `type=gaps` (CSV) or `type=prompts` ([COLLECTOR_API.md](COLLECTOR_API.md#export-your-data)), or copy the folder. |
| Delete everything | Stop the collector, delete `questions.jsonl`, `bot-hits.jsonl`, `visits.jsonl` and their `.1` copies, start it again. |
| Delete one visitor's question | Stop the collector, delete that line from `questions.jsonl` (and `.1`), start it again. Because visitors are not identified, you can only find a line by its text. |
| Limit how long data is kept | Logs rotate at `LOG_MAX_MB` keeping one old copy. For a time limit, run a scheduled job that deletes the `.1` files, or lines older than your window, e.g. `find things-data -name '*.1' -mtime +90 -delete`. |
| Stop collecting questions | `CHAT_ENABLED=false` and `data-chat="false"`; restart the collector. |
| Stop AI-referral tracking | `data-track="false"` on the widget. |

## Security of the data at rest

The files are not encrypted by the software. Rely on your server's disk encryption and permissions (`chmod 700 things-data`), and encrypt your backups.

## Reporting a security problem

See [SECURITY.md](../SECURITY.md).
