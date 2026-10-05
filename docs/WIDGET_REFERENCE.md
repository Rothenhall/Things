# Widget reference: `things-chat.js`

The widget is one plain JavaScript file with no build step. It puts a character in a corner of the page, optionally opens a chat panel, and reports AI-referral visits to your collector. It lives in a shadow root, so your page's CSS cannot break it and it cannot break your page.

```html
<script src="/things/things-chat.js"
  data-endpoint="https://things.example.com"
  data-preset="pebble"
  async></script>
```

## How it starts

1. The browser loads the script. It reads its own `data-*` attributes.
2. It adds one `<div data-things-chat>` to the end of `<body>` and builds the character, bubble and (in chat mode) the panel inside its shadow root.
3. If the browser has WebGL, it loads `three.min.js` and `things.umd.js` (from `data-assets`, which defaults to the folder the script came from) unless `window.THREE` and `window.Things` already exist, then draws the character.
4. If `data-track` is not `false`, it checks whether this visit came from an AI answer (see [Tracking](#tracking)).
5. If `data-schema="true"`, it fetches JSON-LD for the current page from your collector and adds it to `<head>`.

Add `data-manual` to stop step 1 from starting automatically and call `ThingsChat.init({...})` yourself.

## Attributes

| Attribute | Default | Description |
|---|---|---|
| `data-endpoint` | origin the script was loaded from | Base URL of your collector, no trailing slash. Chat questions go to `<endpoint>/api/chat` and tracking to `<endpoint>/api/track`. **Set it whenever the widget file is not served by your collector**, in every mode including decoration-only (tracking still needs it). |
| `data-preset` | `pebble` | A preset id: `mallow`, `plum`, `mint`, `tango`, `pebble`, `cosmo`, `poppy`, `dew`, `truffle`. |
| `data-config` | none | A custom character exported from the studio, as a JSON object in the attribute. Takes precedence over `data-preset`. Invalid JSON is ignored and the preset is used. In HTML wrap the value in single quotes and write `&#39;` for an apostrophe and `&amp;` for an ampersand (the studio and `things snippet` do this for you). |
| `data-chat` | on | `false` = decoration only: no chat panel, no bubble, no questions sent. The character waves when it loads and does a short jump when clicked. |
| `data-title` | `Ask me` | Chat panel header; also the accessible name. |
| `data-greeting` | `Hi! Ask me anything about this site.` | The bubble next to the character and the first chat message. |
| `data-position` | `right` | `left` or `right` (bottom corner). |
| `data-color` | `#a85c30` | Accent colour for buttons, focus rings and visitor messages. Any CSS colour. |
| `data-key` | none | Sent as the `x-things-key` header. Must equal `SITE_KEY` on the collector if you set one. |
| `data-track` | on | `false` disables AI-referral tracking. |
| `data-schema` | off | `true` injects JSON-LD from `<endpoint>/api/schema`. |
| `data-assets` | folder of the script | Base URL for `three.min.js` and `things.umd.js`. |
| `data-manual` | absent | Do not start automatically. |

## JavaScript API

The script defines `window.ThingsChat`:

```js
ThingsChat.init(options)   // start (returns ThingsChat). Does nothing if already running.
ThingsChat.open()          // open the chat panel (chat mode only)
ThingsChat.close()         // close it
ThingsChat.destroy()       // remove the widget and release the 3D context
```

`options` use the same names as the attributes without `data-`: `endpoint`, `preset`, `title`, `greeting`, `key`, `position`, `color`, `track`, `schema`, `chat`, `assets`, plus `preset` may be a character **object** (the same value you would put in `data-config`).

```js
// start it yourself, for example after a cookie banner is accepted
// <script src="/things/things-chat.js" data-manual async></script>
window.addEventListener('load', () => {
  ThingsChat.init({
    endpoint: 'https://things.example.com',
    preset: { shape: 'gumdrop', color: '#7B4DFF', hat: 'beanie' },
    title: 'Ask Plum',
    chat: true
  });
});
```

If the script is added to the page again (a React remount, a single-page-app navigation) after `destroy()`, it starts a fresh widget from the new tag's attributes.

## What the visitor sees

**Chat mode.** A 120 px circular character in the corner and a small bubble with your greeting. Clicking the character or the bubble opens a 340 px panel (full width minus 32 px on narrow screens) and the character waves. The visitor types a question, presses Enter or **Ask**, and sees three animated dots while the character shows "thinking". The answer appears, the character "talks" for a few seconds (longer for longer answers), and up to two source links appear under it. If the collector cannot be reached the character says it cannot reach its brain and falls asleep.

**Decoration mode.** Only the character. It waves once when it loads and jumps when clicked.

**No WebGL.** Chat mode shows a small round **Ask** button instead of the character; chat works normally. Decoration mode shows nothing.

## Accessibility

- The character is a focusable button (`role="button"`, Tab to reach it, Enter or Space to open the chat). In decoration mode it is a labelled image.
- The panel is `role="dialog"`; Escape closes it; the answers area is an `aria-live="polite"` region, so screen readers announce replies.
- Focus moves to the question box when the panel opens and back to the character when you close it with the × button.
- The animated dots stop for visitors who prefer reduced motion.
- Text uses the system font at 14 px and the colours meet normal contrast on the panel's light background. If you set a very light `data-color`, check the contrast of the white button text yourself.

## Tracking

Only visits that arrive **from an AI answer** are recorded, so the widget stays silent for everyone else. A visit counts when the page's `document.referrer` host belongs to ChatGPT, Perplexity, Claude, Gemini, Copilot, You.com, Phind, Meta AI, Grok, DeepSeek or Le Chat, or when `?utm_source=` contains `chatgpt`, `openai`, `perplexity`, `claude`, `gemini`, `copilot`, `grok` or `deepseek` (ChatGPT adds `utm_source=chatgpt.com` to the links it shows).

For those visits the widget sends a `start` record when the page loads and an `end` record when the tab is hidden or closed, containing the page path, the referrer, the `utm_source`, the seconds on the page and whether the visitor scrolled, clicked or typed. It uses `navigator.sendBeacon` with a plain-text body (no CORS preflight) and falls back to `fetch` with `keepalive`. No cookies are set and no storage is used; the visit id is a random string held only in memory.

A visit is a **bounce** when it lasted under 10 seconds with no interaction. Visits where the `end` record never arrived are left out of the bounce rate.

Limits: many AI products remove the referrer, so some visits cannot be seen. See [AGENT_READINESS.md](AGENT_READINESS.md).

## Network requests the widget makes

| When | Request | Why |
|---|---|---|
| Page load, if WebGL and not already present | `GET <assets>/three.min.js`, `GET <assets>/things.umd.js` | Draw the character. Cached by the browser. |
| Question asked | `POST <endpoint>/api/chat` (JSON) | Get an answer. |
| AI-referred visit | `POST <endpoint>/api/track` (text/plain JSON) | Record the visit. |
| `data-schema="true"` | `GET <endpoint>/api/schema?path=...` | JSON-LD. |

Nothing else. No third-party requests, no analytics services, no fonts.

## Content Security Policy

If your site sends a CSP header, allow:

| Directive | Allow | For |
|---|---|---|
| `script-src` | the origin that serves `things-chat.js`, `things.umd.js` and `three.min.js` | loading the widget and engine |
| `connect-src` | your collector's origin | chat and tracking |
| `style-src` | `'unsafe-inline'` | the widget injects one `<style>` element into its shadow root; a CSP without `'unsafe-inline'` for styles blocks it and the widget will look unstyled |
| `worker-src`, `img-src` | nothing extra | the character is drawn on a canvas; no images or workers are used |

## Performance

- The widget file is about 16 KB; the engine about 108 KB; three.js about 600 KB. All are cacheable static files.
- Rendering uses one WebGL canvas of about 120 by 120 CSS pixels. The engine draws at high quality by default; it adapts to the device pixel ratio (capped at 2).
- Loading is `async` and never blocks your page.
- On a page that already loads three.js r128 as `window.THREE`, the widget reuses it instead of downloading another copy. Other three.js versions are not guaranteed to work with the engine.

## Loading the widget from the collector

The collector serves the three files under `/things/`:

```html
<script src="https://things.example.com/things/things-chat.js" data-preset="plum" async></script>
```

Because the widget defaults `data-endpoint` to the origin it was loaded from, this one tag is enough: no `data-endpoint`, no `init`, no upload step. It is the easiest option for hosted site builders that cannot store files.

## Troubleshooting

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md#the-widget).
