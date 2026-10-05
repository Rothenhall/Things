# Things

By Rothenhall.

Build a 3D plush character, change the fur, face and outfit, then boop it.

Open source, MIT licensed, free to self-host, by [Rothenhall Partners](https://rothenhall.com).
No account, no paid tier, no telemetry. Full usage and library docs: [HOW_TO_USE.md](HOW_TO_USE.md).

## Put a character on your site

Beyond the editor, a Things character can live on **any website** as a chat assistant:

1. **Answers visitor questions** from your site's content (markdown files or a crawl of your sitemap), in the character's speech bubble. Works with no AI key by quoting your content; plug in OpenAI-compatible, Ollama or Anthropic for fluent answers.
2. **Logs every question it cannot answer** as a content-gap list, plus a prompt list to test in ChatGPT and Perplexity.
3. **Shows which visitors are AI**: crawler hits (GPTBot, ClaudeBot, PerplexityBot and more), the pages they read, the paths they asked for that do not exist, and visits referred from AI answers with bounce rate.
4. **Makes the site agent-readable**: `llms.txt`, markdown versions of pages for bots, JSON-LD and FAQ markup, `robots.txt`, `sitemap.xml`.

> **Status:** the npm package is ready but not published yet (see [docs/PUBLISHING.md](docs/PUBLISHING.md)). Until it is, run `npm run package:sync` in a clone and `npm install /path/to/things/packages/things` in your project, then use `npx things ...` instead of `npx @rothenhall/things ...`.

Set it up in one command, from your own website project:

```bash
npx @rothenhall/things init     # copies the widget, creates settings and a content folder, prints a <script> tag
npx @rothenhall/things collector  # runs the collector and dashboard on your machine (http://localhost:8787/admin)
```

or build a character in the studio, open **Use it > Embed on your site**, and copy the tag and one-line command it generates. Choose **Chat + insights** (the character answers visitors and you see what they ask) or **Decoration only** (it just sits there, and you still see AI crawler and AI-referral traffic). For fluent answers add your own OpenAI API key (`LLM_API_KEY`); without one the chat quotes your content.

React and Next.js:

```jsx
import { ThingsMascot } from '@rothenhall/things/react';
<ThingsMascot endpoint="https://things.example.com" preset="plum" />
```

Documentation: **[docs/](docs/README.md)** · [Studio to live site](docs/STUDIO_EXPORT.md) · [Getting started](docs/GETTING_STARTED.md) · [npm package and CLI](docs/NPM_PACKAGE.md) · [Frameworks](docs/FRAMEWORKS.md) · [Deployment](docs/DEPLOYMENT.md) · [Configuration](docs/CONFIG_REFERENCE.md) · [Collector API](docs/COLLECTOR_API.md) · [Privacy](docs/DATA_AND_PRIVACY.md) · [Troubleshooting](docs/TROUBLESHOOTING.md) · [What it can and cannot measure](docs/AGENT_READINESS.md).

## Quickstart

```bash
git clone https://github.com/Rothenhall/things.git
cd things
npm install
npm run dev
```

Open http://localhost:3000. Production: `npm run build`, then `npm start`.
Or with Docker: `cp .env.example .env && docker compose up -d --build`.

## Tour

- **Characters**, 9 presets (Mallow, Plum, Mint … Truffle) to start from.
- **Body / Fur / Face / Outfit**, shape, fabrics, features, accessories.
- **Motion**, moods, boop/spin test, mouth override, render quality.
- **Guide**, in-app instructions for using and embedding characters.
- **Use it**, save a PNG, save/open the character JSON, copy React/Next/HTML code.

Drag the avatar to rotate it, click it to boop it. Undo/redo with Ctrl+Z / Ctrl+Shift+Z.

## Project structure

- `app/`, Next.js shell (`Studio.js` loads the scripts, `markup.js` is the page HTML, `globals.css` all styles).
- `public/three.min.js`, pinned three.js r128 (must load first).
- `public/things.umd.js`, the 3D engine, exposes `window.Things` (`mount`, `setConfig`, presets, schema-driven config).
- `public/studio.js`, editor wiring: history, controls, tabs, export.
- `public/things-chat.js`, the embeddable chat widget (plain script).
- `lib/`, server logic shared by Next.js and the collector: content search, answers, bot detection, dashboard, router.
- `server/`, the standalone collector and the access-log importer.
- `content/`, markdown the chat answers from, and the pages crawlers get as markdown.
- `middleware.js`, AI-crawler logging and markdown responses.
- `docs/`, self-hosting, embedding, agent-readiness and GitHub setup guides.

The `public/*.js` files are plain scripts loaded via `<script>` tags, not bundled
modules, edit them in place and check with `node --check public/studio.js`.

## Embed a character anywhere

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script src="things.umd.js"></script>
<script>
  const mascot = Things.mount(document.getElementById('mascot'), 'pebble');
  mascot.setState('waving');
</script>
```

## Contributing

Fork it, `npm ci`, `npm run dev`. Before a pull request run `npm run check`, `npm test` and `npm run build`.
Read [CONTRIBUTING.md](CONTRIBUTING.md) and [AGENTS.md](AGENTS.md) first; keep edits small and in the existing
vanilla-JS style. Be kind: [Code of Conduct](CODE_OF_CONDUCT.md). Security issues: [SECURITY.md](SECURITY.md).
Questions: open a [discussion](https://github.com/Rothenhall/things/discussions).

## License

MIT © Rothenhall. See [LICENSE](LICENSE) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
