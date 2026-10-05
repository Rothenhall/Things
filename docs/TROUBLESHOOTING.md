# Troubleshooting

Start here: run the built-in check, which finds most problems and says how to fix them.

```bash
npx @rothenhall/things doctor --endpoint https://things.example.com
```

Then find your symptom below. Each entry says what to look at and what to change.

## Contents

- [The widget](#the-widget)
- [The chat](#the-chat)
- [The collector](#the-collector)
- [The dashboard](#the-dashboard)
- [Crawler and AI-referral data](#crawler-and-ai-referral-data)
- [The studio and export](#the-studio-and-export)
- [The npm package and CLI](#the-npm-package-and-cli)
- [FAQ](#faq)

## The widget

| Symptom | Likely cause and fix |
|---|---|
| Nothing appears | Open the browser console (F12). **404 for `things-chat.js`**: the file is not where the tag says. Run `npx @rothenhall/things init` and check `public/things/things-chat.js` is served at `/things/things-chat.js`, or use the collector's URL (`https://things.example.com/things/things-chat.js`). **No error at all**: the tag is not on this page, or a cookie/consent tool is blocking it. |
| A round "Ask" button instead of the character | The visitor's browser or device has no WebGL (old hardware, some privacy modes, remote desktops). Chat still works. In decoration mode nothing shows. |
| Character appears but the panel looks unstyled | Your Content Security Policy blocks inline styles inside the widget. Allow `style-src 'unsafe-inline'` ([WIDGET_REFERENCE.md](WIDGET_REFERENCE.md#content-security-policy)). |
| Console: "Refused to load the script ... Content Security Policy" | Add the origin serving the widget files to `script-src`. |
| Console: CORS error calling `/api/chat` or `/api/track` | The page's exact origin is not in `ALLOWED_ORIGINS` on the collector. Include `https://www.` and non-`www` variants, and `http://localhost:3000` for local testing. Restart the collector. |
| Console: "Mixed content" / blocked request to `http://...` | An https page cannot call an http collector. Put https in front of the collector ([DEPLOYMENT.md](DEPLOYMENT.md#https-reverse-proxy-and-the-dashboard)). |
| Chrome asks to "access other apps and services on this device" | A public page is calling `localhost`. Allow it for testing, or use a tunnel address. The collector already answers the pre-flight. |
| Wrong character or default `pebble` shows | `data-config` has invalid JSON and was ignored. Look for unescaped quotes; regenerate with `npx @rothenhall/things snippet --config ./character.json`. |
| Two characters appear | The tag is on the page twice (for example in the theme and in a plugin). Remove one. |
| The character is cut off or too big | The widget is 120 px. Check no CSS `transform` or `overflow:hidden` on `body` clips fixed-position elements. |
| It disappears when navigating in my single-page app | The script was loaded once and the page was replaced. Mount it once at the app root (`ThingsMascot`), not per page. |
| `data-endpoint` is ignored | Use the exact attribute name and lower-case `data-endpoint`. In JS use `endpoint` (no `data-`). |

## The chat

| Symptom | Likely cause and fix |
|---|---|
| "I cannot reach my brain right now" | The collector is down or unreachable from the visitor's browser. Check `curl https://things.example.com/api/health`. Then the CORS and https rows above. |
| Every question is "I don't have an answer to that yet" | The collector has no content. `/api/health` shows `pages`. Check `CONTENT_DIR` is relative to where you start the collector (run it from your project root), the files end in `.md`, and are not named `README.md` or start with `_`. |
| It answers some things but not obvious ones | Matching is by keywords, not meaning. A question is "answered" only when at least half of its meaningful words appear in one passage. Use headings that look like the questions people ask, and put the key words in them (headings count 2.5 times). Look at **Content gaps** to see what people actually ask, then add those words. |
| Answers are just quoted sentences | No model is configured, which is the free default. Set `LLM_API_KEY` for natural answers ([CONFIG_REFERENCE.md](CONFIG_REFERENCE.md#answer-engine-optional)). |
| Answers stopped being natural | The `CHAT_DAILY_LLM_LIMIT` was reached (default 500 a day), the provider returned an error (bad key, no credit, rate limit), or a request took over 20 seconds. The collector falls back to quoting your content. Check your provider's dashboard and the collector's console. |
| "Slow down" / "One moment, I need a breather" | The visitor exceeded `CHAT_RATE_LIMIT` (20 a minute). Raise it, or ignore it: it also stops abuse. All visitors behind one proxy that does not forward `X-Forwarded-For` look like one visitor; pass the header. |
| 401 "bad site key" | `SITE_KEY` is set on the collector but the widget has no matching `data-key`. |
| 403 "chat disabled" | `CHAT_ENABLED=false` on the collector. Set it to `true` or use `data-chat="false"` on the widget. |
| 403 "origin not allowed" | See the CORS row above. |
| The model makes things up | It is told to use only your passages and to say `NO_ANSWER` otherwise, but models can still err. Keep passages accurate and short, and review **What visitors ask most**. For the strictest behaviour use no model. |
| I want it to answer general questions | It does not: it is a site assistant that answers from your content. See [ARCHITECTURE.md](ARCHITECTURE.md#what-the-chat-is-not). |

## The collector

| Symptom | Likely cause and fix |
|---|---|
| `Error: listen EADDRINUSE` | Something already uses the port. Use `--port 8788` or stop the other process. |
| `process.loadEnvFile is not a function` or syntax errors at start | Node.js is too old. You need 20.12 or newer (`node --version`). |
| Started with defaults, ignoring my settings | It reads `things.env` or `.env` in the **current folder**. Run it from your project root, or pass `--env path/to/things.env`. |
| "WARNING: ALLOWED_ORIGINS is not set" | Any website can use your collector. Set it. |
| "WARNING: no content found" | See "Every question is not answered" above. |
| It stops when I close the terminal | Run it as a service: [DEPLOYMENT.md](DEPLOYMENT.md#keep-it-running). |
| Data folder is empty | Nothing has been recorded yet, or `DATA_DIR` points somewhere else. The collector prints the resolved path at start-up. |
| 413 Payload too large | Request bodies are limited to 16 KB. |
| Works locally, fails behind nginx | Pass `Host`, `X-Forwarded-For` and `X-Forwarded-Proto` ([DEPLOYMENT.md](DEPLOYMENT.md#nginx)). |

## The dashboard

| Symptom | Likely cause and fix |
|---|---|
| "Admin is disabled" (503) | `ADMIN_TOKEN` is empty. Set it in `things.env` (`npx @rothenhall/things token`) and restart. |
| "Admin is local-only on this server" (403) | You reached `/admin` through a tunnel or proxy. Open `http://localhost:8787/admin` on the machine, use an SSH tunnel, or set `ADMIN_LOCAL_ONLY=false` (read the warning in [DEPLOYMENT.md](DEPLOYMENT.md#reaching-the-dashboard)). |
| "Wrong token" | Copy the `ADMIN_TOKEN` line from the `things.env` the **running** collector is using. After editing it, restart. |
| Signed in but it asks again | Cookies are blocked, or you are on http through a proxy that rewrites to https. Use the same address consistently. |
| The numbers look low | Read the limits in [AGENT_READINESS.md](AGENT_READINESS.md): user-agents can be spoofed, many AI products strip the referrer, and keyword matching can log paraphrases as gaps. Time window: switch 7d / 30d / 90d. |
| "What visitors ask most" is empty | Chat is off, or no one has asked yet. |
| Old data missing | Logs rotate at `LOG_MAX_MB`, keeping one old copy. Raise `LOG_MAX_MB` or archive the `.1` files. |

## Crawler and AI-referral data

| Symptom | Likely cause and fix |
|---|---|
| No crawler hits | Crawlers do not run JavaScript, so the widget cannot see them. Add a server-side hook: Next.js middleware, the Cloudflare Worker, or `things import-log` ([GETTING_STARTED.md](GETTING_STARTED.md#step-10-capture-ai-crawler-traffic)). Test it: `curl -A "GPTBot/1.1" https://your-site/` and check `bot-hits.jsonl`. |
| Hits recorded but all "requested but missing" | The path does not match a content file. The "missing" list compares against your **content** pages (and a few built-in paths), not your whole site. Add the pages to `things-content/` or the crawl, or ignore pages that exist only in your site. |
| No visits from ChatGPT | Many AI products strip the referrer; only visits with an AI referrer or `utm_source` are recorded, and only on pages with the widget. Test with `?utm_source=chatgpt.com`. |
| Visits show but no bounce rate | The `end` record needs a delivered beacon when the tab closes. Visits that never sent one are excluded from the rate. |

## The studio and export

| Symptom | Likely cause and fix |
|---|---|
| "The 3D engine could not load" | Check your connection and reload. If WebGL is disabled in your browser or graphics driver, enable hardware acceleration. |
| The character is invisible or the page is slow | Lower the **Quality** in the Motion tab, or close other tabs that use WebGL. |
| My changes are gone | The studio saves to your browser's local storage; a private window or cleared site data starts fresh. Use **Save character file** to keep a copy. |
| "That file is not a Things character" | The file is not JSON from the studio. Save a new one with **Save character file**. |
| Surprise me keeps making odd characters | It picks random options; use it as inspiration and adjust. |
| Exported tag shows `data-endpoint="http://localhost:8787"` | That is the default for local testing. Replace it with your public https address in the "Address of your collector" box. |

## The npm package and CLI

| Symptom | Likely cause and fix |
|---|---|
| `npx` cannot find the package | The package may not be published under that name yet. Install from the repository: `npm install ./packages/things` (run `npm run package:sync` first), or check the name in `packages/things/package.json`. |
| "Unknown command" | Run `npx @rothenhall/things --help`. |
| `init` wrote to the wrong folder | Pass `--dir <your static folder>`. |
| `init` says things.env was kept | It never overwrites; use `--force` to replace it (this creates a new `ADMIN_TOKEN`). |
| `things doctor` says "Collector not reachable" | Start it (`things collector`) or pass `--endpoint` for a remote one. |
| `Cannot find module 'react'` when importing `/react` | Install React 18 or newer in your project; it is an optional peer dependency. |
| Changes to the widget do not show after upgrading | Run `npx @rothenhall/things update` and hard-refresh the browser (the files are cached for an hour by default). |

## FAQ

**Do I need an OpenAI key?** No. Without one the chat quotes your content, free, and nothing leaves your machine. A key gives more natural answers.

**Does a ChatGPT subscription work as the key?** No. The API is billed separately: create a key at platform.openai.com.

**Can I use a free local model?** Yes. Install Ollama, run a model, then set `LLM_BASE_URL=http://localhost:11434/v1` and `LLM_MODEL=llama3.2`.

**Does the character have to be in the corner?** The widget does. To place a character inside your layout use `ThingsAvatar` or the **Put it in your app** code.

**Can I use my own character artwork or a different mascot?** The engine draws its own plush characters from the settings in [CONFIG_REFERENCE.md](CONFIG_REFERENCE.md#character-settings). It does not load external 3D models.

**Does it slow my site down?** The widget is 16 KB and loads asynchronously; the engine and three.js (about 700 KB together) load after your page and are cached.

**Can several sites share one collector?** Yes: list every site in `ALLOWED_ORIGINS`. The dashboard shows all of them together (each question records the page and origin).

**Can visitors see my content files?** Only what the chat quotes in answers, and anything you publish at `/llms.txt` and `/md/...` (served from the same files). Do not put private information in `things-content/`.

**How do I stop using it?** Remove the tag. Optionally delete `things-data/`. See [NPM_PACKAGE.md](NPM_PACKAGE.md#uninstalling).

**Where do I report a bug?** https://github.com/Rothenhall/things/issues. Include the output of `npx @rothenhall/things doctor` and the browser console messages.
