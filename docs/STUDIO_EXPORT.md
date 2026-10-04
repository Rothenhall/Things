# From the studio to your live site

This guide follows one character from the studio to a website you own, with the chat answering questions and a dashboard on your own machine showing what visitors ask. It takes about 15 minutes. Every step says what you should see, so you can tell it worked.

```
  Studio                     Your project                      Your machine / server
 ┌──────────────┐  save    ┌─────────────────────────┐       ┌──────────────────────────┐
 │ design the   │ ───────► │ npx @rothenhall/things  │       │ npx @rothenhall/things   │
 │ character    │  .json   │ init --config plum.json │       │ collector                │
 └──────────────┘          │                         │       │                          │
                           │ public/things/*.js      │       │ things-content/*.md      │
                           │ things.env              │ ────► │ things-data/*.jsonl      │
                           │ <script> tag on pages   │ chat  │ dashboard  /admin        │
                           └───────────┬─────────────┘ track └──────────────────────────┘
                                       │ loads in the visitor's browser
                                       ▼
                                  your website
```

## 1. Design your character

Open the studio (`npm run dev` in the Things repo and visit http://localhost:3000/studio, or your own deployed copy).

- **Characters** (top of the side panel): start from one of the nine presets.
- **Body**: silhouette, ears, arms, feet, tail, muzzle, colours, markings.
- **Fur**: fabric (velvet, minky, fleece, mohair, shaggy, felt) and the pile sliders.
- **Face**: eyes (safety, oval, stitched, happy, googly), nose, mouth, cheeks.
- **Outfit**: hat, neckwear, glasses, decoration.
- **Motion**: try the moods and boop the character. The mood you leave it in is the one used in the exported React code.

Click the character name at the top to rename it. Undo and redo with Ctrl+Z and Ctrl+Shift+Z. **Surprise me** makes a random one. Your work is saved in your browser automatically, so closing the tab does not lose it.

Every setting is described in [CONFIG_REFERENCE.md](CONFIG_REFERENCE.md#character-settings).

## 2. Open "Use it" and choose how it will behave

Open the **Use it** tab. It has three sections:

| Section | Use it for |
|---|---|
| **Save** | A PNG photo of the character, or the character file (`.json`) that you can load back into the studio later. |
| **Put it in your app** | Code that draws the character inside your own React, Next.js or HTML layout (not the corner widget). |
| **Embed on your site** | The corner widget with optional chat and analytics. This guide uses this one. |

In **Embed on your site** choose a mode:

| Mode | What visitors get | What you learn |
|---|---|---|
| **Chat + insights** | The character answers their questions from your content. | What visitors ask most, what you could not answer, AI crawler and AI-referral traffic. |
| **Decoration only** | The character sits in the corner and reacts when clicked. No chat, no questions. | AI crawler and AI-referral traffic. |

Then fill in **Address of your collector**. While testing on your own computer leave it as `http://localhost:8787`. For your live site it must be the public https address of your collector (see [DEPLOYMENT.md](DEPLOYMENT.md)); you can change it later.

You will see a `<script>` tag like this, with your character embedded in it:

```html
<script src="/things/things-chat.js"
  data-endpoint="http://localhost:8787"
  data-config='{"name":"Plum","shape":"gumdrop","color":"#7B4DFF","hat":"beanie"}'
  async></script>
```

Press **Save character file**. You get `plum.json` (named after your character).

## 3. Install it into your site

Move `plum.json` into your website project, open a terminal there and run the command shown under **Or set it all up with one command**:

```bash
npx @rothenhall/things init --config ./plum.json --endpoint http://localhost:8787
```

Add `--site-url https://your-site.com` so the settings file starts with your real address. For a capture-only setup the studio shows `--no-chat` instead of `--endpoint`; add `--endpoint` as well, because tracking still reports to your collector.

You should see:

```
Setting up Things  (.)
  copied  public\things\things-chat.js, public\things\things.umd.js, public\things\three.min.js
  created things.env (contains your ADMIN_TOKEN)
  created things-content/index.md (edit this: it is what the chat answers from)
  saved   things.character.json
  ignored things.env, things-data/ in .gitignore
```

and the `<script>` tag to paste. What it did:

| File | Why |
|---|---|
| `public/things/` | The widget and the 3D engine, served by your own site. Commit these. |
| `things.env` | The collector's settings, including your dashboard password. **Do not commit it**; `init` adds it to `.gitignore`. |
| `things-content/index.md` | A starter page. The chat answers only from files in this folder (and an optional sitemap crawl), so replace it with real information about your business. |
| `things.character.json` | A copy of your character, so you can regenerate the snippet later with `things snippet --config things.character.json`. |
| `things-snippet.html` | The `<script>` tag, saved for you. |

The command never overwrites an existing `things.env`, so running it again is safe. Use `--force` to start over.

If your site keeps static files somewhere other than `public/`, `static/`, `www/` or `web/`, pass `--dir path/to/static`.

## 4. Add the tag to your pages

Paste the tag before `</body>` on every page that should show the character. How depends on your stack; see [FRAMEWORKS.md](FRAMEWORKS.md) for Next.js, React, Vue, Svelte, Astro, WordPress, Shopify, Webflow, Squarespace and Wix.

Reload your site. The character appears in the bottom-right corner within a second or two.

## 5. Give the chat something to say

Open `things-content/index.md` and write real answers. The chat finds the best matching passage, so use clear headings that look like the questions people ask:

```markdown
---
title: Shipping
description: Where we ship and how long it takes.
path: /shipping
type: faq
---
# Shipping

## Do you ship to Canada?
Yes. Orders to Canada arrive in 3 to 5 business days.

## How much is delivery?
Delivery is free over $50, otherwise $6.
```

Add more files for more topics. A file with `type: faq` also becomes FAQ markup that search and AI engines understand. You can also set `CONTENT_SITEMAP=https://your-site.com/sitemap.xml` in `things.env` to crawl your live pages. Details: [CONFIG_REFERENCE.md](CONFIG_REFERENCE.md#content-the-chat-answers-from).

## 6. Start the collector and open the dashboard

```bash
npx @rothenhall/things collector
```

You should see:

```
Things collector listening on http://localhost:8787
  content:  1 pages (.../things-content)
  data:     .../things-data
  answers:  extractive (set LLM_API_KEY for natural answers)
  admin:    http://localhost:8787/admin (local only)
```

Open http://localhost:8787/admin and sign in with the `ADMIN_TOKEN` from `things.env`.

Now ask the character a question on your site. It answers, and a moment later the dashboard's **What visitors ask most** table shows your question. Ask something you did not write about and it appears under **Content gaps**.

Run the built-in check at any time:

```bash
npx @rothenhall/things doctor
```

It confirms the widget files, your settings, your content, and that the collector answers. Anything it flags comes with the fix.

## 7. Make answers sound natural (optional)

By default the character quotes the best matching sentences from your content. For fluent answers connect a language model with your own API key. In `things.env`:

```bash
LLM_API_KEY=sk-...          # your OpenAI API key from platform.openai.com
LLM_MODEL=gpt-4o-mini
```

Restart the collector. The model sees only the visitor's question and up to four matching passages from your content, and is told to answer only from them. `CHAT_DAILY_LLM_LIMIT` (default 500 a day) caps your spend. Local models (Ollama) and Anthropic work too; see [CONFIG_REFERENCE.md](CONFIG_REFERENCE.md#answer-engine-optional).

## 8. Go live

Your visitors' browsers must be able to reach the collector, so it needs a public https address and must stay running. [DEPLOYMENT.md](DEPLOYMENT.md) covers every option: a free Cloudflare or Tailscale tunnel from your own computer, a small server, Docker, and keeping it running after a reboot.

Before you launch, set these in `things.env`:

```bash
SITE_URL=https://your-site.com
ALLOWED_ORIGINS=https://your-site.com,https://www.your-site.com
```

then change the `data-endpoint` in your tag to the public address (or run `npx @rothenhall/things snippet --endpoint https://things.your-site.com --config things.character.json`). The full checklist is in [GETTING_STARTED.md](GETTING_STARTED.md#before-you-go-live).

## 9. Change your character later

Edit it in the studio, press **Save character file**, then:

```bash
npx @rothenhall/things snippet --config ./plum.json --endpoint https://things.your-site.com
```

and replace the `<script>` tag on your site with the new output. Nothing else needs to change, and the collector and its data are untouched.

## No build step? Use the collector as the file host

Sites where you cannot upload files (Webflow, Squarespace, Wix, Shopify and similar) can load the widget from your collector instead:

```html
<script src="https://things.your-site.com/things/things-chat.js"
  data-config='{"name":"Plum","shape":"gumdrop","color":"#7B4DFF"}'
  async></script>
```

The collector serves `things-chat.js`, `things.umd.js` and `three.min.js` under `/things/`, and the widget defaults its `data-endpoint` to the address it was loaded from, so one public address is all you need.

## What the studio does and does not do

- The studio runs entirely in your browser. Your character never leaves your computer unless you export it.
- The exported character is plain JSON. You own it and can edit it by hand.
- The corner widget supports the presets and any custom character, in one fixed placement (bottom corner, 120 px). To place a character elsewhere in your layout use **Put it in your app** instead.
- The studio does not connect to your collector. It only generates the tag and command; the connection is made by your site.
