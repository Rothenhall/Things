# Configuration reference

Everything you can configure, in one place. There are three layers:

1. [Collector settings](#collector-settings-environment-variables): environment variables for the server you run (`things.env` or `.env`)
2. [Widget settings](#widget-settings): `data-*` attributes on the `<script>` tag (full detail in [WIDGET_REFERENCE.md](WIDGET_REFERENCE.md))
3. [Character settings](#character-settings): the JSON that describes how your plush looks

---

## Collector settings (environment variables)

The collector reads `things.env` (created by `npx @rothenhall/things init`) or `.env`, then the real environment. A variable set in the real environment wins over the file. Change the file with `THINGS_ENV_FILE=path/to/file` or `things collector --env path/to/file`. Restart the collector after changing a setting.

### Your site

| Variable | Default | What it does |
|---|---|---|
| `SITE_URL` | empty | Your public site, with no trailing slash, e.g. `https://example.com`. Used for absolute links in `llms.txt`, `sitemap.xml`, JSON-LD and chat source links. If empty, the address of the incoming request is used. For the Next.js app set it at **build** time too. |
| `SITE_NAME` | `Things` | Name shown in `llms.txt`, JSON-LD and the dashboard header. |
| `SITE_DESCRIPTION` | a sentence about Things | One-line description for `llms.txt` and JSON-LD. Change it to describe your site. |

### Content the chat answers from

| Variable | Default | What it does |
|---|---|---|
| `CONTENT_DIR` | `content` (`things-content` when created by `init`) | Folder of `.md` files, relative to where you start the collector. Files named `README.md` or starting with `_` are ignored. Subfolders are read. |
| `CONTENT_SITEMAP` | empty | A sitemap URL to crawl. Same-origin pages only, at most 50, refreshed every hour. A sitemap index is followed one level. |
| `CONTENT_URLS` | empty | Comma-separated page URLs to fetch instead of, or as well as, a sitemap. |

Local files win over crawled pages with the same path. Edits to local files are picked up on the next question; you do not need to restart.

### Admin dashboard

| Variable | Default | What it does |
|---|---|---|
| `ADMIN_TOKEN` | empty | The dashboard password. **Unset means the dashboard is disabled.** Use 24 or more random characters: `npx @rothenhall/things token`. |
| `ADMIN_LOCAL_ONLY` | collector: `true`; Next.js app: `false` | When true, `/admin` refuses any request that carries a proxy header (`X-Forwarded-For`, `CF-Connecting-IP`, `X-Real-IP` or `Forwarded`). That keeps the dashboard private when you expose the collector through a tunnel or reverse proxy. Set `false` only if you serve the dashboard over HTTPS with a strong token. |

### Data storage

| Variable | Default | What it does |
|---|---|---|
| `DATA_DIR` | `data` (`things-data` when created by `init`) | Folder for the three log files. Created automatically. Keep it outside any publicly served folder and back it up by copying it. |
| `LOG_MAX_MB` | `10` | When a log file passes this size it is renamed to `<name>.1`, replacing any earlier `.1`, and a new file starts. The dashboard reads both files. |

### Chat

| Variable | Default | What it does |
|---|---|---|
| `CHAT_ENABLED` | `true` | `false` turns the chat off: `/api/chat` answers 403 and nothing is asked or stored. Crawler and AI-referral tracking keep working. Pair it with `data-chat="false"` on the widget. |
| `ALLOWED_ORIGINS` | empty (any website) | Comma-separated origins allowed to call the public endpoints from a browser, e.g. `https://example.com,https://www.example.com`. Include every variant (with and without `www`, and `http://localhost:3000` for local testing). Requests with no `Origin` header (curl, server to server) are always allowed. **Set this in production.** |
| `SITE_KEY` | empty | If set, `/api/chat` requires the same value in the `x-things-key` header (the widget sends `data-key`). A spam filter, not a secret: anyone can read it in your page source. |
| `CHAT_RATE_LIMIT` | `20` | Questions per visitor per minute. A visitor is a hash of IP, browser and date. |
| `CHAT_DAILY_LLM_LIMIT` | `500` | Maximum language-model calls per day across all visitors. After that, answers fall back to quoting your content. The counter resets at midnight UTC and lives in memory, so it also resets when the collector restarts. |
| `CHAT_FALLBACK` | "I don't have an answer to that yet. I've noted your question so it can be added." | What the character says when it cannot answer. |

### Answer engine (optional)

Leave all of these empty and the chat quotes the best matching passages of your content: free, no model, and nothing leaves your machine.

| Variable | Default | What it does |
|---|---|---|
| `LLM_PROVIDER` | automatic | `openai` (any OpenAI-compatible API) or `anthropic`. If empty it is `openai` when `LLM_API_KEY` or `LLM_BASE_URL` is set, otherwise no model. |
| `LLM_API_KEY` | empty | Your API key. For OpenAI, create one at platform.openai.com (a ChatGPT subscription does not include API access). Keep it only in the collector's environment. |
| `LLM_BASE_URL` | OpenAI `https://api.openai.com/v1`; Anthropic `https://api.anthropic.com` | Point at OpenRouter, Ollama (`http://localhost:11434/v1`), LM Studio, vLLM or any compatible server. |
| `LLM_MODEL` | OpenAI `gpt-4o-mini`; Anthropic `claude-haiku-4-5-20251001` | Model name. |

With a model configured, each answerable question sends the question and up to four matching passages to the provider. Requests time out after 20 seconds and fall back to quoting your content. Replies are limited to about 300 tokens.

### AI traffic

| Variable | Default | What it does |
|---|---|---|
| `MARKDOWN_FOR_BOTS` | `true` | Serve markdown instead of HTML to known AI crawlers (also to `Accept: text/markdown` and `/page.md`). Next.js app only. |
| `AI_BOTS` | `allow` | `block` adds `Disallow: /` rules for known AI crawlers to `robots.txt`. |
| `COLLECTOR_URL` | empty | Next.js app only: send crawler hits to a remote collector instead of this app. |
| `INTERNAL_URL` | `http://127.0.0.1:$PORT` | Next.js app only: how the middleware reaches its own `/api/track`. |

### Collector process

| Variable | Default | What it does |
|---|---|---|
| `COLLECTOR_PORT` | `8787` | Port to listen on (`PORT` is also read). |
| `COLLECTOR_HOST` | `0.0.0.0` | Address to bind. Use `127.0.0.1` when a proxy on the same machine is the only thing that should reach it. |
| `THINGS_ENV_FILE` | `.env` | Path to the settings file. Set automatically by `things collector`. |

Request bodies larger than 16 KB are rejected with 413.

---

## Widget settings

Set on the `<script>` tag as `data-*` attributes, or pass the same names (without `data-`) to `ThingsChat.init({...})`.

| Attribute | Default | Meaning |
|---|---|---|
| `data-endpoint` | origin the script was loaded from | Your collector. |
| `data-preset` | `mallow` | One of `mallow`, `plum`, `mint`, `tango`, `pebble`, `cosmo`, `poppy`, `dew`, `truffle`. |
| `data-config` | none | A custom character exported from the studio, as JSON. Overrides `data-preset`. |
| `data-chat` | on | `false` = decoration only. |
| `data-title` | `Ask me` | Chat header text. |
| `data-greeting` | `Hi! Ask me anything about this site.` | First message and the small bubble. |
| `data-position` | `right` | `left` or `right`. |
| `data-color` | `#a85c30` | Accent colour (buttons, visitor messages). |
| `data-key` | none | Sent as `x-things-key`; must match `SITE_KEY`. |
| `data-track` | on | `false` turns off AI-referral tracking. |
| `data-schema` | off | `true` injects JSON-LD from the collector. |
| `data-assets` | folder the script was loaded from | Where `three.min.js` and `things.umd.js` load from. |
| `data-manual` | absent | Present = do not start automatically; call `ThingsChat.init()` yourself. |

---

## Character settings

A character is a plain JSON object. The studio writes only the settings that differ from the defaults, and anything missing falls back to its default, so you can edit these by hand. Out-of-range values are corrected on load (numbers are clamped to the allowed range, unknown choices fall back to the default).

```json
{
  "name": "Plum",
  "shape": "gumdrop",
  "color": "#7B4DFF",
  "eyes": "oval",
  "glasses": "sunglasses",
  "glassesColor": "#F7F3EA",
  "hat": "beanie",
  "hatColor": "#FF9F1C"
}
```

`name` is a label only (used for file names). `seed` (1 to 99) changes the small handmade irregularities in the stitching and fur. Changing `shape`, `ears`, `arms`, `feet`, `tail`, `muzzle` or `seed` rebuilds the character; everything else updates live.

Touching any fur slider (`furLength`, `furDensity`, `furThickness`, `furDroop`, `furFlex`, `furVariation`, `sheen`) makes the fabric `custom`. Picking a **fabric** fills those sliders with that fabric's values:

| Fabric | Pile | Look |
|---|---|---|
| `velvet` | very short | smooth, soft, high sheen |
| `minky` | short | soft, even pile |
| `fleece` | medium | fluffy, matte |
| `mohair` | medium to long | wispy, fuzzy |
| `shaggy` | long | long, droopy, tousled |
| `felt` | none | flat, matte cloth |

Moods you can set at runtime: `idle`, `waving`, `talking`, `thinking`, `excited`, `sleepy`. Render quality: `high`, `medium`, `low`.

### Every character setting

Grouped as in the studio tabs. "Shown when" marks settings that only matter when another setting is switched on (for example the nose colour only matters when there is a nose).

#### Body

| Key | Type | Values | Default | Shown when |
|---|---|---|---|---|
| `shape` | select | `round`, `wide`, `egg`, `pear`, `gumdrop`, `mochi`, `ghost`, `blob`, `drop`, `heart`, `pillow` | `"round"` | always |
| `ears` | select | `none`, `round`, `pointy`, `long`, `floppy` | `"none"` | always |
| `arms` | select | `none`, `nub` | `"none"` | always |
| `feet` | select | `none`, `nub`, `paw` | `"none"` | always |
| `tail` | select | `none`, `pom`, `curl`, `brush` | `"none"` | always |
| `muzzle` | select | `none`, `snout` | `"none"` | always |
| `color` | color | hex colour | `"#FF8A6B"` | always |
| `accent` | color | hex colour | `"#FFE3D6"` | always |
| `feetColor` | color | hex colour or `null` (Match fur) | `null` | depends on other settings |
| `tummy` | bool | true / false | `false` | always |
| `tailTip` | bool | true / false | `false` | depends on other settings |
| `pattern` | select | `none`, `spots`, `stripes`, `patches` | `"none"` | always |
| `patternColor` | color | hex colour | `"#5E4334"` | depends on other settings |
| `patternScale` | range | 0.5 to 2 | `1` | depends on other settings |
| `seed` | range | 1 to 99 | `7` | always |

#### Fur

| Key | Type | Values | Default | Shown when |
|---|---|---|---|---|
| `fabric` | select | `velvet`, `minky`, `fleece`, `mohair`, `shaggy`, `felt` | `"minky"` | always |
| `furLength` | range | 0 to 1 | `0.35` | always |
| `furDensity` | range | 0.4 to 2 | `1` | always |
| `furThickness` | range | 0.2 to 1 | `0.6` | always |
| `furDroop` | range | 0 to 1 | `0.45` | always |
| `furFlex` | range | 0 to 1 | `0.5` | always |
| `furVariation` | range | 0 to 0.4 | `0.1` | always |
| `sheen` | range | 0 to 1 | `0.75` | always |
| `furTip` | color | hex colour or `null` (None) | `null` | always |

#### Face

| Key | Type | Values | Default | Shown when |
|---|---|---|---|---|
| `eyes` | select | `safety`, `oval`, `stitched`, `happy`, `googly` | `"safety"` | always |
| `eyeColor` | color | hex colour | `"#101016"` | always |
| `eyeSize` | range | 0.6 to 1.6 | `1` | always |
| `eyeSpacing` | range | 0.18 to 0.45 | `0.3` | always |
| `eyeHeight` | range | 0.02 to 0.3 | `0.14` | always |
| `nose` | select | `none`, `button`, `stitched`, `felt`, `beak` | `"none"` | always |
| `noseColor` | color | hex colour | `"#2A1716"` | depends on other settings |
| `noseSize` | range | 0.6 to 1.6 | `1` | depends on other settings |
| `mouth` | select | `smile`, `grin`, `cat`, `flat`, `open`, `none` | `"smile"` | always |
| `mouthColor` | color | hex colour or `null` (Auto) | `null` | depends on other settings |
| `mouthSize` | range | 0.6 to 1.6 | `1` | depends on other settings |
| `mouthHeight` | range | -0.26 to -0.04 | `-0.12` | depends on other settings |
| `cheeks` | select | `blush`, `dots`, `none` | `"blush"` | always |
| `cheekColor` | color | hex colour | `"#F7A1B5"` | depends on other settings |
| `cheekSize` | range | 0.5 to 1.6 | `1` | depends on other settings |

#### Outfit

| Key | Type | Values | Default | Shown when |
|---|---|---|---|---|
| `hat` | select | `none`, `beanie`, `party`, `crown`, `chef`, `propeller`, `antenna`, `beret` | `"none"` | always |
| `hatColor` | color | hex colour or `null` (Default) | `null` | depends on other settings |
| `neck` | select | `none`, `scarf`, `bowtie`, `bell` | `"none"` | always |
| `neckColor` | color | hex colour or `null` (Default) | `null` | depends on other settings |
| `glasses` | select | `none`, `round`, `sunglasses` | `"none"` | always |
| `glassesColor` | color | hex colour | `"#3B2C24"` | depends on other settings |
| `deco` | select | `none`, `hairbow`, `flower` | `"none"` | always |
| `decoColor` | color | hex colour or `null` (Default) | `null` | depends on other settings |

`feetColor`, `furTip` and `mouthColor` accept `null`, meaning "match the fur", "none" and "automatic". `cheekSpacing` is stored with the character but has no studio control.
