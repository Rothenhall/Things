# Things

By Rothenhall.

Build a 3D plush character, change the fur, face and outfit, then boop it.

Open source, MIT licensed, by [Rothenhall Partners](https://rothenhall.com).
Full usage and library docs: [HOW_TO_USE.md](HOW_TO_USE.md).

## Quickstart

```bash
git clone https://github.com/Rothenhall/things.git
cd things
npm install
npm run dev
```

Open http://localhost:3000. Production: `npm run build`, then `npm start`.

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

The `public/*.js` files are plain scripts loaded via `<script>` tags, not bundled
modules, edit them in place and check with `node --check public/studio.js`.

## Embed a character anywhere

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script src="things.umd.js"></script>
<script>
  const mascot = Things.mount(document.getElementById('mascot'), 'mallow');
  mascot.setState('waving');
</script>
```

## Contributing

Fork it, `npm install`, `npm run dev`, keep edits small and in the existing
vanilla-JS style. See [AGENTS.md](AGENTS.md) for repo conventions and gotchas
before changing the engine or editor.

## License

MIT © Rothenhall.
