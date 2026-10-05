# AGENTS.md — instructions for coding agents working in this repo

## What this is

Things: a Next.js app (this repo) that hosts a 3D plush-character editor.
The editor UI and the 3D engine are **plain scripts loaded via `<script>` tags**,
not bundled modules. Source of truth for behavior is the code, not any spec doc.

## Commands

- Dev server: `npm run dev` → http://localhost:3000
- Production: `npm run build`, then `npm start`
- Syntax-check a script edit: `node --check public/studio.js`, `node --check public/things.umd.js`
- `npm run check` (syntax), `npm test` (lib + router tests), `npm run collector` (standalone data server). No linter or formatter.

## Repo map

- `app/page.js` → landing (`app/Landing.js`: live jigsaw-clipped plush clusters). `app/studio/page.js` → renders `Studio` at `/studio`.
- `app/Studio.js` → loads `SCRIPTS = ['/three.min.js', '/things.umd.js', '/studio.js']`
  in order via injected `<script>` tags, then mounts `markup` HTML. Guarded by
  `window.__thingsStarted` (StrictMode-style double-mount protection is manual).
- `app/markup.js` → one JS module exporting a **single-line HTML string** for the
  whole studio shell. Edit carefully; keep it one escaped string.
- `app/layout.js` → fonts + metadata. `app/globals.css` → all studio styles.
- `next.config.mjs` → `reactStrictMode: false`. Do not enable: the engine's
  mount/destroy cycle assumes single mount.
- `public/three.min.js` → pinned three.js r128, must load before the engine.
- `public/things.umd.js` → the engine (~1600 lines). Exposes `window.Things`:
  `{ version, create, mount, normalize, merge, randomize, presets, defaults,
  schema, options, fabrics, swatches, states, qualities, structKeys }`.
  Avatar handle: `setConfig/getConfig/setState/setMouth/setAutoLook/poke/shake/
  snapshot/snapshotBlob/on/resize/destroy` (+ `lipSync/stopLipSync`).
- `public/studio.js` → editor wiring (~290 lines): history (undo/redo, cap 80),
  schema-driven controls, tab `GROUPS`, Motion pane, Export pane (`renderCode`),
  preset rail, toolbar. `GROUPS` selects which `K.schema` keys are shown.
- **Chat / AEO layer** (separate from the engine; server code is ES modules, `.mjs`):
  - `public/things-chat.js` → embeddable widget (plain script, shadow DOM, `window.ThingsChat`).
  - `packages/things/` → the npm package `@rothenhall/things` (CLI in `bin/`, React in `src/react.js`). Its `dist/` and `collector/` are copies made by `scripts/sync-package.mjs` (git-ignored; edit the originals in `public/`, `lib/`, `server/`). Run `npm run package:sync` after changing those.
  - `docs/` → user documentation; `docs/README.md` is the index. Keep `docs/CONFIG_REFERENCE.md` in sync with `.env.example` and `Things.schema`.
  - `lib/router.mjs` → framework-agnostic request router (chat, track, admin, llms.txt, md, schema).
    Used by BOTH `lib/next-adapter.mjs` (Next route handlers in `app/api/[...slug]`, `app/admin`,
    `app/llms*.txt`, `app/robots.txt`, `app/sitemap.xml`, `app/md`) and `server/collector.mjs`
    (zero-dependency standalone server). Add routes in the router, not in two places.
  - `lib/content.mjs` (markdown/sitemap → chunks → BM25), `lib/answer.mjs` (extractive or LLM),
    `lib/bots.mjs` (UA/referrer lists; **Edge-safe, no Node imports**, used by `middleware.js`),
    `lib/seo.mjs`, `lib/dashboard.mjs`, `lib/store.mjs` (JSONL in `DATA_DIR`), `lib/env.mjs` (all env vars).
  - `content/*.md` → site content; `app/[...slug]/page.js` renders them as HTML twins.
  - `middleware.js` → logs AI-crawler hits and rewrites bots to `/md/...`. Route handlers behind a
    rewrite see the ORIGINAL url, so the md route passes its path explicitly.
  - Tests: `npm test` (node:test, `test/`). New env vars go in `.env.example` and `docs/SELF_HOSTING.md`.
  - Product rule: stays free to self-host. No telemetry, no required paid service, no license checks.
- `HOW_TO_USE.md` → user docs + library API + npm-publish guide.
- `README.md` → public front page (repo: https://github.com/Rothenhall/Things).
  `LICENSE` → MIT © Rothenhall.
- In-page `Guide` tab (`public/studio.js`, `panes.Guide`) mirrors the README
  basics + embed snippet. Keep the two in sync when either changes.

## Conventions and gotchas

- **Do not bundle `public/*.js` into Next imports.** They are served as static
  files and depend on load order (`THREE` global first). Edit them in place and
  verify with `node --check`; refresh the browser (hard refresh — aggressive
  caching + `localStorage` key `things-v2` can mask your change).
- **Hair feature was removed.** `buildHair()` in `things.umd.js` returns `null`,
  the Hair tab is out of `GROUPS`, random + Willow preset force `hair: 'none'`.
  Do not reintroduce it. Known leftover: dead hair entries still in `OPTIONS`,
  `SWATCHES`, `SCHEMA` (lines ~205–207), `DEFAULTS`, and `QUALITY.hairSeg` —
  safe to delete when touching those areas. `deco: 'hairbow'` ("Hair bow") is a
  separate accessory; rename to "Bow" if editing nearby.
- **`merge()` fabric behavior:** picking a fabric fills its `FUR_KEYS` values;
  touching any fur slider flips `fabric` to `'custom'` (not in `OPTIONS.fabric`,
  so no chip shows selected — known UI wart, not a bug in the engine).
- **Structural vs live keys:** `STRUCT_KEYS = ['shape','ears','arms','feet',
  'tail','muzzle','seed']` trigger rebuild; everything else updates live.
- **`cheekSpacing`** exists in `DEFAULTS` but has no `SCHEMA` entry (uneditable,
  still serialized). Expose it or delete it; don't add a second source of truth.
- **Export snippets:** `renderCode()` in `public/studio.js` generates React/Next
  snippets importing `'things/react'`, which is **not a published package** —
  aspirational until the library is published (see `HOW_TO_USE.md` §6).
- **Presets:** 9 entries via `fab()` in `things.umd.js` (search `PRESETS`), built
  on `FABRICS` + overrides. `mountAvatar(saved.config || 'pebble')` is the
  default character.
- Keep edits minimal and local: no new deps, no TS migration, no refactors
  beyond the requested change. Match the existing vanilla-JS style in `public/`.
