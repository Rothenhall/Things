# Things documentation

Things puts a 3D plush character on your website. It can sit there as decoration, or answer visitors' questions from your own content. Either way it shows you which AI crawlers read your site and which visitors arrive from ChatGPT, Perplexity and Claude. The data is stored on your own machine, with no account and no database.

## Start here

| I want to... | Read |
|---|---|
| Get a character on my site in 15 minutes | [STUDIO_EXPORT.md](STUDIO_EXPORT.md): design it, export it, install it, see the dashboard |
| Understand the whole thing and pick a setup | [GETTING_STARTED.md](GETTING_STARTED.md) |
| Install with one command | [NPM_PACKAGE.md](NPM_PACKAGE.md) |
| Add it to WordPress, Shopify, Next.js, React, Webflow... | [FRAMEWORKS.md](FRAMEWORKS.md) |
| Keep it running and reachable from the internet | [DEPLOYMENT.md](DEPLOYMENT.md) |
| Something is not working | [TROUBLESHOOTING.md](TROUBLESHOOTING.md) |

## Reference

| Page | What is in it |
|---|---|
| [CONFIG_REFERENCE.md](CONFIG_REFERENCE.md) | Every collector setting, every widget attribute, every character setting |
| [WIDGET_REFERENCE.md](WIDGET_REFERENCE.md) | The `things-chat.js` script: attributes, JavaScript API, accessibility, tracking, CSP |
| [COLLECTOR_API.md](COLLECTOR_API.md) | Every HTTP endpoint, request and response shape, data files |
| [NPM_PACKAGE.md](NPM_PACKAGE.md) | CLI commands, React components, `embedSnippet`, CDN use |
| [DATA_AND_PRIVACY.md](DATA_AND_PRIVACY.md) | What is collected, what is not, retention, export, deletion, wording for your privacy policy |
| [AGENT_READINESS.md](AGENT_READINESS.md) | What the AI-traffic features can and cannot tell you |

## Operating and contributing

| Page | What is in it |
|---|---|
| [SELF_HOSTING.md](SELF_HOSTING.md) | Running the all-in-one app, content, the answer engine |
| [EMBEDDING.md](EMBEDDING.md) | Embedding with a collector on your own machine |
| [ARCHITECTURE.md](ARCHITECTURE.md) | How the parts fit together and why |
| [PUBLISHING.md](PUBLISHING.md) | Releasing the npm package |
| [GITHUB_SETUP.md](GITHUB_SETUP.md) | Repository settings and rulesets |

## The three ways to use Things

| | Decoration only | Chat + insights | Studio library |
|---|---|---|---|
| What visitors see | A character in the corner | The character answers questions | A character inside your layout |
| What you run | Nothing, or a collector for tracking | The collector | Nothing |
| You learn | AI crawler and AI-referral traffic | Plus what visitors ask and what you are missing | n/a |
| How | `data-chat="false"` | default | `ThingsAvatar` or `Things.mount` |

## Words used in these docs

| Term | Meaning |
|---|---|
| **Collector** | The small server you run. It answers the chat, records data, serves the dashboard. |
| **Widget** | The `things-chat.js` script on your page: the corner character and chat panel. |
| **Endpoint** | The public address of your collector (`data-endpoint`). |
| **Preset** | One of the nine ready-made characters (`mallow`, `plum`, ...). |
| **Character file** | The `.json` you save from the studio; a custom character. |
| **Content** | The markdown files (or crawled pages) the chat answers from. |
| **Content gap** | A question visitors asked that your content could not answer. |
| **AI crawler** | An automated program run by an AI company (GPTBot, ClaudeBot, ...) that reads web pages. |
| **AI-referred visit** | A person who clicked through to your site from an AI answer. |
| **Capture-only** | Chat off; the character is decoration, tracking still runs. |
