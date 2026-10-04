# Agent readiness: what is built, and what it cannot do

This is the honest version of the feature list. Read the limits before you trust a number.

## 1. Capture and answer visitor questions

- A visitor asks in the character's bubble. `POST /api/chat` finds the best passages in your content (BM25 keyword search) and answers by quoting them, or by asking an LLM you configured.
- If fewer than half of the question's meaningful words appear in the best passage, or the LLM says `NO_ANSWER`, the question is logged as **unanswered**.
- Unanswered questions are grouped by wording and ranked by how often they were asked in the dashboard. "Download as prompts" gives one question per line, ready to paste into ChatGPT or Perplexity to check whether AI engines can answer it from your site.

Limits: keyword search, not semantic. A paraphrase that shares no words with your content can be logged as a gap even though the answer exists; read the gap list with that in mind. English stop-word list only.

## 2. Tell which visitors are AI agents

- **Crawlers**: matched by user-agent against the list in `lib/bots.mjs` (GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-SearchBot, Claude-User, PerplexityBot, Perplexity-User and others, labelled training, search, or user-triggered). Logged by the middleware (Next.js app), the Cloudflare Worker, or the access-log importer.
- **Pages read vs missed**: each hit records whether a page exists at that path. "Requested but missing" is the list of dead ends an AI engine ran into. Crawlers cannot "bounce", so this is the closest honest equivalent.
- **Visits from AI answers**: the widget sees `document.referrer` and `utm_source` (ChatGPT adds `utm_source=chatgpt.com` to links). Only those visits are recorded. Time on page and whether the person scrolled, clicked or typed give a bounce flag: under 10 seconds with no interaction.

Limits:

- User-agents are self-declared. Anyone can send `GPTBot`. There is no IP verification against the vendors' published ranges. Treat the numbers as trends.
- Many AI products strip the `Referer` header, and a visit with no referrer and no `utm_source` is invisible. The real figure is higher than the dashboard shows.
- Bounce needs JavaScript and a delivered `pagehide` beacon. Visits where the beacon never arrives are excluded from the bounce rate, not counted as bounces.
- The widget must be on the landing page for a referral visit to be seen.

## 3. Make the site agent-readable

| What | Where | Notes |
|---|---|---|
| `llms.txt`, `llms-full.txt` | `/llms.txt`, `/llms-full.txt` | Generated from your content, linking to markdown versions. |
| Markdown pages | `/md/<path>`, `/<path>.md`, `Accept: text/markdown`, and automatically for known AI crawlers | Set `MARKDOWN_FOR_BOTS=false` to turn the automatic part off. |
| JSON-LD | Server-rendered in the Next.js pages; `GET /api/schema?path=` anywhere | `WebSite` + `WebPage`, plus `FAQPage` for any content file with `type: faq`. |
| `robots.txt`, `sitemap.xml` | generated | `AI_BOTS=block` adds `Disallow` rules for the known AI crawlers. |
| Link-ready HTML twin | `/<path>` in the Next.js app | Every content file is also a real HTML page, so bots and people get the same text. |

Limits:

- `data-schema="true"` injects JSON-LD with JavaScript. Crawlers that do not execute JavaScript will not see it. For those, render the JSON-LD on your server (done for you in the Next.js app) or paste the output of `/api/schema` into your templates.
- `llms.txt` is a proposal, not a standard that every AI engine reads. There is no evidence in this project that any particular engine uses it. Serving it costs nothing, but measure before you rely on it; the crawler dashboard will show whether anything fetches it.
- Serving different content to bots than to people can look like cloaking to search engines. Here the markdown is generated from the same source as the HTML, so the text matches. Keep it that way, and turn `MARKDOWN_FOR_BOTS` off if you are unsure.

## What this is not

It is not an SEO ranking tool, not a guarantee of being cited by any AI engine, and not a bot-protection product.
