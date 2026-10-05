# The npm package: `@rothenhall/things`

One package gives you the widget files, the collector and dashboard, a command-line setup tool, and React components. Nothing is installed globally and there is no account.

> **Status:** the package is built and tested but not published to npm yet ([PUBLISHING.md](PUBLISHING.md)). Until it is, use it from a clone of the repository: run `npm run package:sync`, then `npm install /path/to/things/packages/things` in your project and use `npx things <command>`.

```bash
npx @rothenhall/things init
```

`npx` downloads the package, runs the command, and does not change your `package.json`. If you prefer a dependency in your project (needed for the React components):

```bash
npm install @rothenhall/things
```

Node.js 20.12 or newer is required (`node --version`). The package has one dependency, `three` 0.128.0, which the 3D engine needs. `react` 18 or newer is an optional peer dependency used only by `@rothenhall/things/react`.

## What is in the package

| Path | What it is |
|---|---|
| `bin/things.mjs` | The `things` command. |
| `dist/things-chat.js` | The corner widget (a plain browser script). |
| `dist/things.umd.js` | The 3D engine and the nine preset characters. |
| `dist/three.min.js` | three.js r128, which the engine needs in the browser. |
| `collector/` | The collector server, the dashboard and the markdown/`llms.txt` generators. |
| `src/index.js` | `embedSnippet()`, a helper that builds the `<script>` tag. |
| `src/react.js` | `ThingsAvatar` and `ThingsMascot` React components. |
| `templates/cloudflare-worker.js` | A Cloudflare Worker that reports AI crawler hits for sites you cannot edit. |

## Commands

Run `things --help` for the same list in your terminal. Every command also works as `npx @rothenhall/things <command>`.

### `things init`

Sets up the current project. Safe to run again: it never overwrites `things.env` or your content unless you pass `--force`.

```bash
npx @rothenhall/things init [options]
```

| Option | Default | Meaning |
|---|---|---|
| `--dir <folder>` | first of `public`, `static`, `www`, `web` that exists, else `public` | Where your site serves static files. The widget goes to `<dir>/things/`. |
| `--config <file>` | none | A character file saved from the studio. Stored as `things.character.json` and embedded in the tag. |
| `--preset <id>` | `pebble` | A preset, used when there is no `--config`. |
| `--endpoint <url>` | `http://localhost:<port>` | Public address of your collector. Goes into the tag as `data-endpoint`. |
| `--site-url <url>` | empty | Your site, e.g. `https://example.com`. Written to `SITE_URL`. |
| `--origin <url,...>` | `--site-url`, else `http://localhost:3000` | Written to `ALLOWED_ORIGINS`. |
| `--no-chat` | chat on | Capture-only: the character is decoration. Writes `CHAT_ENABLED=false` and `data-chat="false"`. |
| `--title <text>` | none | Chat header text. |
| `--greeting <text>` | none | First message. |
| `--position <left\|right>` | `right` | Corner. |
| `--color <#hex>` | none | Accent colour. |
| `--port <n>` | `8787` | Collector port, written to `COLLECTOR_PORT`. |
| `--force` | off | Overwrite `things.env` and `things-snippet.html`. |

It performs these steps and reports each one:

1. Copies `things-chat.js`, `things.umd.js` and `three.min.js` into `<dir>/things/`.
2. Creates `things.env` with a random 48-character `ADMIN_TOKEN` (skipped if it exists).
3. Creates `things-content/index.md`, a starter page (skipped if the folder exists).
4. Saves your character to `things.character.json` when you passed `--config`.
5. Adds `things.env` and `things-data/` to `.gitignore` (creating the file if needed).
6. Prints the `<script>` tag and saves it to `things-snippet.html`.

### `things snippet`

Prints the `<script>` tag without touching any files. Use it after you export a changed character.

```bash
npx @rothenhall/things snippet --config ./plum.json --endpoint https://things.example.com
npx @rothenhall/things snippet --preset dew --no-chat --endpoint https://things.example.com
npx @rothenhall/things snippet --src https://cdn.example.com/things/things-chat.js
```

Accepts `--config`, `--preset`, `--endpoint`, `--no-chat`, `--title`, `--greeting`, `--position`, `--color`, and `--src` (where the widget file is served from; default `/things`).

### `things collector`

Starts the collector and dashboard in the foreground.

```bash
npx @rothenhall/things collector [--env things.env] [--port 8787]
```

It uses `things.env` in the current folder, or `.env`, or the file you pass with `--env`. Content and data folders in that file are resolved from the folder you run the command in, so always run it from your project root. Press Ctrl+C to stop. To keep it running after you close the terminal or reboot, see [DEPLOYMENT.md](DEPLOYMENT.md).

### `things doctor`

Checks your setup and exits with status 1 if anything needs fixing, so it also works in CI or a deploy script.

```bash
npx @rothenhall/things doctor [--endpoint https://things.example.com] [--dir public] [--env things.env]
```

It checks the Node version, the widget files, the settings file, the admin token (present and at least 24 characters), `SITE_URL` format, `ALLOWED_ORIGINS`, that chat has content to answer from, whether an answer engine is configured, and whether the collector answers `/api/health` (and how many content pages it loaded). Each result is `OK`, `WARN` (works but you should look) or `FIX` (broken).

### `things update`

Refreshes the widget files in `<dir>/things/` after you upgrade the package:

```bash
npm update @rothenhall/things     # or: npx @rothenhall/things@latest update
npx @rothenhall/things update
```

Restart the collector afterwards: its code updates with the package.

### `things import-log`

Reads an nginx or Apache access log and records the AI crawler requests, for sites where you cannot add middleware or a Worker. Nothing leaves the machine.

```bash
npx @rothenhall/things import-log /var/log/nginx/access.log --since=2026-10-01
```

Run it once per rotated log: it does not de-duplicate if you import the same lines twice.

### `things token`

Prints a new random token, for `ADMIN_TOKEN`.

## React and Next.js

Install the package as a dependency, and run `npx @rothenhall/things init` so `/things/things-chat.js` exists (only needed for `ThingsMascot`).

### `ThingsMascot`: the corner widget

Mount it once near the root of your app. It loads the widget script and cleans up on unmount.

```jsx
'use client'; // Next.js app router
import { ThingsMascot } from '@rothenhall/things/react';

export default function Mascot() {
  return <ThingsMascot endpoint="https://things.example.com" preset="plum" />;
}
```

| Prop | Default | Same as |
|---|---|---|
| `src` | `/things/things-chat.js` | where the widget file is served |
| `endpoint` | script's origin | `data-endpoint` |
| `preset` | `pebble` | `data-preset` |
| `config` | none | `data-config` (an object) |
| `chat` | `true` | `data-chat` |
| `title`, `greeting`, `position`, `color` | none | the matching attributes |
| `apiKey` | none | `data-key` |
| `track` | `true` | `data-track` |
| `schema` | `false` | `data-schema` |
| `assets` | script's folder | `data-assets` |

It renders nothing itself. Changing a prop restarts the widget.

### `ThingsAvatar`: a character inside your layout

Draws a character in a box you size. The 3D engine is bundled with the package, so nothing else is loaded.

```jsx
import { ThingsAvatar } from '@rothenhall/things/react';

<ThingsAvatar
  config="pebble"                 // a preset id or a character object from the studio
  state="waving"                  // idle | thinking | talking | excited | sleepy | waving
  style={{ width: 360, height: 360 }}
  onPoke={() => console.log('booped')}
/>
```

| Prop | Default | Meaning |
|---|---|---|
| `config` | `'pebble'` | Preset id or character object. Changing it updates the character live. |
| `state` | `'idle'` | Mood. Changing it updates live. |
| `quality` | `'high'` | `high`, `medium` or `low`. Lower is lighter on slow phones. |
| `interactive` | `true` | Drag to turn it, click to boop it. |
| `autoLook` | `true` | The eyes follow the pointer. |
| `distance` | engine default | Camera distance; larger makes the character smaller in the box. |
| `onReady(av)` | none | Called with the avatar handle (`setConfig`, `setState`, `poke`, `snapshot`, ...). |
| `onPoke` | none | Called when the character is booped. |
| `style`, `className` | none | For the wrapper `div`. |

On a device without WebGL the box stays empty; give it a fallback in your layout if that matters. In Next.js the component is a client component (`'use client'` is included), so import it into server components freely. The engine is about 108 KB and three.js about 600 KB; both load only when the component mounts.

The default export `Things` is also re-exported (`import { Things } from '@rothenhall/things/react'`) if you need the engine directly: `Things.presets`, `Things.schema`, `Things.randomize()`, `Things.mount(el, config, opts)`.

### `embedSnippet()`

Builds the `<script>` tag in code, for templates and build scripts.

```js
import { embedSnippet } from '@rothenhall/things';

embedSnippet({ endpoint: 'https://things.example.com', preset: 'plum', title: 'Ask Plum' });
embedSnippet({ config: characterJson, chat: false, endpoint: 'https://things.example.com' });
```

Options match the widget attributes: `src`, `endpoint`, `preset`, `config`, `chat`, `title`, `greeting`, `position`, `color`, `key`, `track`, `schema`, `assets`. Values are HTML-escaped.

## Load from a CDN (no install)

After the package is published you can load the widget straight from a CDN, with no build step and no `init`:

```html
<script src="https://cdn.jsdelivr.net/npm/@rothenhall/things@1/dist/things-chat.js"
  data-endpoint="https://things.example.com"
  data-preset="plum"
  async></script>
```

The widget loads `three.min.js` and `things.umd.js` from the same folder. Pin an exact version (`@1.0.0`) if you do not want updates to arrive automatically. The collector still runs on your side.

## Using it in a monorepo or CI

- Pin the version in `package.json` and commit the lockfile.
- `things doctor` exits non-zero when something is wrong, so add it to a deploy script.
- The files `init` copies into `public/things/` are generated: commit them (so deploys do not need npm) or generate them in your build with `things update`.

## Upgrading

```bash
npm update @rothenhall/things
npx @rothenhall/things update       # refresh public/things/
# then restart the collector
```

Your `things.env`, `things-content/` and `things-data/` are never touched by an upgrade. Read [CHANGELOG.md](../CHANGELOG.md) for anything that changes behaviour.

## Uninstalling

Delete `public/things/`, `things.env`, `things-content/`, `things-snippet.html`, `things.character.json` and (if you no longer want the data) `things-data/`, then `npm uninstall @rothenhall/things` and remove the `<script>` tag.

## For maintainers: publishing

See [PUBLISHING.md](PUBLISHING.md).
