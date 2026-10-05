# Embed the character on any site, keep the data on your own machine

The widget script and the 3D engine are static files served by a deployed Things site. Everything the widget **collects** (questions, content gaps, crawler hits, AI-referral visits) goes to a **collector** that you run yourself.

```
 visitor's browser                      deployed Things site (static files only)
 ┌──────────────────────┐  loads JS   ┌──────────────────────────────┐
 │ your-site.com        │ ──────────► │ /things-chat.js              │
 │  + <script> tag      │             │ /things.umd.js /three.min.js │
 └──────────┬───────────┘             └──────────────────────────────┘
            │ POST /api/chat, /api/track
            ▼
 ┌──────────────────────────────────────┐
 │ YOUR collector (npm run collector)   │  content/*.md or a crawl of your site
 │ on your PC or server, port 8787      │  data/*.jsonl   /admin dashboard
 └──────────────────────────────────────┘
```

The deployed site never sees your visitors' questions. If you host the static files yourself too (`npm run build && npm start`), nothing leaves your infrastructure.

## 1. Run the collector

```bash
git clone https://github.com/Rothenhall/things.git
cd things
npm ci
cp .env.example .env
```

Edit `.env`:

```bash
ADMIN_TOKEN=<long random string>
ALLOWED_ORIGINS=https://your-site.com
SITE_URL=https://your-site.com
CONTENT_SITEMAP=https://your-site.com/sitemap.xml   # what the character answers from
```

Instead of `CONTENT_SITEMAP` you can put markdown files in `content/`. Then:

```bash
npm run collector
# Things collector listening on http://localhost:8787
```

Check it: `curl http://localhost:8787/api/health`. The dashboard is at http://localhost:8787/admin (local only).

## 2. Make it reachable from your visitors' browsers

A site on the public internet cannot reach `localhost` on your PC for other people's browsers, so give the collector a public HTTPS address. Pick one:

| Option | Command | Notes |
|---|---|---|
| Cloudflare quick tunnel | `cloudflared tunnel --url http://localhost:8787` | Free, no account. The address changes every run. For a stable address create a named tunnel on a domain you own. |
| Tailscale Funnel | `tailscale funnel 8787` | Free for personal use. Stable `*.ts.net` address. |
| A small VPS | run the collector there | Put Caddy or nginx in front for HTTPS. |
| Testing on one PC | nothing | Use `http://localhost:8787` as the endpoint and open your site in a browser on that PC. Chrome may ask permission for a public page to reach your local network; the collector already answers that check. |

Your PC must be on for the chat to work. If the collector is unreachable the character says it cannot reach its brain and the page is unaffected.

The admin dashboard is blocked for tunnelled requests (`ADMIN_LOCAL_ONLY` is on by default for the collector), so exposing the port does not expose the dashboard. It detects tunnels by the `X-Forwarded-For` / `CF-Connecting-IP` header they add. A custom proxy that removes those headers defeats this, so set `ADMIN_LOCAL_ONLY=true` and bind with `COLLECTOR_HOST=127.0.0.1` if you proxy locally.

## Bring your own model

The embed code never contains a model key. The key lives in the environment of the collector you run, and the widget on your pages only talks to that collector. To use a model:

```bash
# Sarvam
LLM_PROVIDER=sarvam
LLM_API_KEY=your-sarvam-key

# OpenAI, Anthropic, Gemini, Groq or OpenRouter: change LLM_PROVIDER
# Anything else with an OpenAI-style chat API (Ollama, LM Studio, vLLM, a company gateway):
LLM_PROVIDER=openai
LLM_BASE_URL=https://your-host/v1
LLM_MODEL=your-model
LLM_API_KEY=if-it-needs-one
```

What you need to run this: a collector (`npx @rothenhall/things collector`, or the Docker image) on a host with a disk, and a public https address for it. Without a key the character still answers by quoting your content. Providers that do not offer an OpenAI-style chat endpoint need an OpenAI-compatible gateway in front of them.

## 3. Add the script to your site

```html
<script src="https://YOUR-DEPLOYED-THINGS-SITE/things-chat.js"
        data-endpoint="https://YOUR-COLLECTOR-ADDRESS"
        data-preset="pebble"
        data-title="Ask Mallow"
        data-schema="true"
        async></script>
```

| Attribute | Default | Meaning |
|---|---|---|
| `data-endpoint` | script's own origin | Your collector. |
| `data-preset` | `pebble` | Any preset id: mallow, plum, mint, tango, pebble, cosmo, poppy, dew, truffle. |
| `data-title`, `data-greeting` | "Ask me" | Header text and first message. |
| `data-key` | none | Sent as `x-things-key`; must match `SITE_KEY` if you set one. A spam filter, not a secret. |
| `data-position` | `right` | `left` or `right`. |
| `data-color` | `#a85c30` | Accent color. |
| `data-track` | on | `false` turns off AI-referral tracking. |
| `data-schema` | off | `true` injects JSON-LD from the collector into the page (see the limits in [AGENT_READINESS.md](AGENT_READINESS.md)). |
| `data-assets` | script's own origin | Where to load `three.min.js` and `things.umd.js`. |

Add `data-manual` and call `ThingsChat.init({ ... })` yourself for full control. `ThingsChat.open()`, `.close()` and `.destroy()` also exist. The widget lives in a shadow root, so your CSS cannot break it and it cannot break yours.

## 4. See crawler traffic on a site you do not control the code of

Crawlers do not run JavaScript, so the widget cannot see them. Use one of these:

- **Cloudflare Worker**: `snippets/cloudflare-worker.js`. Reports crawler hits and can serve markdown and `/llms.txt` from the collector.
- **Access logs**: `npm run import-log -- /var/log/nginx/access.log` reads nginx or Apache combined logs on the same machine and imports the AI crawler lines. Nothing is sent anywhere.
- **A Next.js site you own**: copy `middleware.js` and set `COLLECTOR_URL`.

## 5. Read the results

Open http://localhost:8787/admin on the machine running the collector.

## Using a hosted Things site you do not run

You can point at the public Things site for the files, but only host-it-yourself guarantees availability. Pin your own copy of `things-chat.js`, `things.umd.js` and `three.min.js` on your own server and set `data-assets` if you need to avoid a third-party dependency.
