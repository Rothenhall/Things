# @rothenhall/things

Put a 3D plush character on your website. Optionally let it answer visitors' questions from your own content, and see which AI crawlers read your site and which visitors arrive from ChatGPT, Perplexity and Claude. Everything runs on your own machine or server: no account, no database, no telemetry.

```bash
npx @rothenhall/things init
npx @rothenhall/things collector
```

That is the whole setup. The first command copies the widget into your project and writes a config. The second starts the collector and dashboard.

## What you get

| Piece | What it does |
|---|---|
| **Mascot widget** | A character in the corner of your site. Decoration only, or a chat. One `<script>` tag. |
| **Chat** (optional) | Answers questions from your content. Quotes your text for free, or writes natural answers with your own OpenAI, Anthropic or local Ollama model. |
| **Collector** | A small server you run. Records questions, AI crawler hits and visits from AI answers into plain files on your disk. |
| **Dashboard** | What visitors ask most, what you could not answer, which AI bots read which pages, and whether AI-referred visitors stay. |
| **React components** | `ThingsAvatar` and `ThingsMascot` for React and Next.js. |

## 1. Design your character

Build it in the studio (https://github.com/Rothenhall/Things, run it with `npm run dev`, or use your deployed copy). Open **Use it**, choose **Embed on your site**, and either copy the generated `<script>` tag or save the character file and pass it to the CLI:

```bash
npx @rothenhall/things init --config ./my-character.json
```

Or skip the studio and choose a preset: `mallow`, `plum`, `mint`, `tango`, `pebble`, `cosmo`, `poppy`, `dew`, `truffle`.

## 2. Install into your site

Run this in the root of your project (Next.js, Vite, Astro, SvelteKit, plain HTML: anything with a folder of static files):

```bash
npx @rothenhall/things init \
  --site-url https://example.com \
  --endpoint https://things.example.com
```

It does this, and tells you each step:

- copies `things-chat.js`, `things.umd.js` and `three.min.js` to `public/things/` (or `static/`, `www/`, `web/`; use `--dir` to choose)
- creates `things.env` with a random `ADMIN_TOKEN`
- creates `things-content/index.md`, a starter file for the chat to answer from
- adds `things.env` and `things-data/` to `.gitignore`
- prints the `<script>` tag to paste before `</body>` (also saved to `things-snippet.html`)

## 3. Run the collector

```bash
npx @rothenhall/things collector
```

Open http://localhost:8787/admin and sign in with the `ADMIN_TOKEN` from `things.env`. Check the whole setup any time with:

```bash
npx @rothenhall/things doctor
```

## Modes

| | Chat + insights | Capture only |
|---|---|---|
| The character | Answers questions | Decoration, reacts to clicks |
| Widget | default | `data-chat="false"` (`init --no-chat`) |
| Server | `CHAT_ENABLED=true` | `CHAT_ENABLED=false` |
| You learn | What visitors ask, what you are missing, AI crawler and AI-referral traffic | AI crawler and AI-referral traffic |

For natural-language answers set `LLM_API_KEY` (your own OpenAI key, from platform.openai.com) in `things.env`. A ChatGPT subscription does not include an API key. Without a key the character quotes your content.

## React and Next.js

```jsx
'use client';
import { ThingsMascot } from '@rothenhall/things/react';

export default function Mascot() {
  return <ThingsMascot endpoint="https://things.example.com" preset="plum" />;
}
```

`ThingsMascot` loads `/things/things-chat.js`, so run `init` first. To show a character inside your own layout instead of in the corner:

```jsx
import { ThingsAvatar } from '@rothenhall/things/react';

<ThingsAvatar config="mallow" state="waving" style={{ width: 360, height: 360 }} />
```

`config` takes a preset id or a character object exported from the studio. `state` is one of `idle`, `waving`, `talking`, `thinking`, `excited`, `sleepy`.

## CLI reference

| Command | What it does |
|---|---|
| `things init` | Copy the widget, create `things.env` and a content folder, print the snippet |
| `things snippet` | Print the `<script>` tag (`--config`, `--endpoint`, `--no-chat`, `--title`, `--greeting`, `--position`, `--color`) |
| `things collector` | Run the collector and dashboard (`--env`, `--port`) |
| `things doctor` | Check files, config, content and whether the collector answers (`--endpoint`) |
| `things update` | Refresh the copied widget files after upgrading |
| `things import-log <file>` | Import AI crawler hits from an nginx or Apache access log |
| `things token` | Print a new random token |

Run `things --help` for every option.

## Requirements

Node.js 20.12 or newer. The widget needs WebGL in the visitor's browser; without it, the chat falls back to a plain button and everything else still works.

## Documentation

Full guides live in the repository's [docs](https://github.com/Rothenhall/Things/tree/main/docs) folder: getting started, the studio export flow, widget and collector API references, configuration, deployment recipes, framework guides, privacy and troubleshooting.

## License

MIT
