# Adding Things to your site, by platform

Every platform needs the same thing: one `<script>` tag before `</body>`. What differs is where you put it and where the widget file lives. First decide which of the two file-hosting styles you will use.

| Style | Tag looks like | Use when |
|---|---|---|
| **A. Files in your project** | `<script src="/things/things-chat.js" data-endpoint="https://things.example.com" ...>` | You control your site's code or static folder. Run `npx @rothenhall/things init` and it copies the files to `public/things/`. |
| **B. Files from your collector** | `<script src="https://things.example.com/things/things-chat.js" ...>` | Hosted builders where you cannot upload files (Webflow, Squarespace, Wix, Shopify, many WordPress hosts). The collector serves the three files itself, and the widget defaults its endpoint to the same address. |
| **C. Files from a CDN** | `<script src="https://cdn.jsdelivr.net/npm/@rothenhall/things@1/dist/things-chat.js" data-endpoint="https://things.example.com" ...>` | After the package is published. No upload and no collector hosting. |

Get your exact tag from the studio (**Use it > Embed on your site**) or `npx @rothenhall/things snippet --config ./character.json --endpoint https://things.example.com`. In the examples below `TAG` stands for that tag.

Before going live check [Content Security Policy](WIDGET_REFERENCE.md#content-security-policy) if your site sends one.

---

## Plain HTML

Paste the tag before `</body>` in every page (or in your shared footer include).

```html
    ...
    <script src="/things/things-chat.js"
      data-endpoint="https://things.example.com"
      data-preset="plum"
      async></script>
  </body>
</html>
```

## Next.js

### App router (recommended)

Run `npx @rothenhall/things init` in the project (it detects `public/`). Then use `next/script` in `app/layout.js` so the widget loads on every page:

```jsx
import Script from 'next/script';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Script
          src="/things/things-chat.js"
          strategy="afterInteractive"
          data-endpoint="https://things.example.com"
          data-preset="plum"
        />
      </body>
    </html>
  );
}
```

For a custom character pass its JSON as a string:

```jsx
<Script src="/things/things-chat.js" strategy="afterInteractive"
  data-endpoint="https://things.example.com"
  data-config={JSON.stringify(character)} />
```

Or install the package and use the component (a client component, so it can sit in a server layout):

```jsx
import { ThingsMascot } from '@rothenhall/things/react';
// in the layout body:
<ThingsMascot endpoint="https://things.example.com" preset="plum" />
```

### Pages router

Put the same `<Script>` in `pages/_app.js`.

### Crawler visibility

Crawlers do not run JavaScript, so on a Next.js site you own also copy [`middleware.js`](../middleware.js) from the Things repository and set `COLLECTOR_URL=https://things.example.com`. It reports AI crawler hits and can serve markdown to them.

## React (Vite, Create React App)

Run `npx @rothenhall/things init` (it finds `public/`), then:

```jsx
import { ThingsMascot } from '@rothenhall/things/react';

export default function App() {
  return (
    <>
      <YourApp />
      <ThingsMascot endpoint="https://things.example.com" preset="plum" />
    </>
  );
}
```

`ThingsMascot` renders nothing itself; it loads `/things/things-chat.js` and removes the widget on unmount. React StrictMode's double mount is handled.

To put a character in your layout instead of the corner, use `ThingsAvatar` ([NPM_PACKAGE.md](NPM_PACKAGE.md#thingsavatar-a-character-inside-your-layout)).

## Vue 3 / Nuxt

Plain tag in `index.html` (Vite) works:

```html
<script src="/things/things-chat.js" data-endpoint="https://things.example.com" data-preset="plum" async></script>
```

For Nuxt, add it in `nuxt.config`:

```js
export default defineNuxtConfig({
  app: {
    head: {
      script: [{
        src: '/things/things-chat.js', async: true,
        'data-endpoint': 'https://things.example.com', 'data-preset': 'plum'
      }]
    }
  }
});
```

Files go in `public/things/` (`npx @rothenhall/things init`).

## Svelte / SvelteKit

Static files live in `static/`; `init` detects it. Put the tag in `src/app.html` before `%sveltekit.body%`'s closing `</body>`:

```html
<script src="/things/things-chat.js" data-endpoint="https://things.example.com" data-preset="plum" async></script>
```

## Astro

Files go in `public/things/`. In your layout (`src/layouts/Layout.astro`), before `</body>`:

```astro
<script is:inline src="/things/things-chat.js"
  data-endpoint="https://things.example.com" data-preset="plum" async></script>
```

`is:inline` stops Astro from bundling the file, which would break the widget's path lookups.

## Eleventy, Hugo, Jekyll and other static generators

Put the files in the folder your generator copies verbatim (`static/` in Hugo, the passthrough folder in Eleventy, the site root in Jekyll), run `npx @rothenhall/things init --dir <that folder>`, and add the tag to your base layout.

## WordPress

You need the tag on every page without editing theme files directly (a theme update would erase that).

1. Install a header/footer plugin such as "WPCode" or "Insert Headers and Footers".
2. Add the tag to the **Footer** section. Use style B, with the collector hosting the files (WordPress hosts often cannot serve a `/things/` folder from your site root):

   ```html
   <script src="https://things.example.com/things/things-chat.js"
     data-preset="plum" async></script>
   ```

3. Save and view your site in a private window.

If you can upload files by FTP, you can use style A: copy `public/things/` from a project where you ran `init` into your site's root as `/things/`.

## Shopify

1. Online Store > Themes > **Edit code** > `layout/theme.liquid`.
2. Paste the tag above `</body>` using style B or C (Shopify cannot serve an arbitrary `/things/` folder; theme assets get a CDN path that is awkward to reference).
3. Save and check the storefront.

Test in a duplicate theme first.

## Webflow

Project settings > **Custom code** > **Footer code**. Paste the tag (style B or C), then publish. Custom code usually needs a paid Site plan; check Webflow's current plans.

## Squarespace

Settings > Advanced > **Code Injection** > **Footer**. Paste the tag (style B or C). Code injection is usually limited to higher plans; check Squarespace's current plans.

## Wix

Settings > Custom code > **Add custom code**, paste the tag, place it in **Body - end**, apply to all pages. Custom code usually needs a Premium plan; check Wix's current plans. If the tag does not appear, check that the code is set to load on all pages and not only the home page.

## Ghost

Settings > Code injection > **Site Footer**. Paste the tag (style B or C).

## Google Tag Manager

Create a **Custom HTML** tag with the `<script>` tag, trigger **All Pages** (or **Window Loaded**). Note that GTM loads the script after the page, which is fine for the widget, and that consent banners that block GTM tags will also block the widget until accepted.

## Any other site builder

If it has a "custom code" or "embed" feature that accepts `<script>` tags, paste the tag there using style B or C. If it only accepts an HTML embed block, the widget needs a full-page script, so it will not work: the corner widget attaches itself to the page, not to a block.

---

## Only show it on some pages

The widget starts wherever the tag is. To limit it, add the tag only to those templates, or start it yourself:

```html
<script src="/things/things-chat.js" data-manual async></script>
<script>
  window.addEventListener('load', () => {
    if (location.pathname.startsWith('/shop')) {
      ThingsChat.init({ endpoint: 'https://things.example.com', preset: 'plum' });
    }
  });
</script>
```

## After a cookie banner

If you need consent before the character loads (or before any tracking), use `data-manual` and call `ThingsChat.init()` from your consent handler. The widget sets no cookies and uses no storage, but it does send questions and AI-referral records to your collector, so many sites treat it as functional rather than marketing. Check this with your own legal advice.

## Testing checklist

1. Open your site in a private window: the character appears in the corner within two seconds.
2. Open the browser console: no red errors mentioning `things`, CORS or CSP.
3. Click the character, ask a question: an answer appears.
4. Check the dashboard (**What visitors ask most**) on the machine running the collector.
5. Test AI-referral tracking by adding `?utm_source=chatgpt.com` to a page URL, staying a few seconds and closing the tab: a record appears under **Visits from AI answers**.

If something fails, [TROUBLESHOOTING.md](TROUBLESHOOTING.md) has a symptom table.
