# FuzzKit Studio

Build a 3D plush character. Change the fur, face and outfit, then boop it.
https://github.com/Rothenhall/fuzzkit
MIT-licensed — see [LICENSE](LICENSE). Full usage + library docs: [HOW_TO_USE.md](HOW_TO_USE.md).

## Quickstart

```bash
git clone https://github.com/Rothenhall/fuzzkit.git
cd fuzzkit
npm install
npm run dev
```

Open http://localhost:3000. Production: `npm run build`, then `npm start`.

## Tour

- **Characters** — 12 presets (Bruno, Clover, Miso … Willow) to start from.
- **Body / Fur / Face / Outfit** — shape, fabrics, features, accessories.
- **Motion** — moods, boop/spin test, mouth override, render quality.
- **Guide** — in-app instructions for using and embedding characters.
- **Use it** — save a PNG, save/open the character JSON, copy React/Next/HTML code.

Drag the avatar to rotate it, click it to boop it. Undo/redo with Ctrl+Z / Ctrl+Shift+Z.

## Project structure

- `app/` — Next.js shell (`Studio.js` loads the scripts, `markup.js` is the page HTML, `globals.css` all styles).
- `public/three.min.js` — pinned three.js r128 (must load first).
- `public/fuzzkit.umd.js` — the 3D engine, exposes `window.FuzzKit` (`mount`, `setConfig`, presets, schema-driven config).
- `public/studio.js` — editor wiring: history, controls, tabs, export.

The `public/*.js` files are plain scripts loaded via `<script>` tags, not bundled
modules — edit them in place and check with `node --check public/studio.js`.

## Embed a character anywhere

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script src="fuzzkit.umd.js"></script>
<script>
  const mascot = FuzzKit.mount(document.getElementById('mascot'), 'willow');
  mascot.setState('waving');
</script>
```

## Contributing

Fork it, `npm install`, `npm run dev`, keep edits small and in the existing
vanilla-JS style. See [AGENTS.md](AGENTS.md) for repo conventions and gotchas
before changing the engine or editor.

## License

MIT © Rothenhall.
