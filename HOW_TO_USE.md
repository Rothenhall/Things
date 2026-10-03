# How to use FuzzKit Studio + the FuzzKit library

## 1. Run the studio

```bash
cd beacon
npm install
npm run dev
```

Open **http://localhost:3000**. (`npm run build` + `npm start` for a production build.)

## 2. Build a character in the studio

- **Characters rail** — 12 presets to start from: Bruno, Clover, Miso, Fern, Pip,
  Biscuit, Soot, Boo, Mochi, Zip, Puff, Willow.
- **Tabs** — Body (shape, limbs, coloring, markings) · Fur (fabric + pile sliders) ·
  Face (eyes, nose, mouth, cheeks) · Outfit (hat, neckwear, glasses, decoration) ·
  Motion (mood, boop/spin test, mouth override, render quality) · **Use it** (export).
- **Stage** — drag to rotate, click the avatar to boop it. Mood pills switch
  idle / waving / talking / thinking / excited / sleepy.
- **Toolbar** — undo/redo (Ctrl+Z / Ctrl+Shift+Z), Surprise me (random character),
  Photo (saves a PNG named after your character).

## 3. Export from the "Use it" tab

- **Save photo** — PNG download.
- **Save character file** — JSON of the full config (includes `fuzzkit` version).
  **Open character file** reloads it later.
- **Put it in your app** — generates a snippet containing only the settings you
  changed, in React / Next.js / HTML flavours.

## 4. Use the library in your own page (plain HTML)

The engine needs global `THREE` (r128) loaded first, then the UMD file:

```html
<div id="mascot" style="width:360px;height:360px"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script src="fuzzkit.umd.js"></script>
<script>
  // pass a preset id, or a full/partial config object
  const mascot = FuzzKit.mount(document.getElementById('mascot'), 'bruno', { state: 'idle' });
  mascot.setConfig({ color: '#7FA7E8', hat: 'beanie' });
  mascot.setState('waving'); // idle | thinking | talking | excited | sleepy | waving
  mascot.setMouth(0.6);      // lip-sync 0..1, or null for automatic
  mascot.poke();             // squish + fur ripple
</script>
```

> Note: the studio's React/Next.js snippets import from `'fuzzkit/react'`,
> which is **not published on npm yet** — see section 6. The HTML/UMD path above
> is the one that works today.

## 5. Library API reference (`window.FuzzKit`)

| Call | What it does |
|---|---|
| `FuzzKit.mount(el, config, opts)` | Mount avatar. `config` = preset id (`'bruno'`) or config object. `opts` = `{ state, quality: 'high'\|'medium'\|'low', interactive, autoLook, distance }`. Returns the avatar handle. |
| `avatar.setConfig(partial)` | Merge one or more keys (e.g. `{ hat: 'beanie' }`). Structural keys (shape/ears/arms/feet/tail/muzzle/seed) rebuild; the rest update live. Emits `change`. |
| `avatar.getConfig()` | Full current config object (save this as your character file). |
| `avatar.setState(name)` | `idle \| thinking \| talking \| excited \| sleepy \| waving` |
| `avatar.setMouth(v)` | Manual mouth 0..1, or `null` to hand control back to the mood. |
| `avatar.setAutoLook(bool)` | Follow-the-pointer head tracking on/off. |
| `avatar.poke()` / `avatar.shake()` | Boop (squish + ripple) / spin. |
| `avatar.snapshot(type)` / `avatar.snapshotBlob(type)` | PNG data-URL / Blob (needs `preserveDrawingBuffer: true` at mount for reliable capture). |
| `avatar.on('poke' \| 'change', fn)` | Subscribe; returns an unsubscribe function. |
| `avatar.resize()` / `avatar.destroy()` | Resize is auto-handled via ResizeObserver; call `destroy()` before unmounting/remounting. |
| `FuzzKit.normalize(cfg)` | Fill defaults + clamp; accepts preset id or partial object. |
| `FuzzKit.randomize(seed?)` | Random character config (same generator as "Surprise me"). |
| `FuzzKit.presets` / `.defaults` / `.schema` / `.options` / `.states` | Data to generate your own editor UI from (`schema` drives the studio's controls). |

## 6. Publishing the library to npm

The library is currently one file, `public/fuzzkit.umd.js` (UMD, expects global
`THREE`, version `1.0.0`), with no package wrapper. To publish:

1. **Create the package folder** (e.g. `packages/fuzzkit/`) containing:
   - `fuzzkit.umd.js` (copied from `public/`)
   - `package.json`:
     ```json
     {
       "name": "fuzzkit",
       "version": "1.0.0",
       "description": "Realistic parametric plush avatars for three.js",
       "main": "fuzzkit.umd.js",
       "unpkg": "fuzzkit.umd.js",
       "jsdelivr": "fuzzkit.umd.js",
       "peerDependencies": { "three": "0.128.0" },
       "license": "MIT"
     }
     ```
   - `README.md` (copy sections 4–5 of this file) + a `LICENSE` file.
2. **Publish:**
   ```bash
   cd packages/fuzzkit
   npm login
   npm publish --access public
   ```
3. **After publishing**, consumers can use it with script tags (unpkg/jsDelivr)
   plus a pinned three r128, exactly like section 4. A real `'fuzzkit/react'`
   entry point does not exist yet — that requires a small ESM wrapper package
   before the studio's React snippet will run verbatim.

To publish the **studio app itself** (as a website rather than a library),
deploy this folder to Vercel (`npx vercel`) or any host with `npm run build`.
