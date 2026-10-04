# Contributing to Things

Thanks for helping. Things is free and MIT licensed, and it stays that way: contributions are accepted under the same license.

By contributing you confirm you wrote the code (or have the right to submit it) and agree it is released under the [MIT License](LICENSE). There is no CLA. We use the [Developer Certificate of Origin](https://developercertificate.org/) spirit: please sign your commits off with `git commit -s` if you can.

## Ground rules

- Be kind. See the [Code of Conduct](CODE_OF_CONDUCT.md).
- Open an issue before a large change so we can agree on the approach.
- Keep edits small and local. No new dependencies, no TypeScript migration, no refactors beyond the change you came to make.
- Things must stay free to self-host: no required paid service, no account, no telemetry or phone-home. Optional integrations (for example an LLM provider) must work off by default.
- Do not reintroduce the removed hair feature.

## Set up

```bash
git clone https://github.com/Rothenhall/things.git
cd things
npm ci
cp .env.example .env     # optional; ADMIN_TOKEN enables /admin
npm run dev              # http://localhost:3000
```

## Where things are

| Path | What |
|---|---|
| `public/things.umd.js` | the 3D engine, a plain script exposing `window.Things` |
| `public/studio.js` | the editor wiring, a plain script |
| `public/things-chat.js` | the embeddable chat widget, a plain script |
| `app/` | the Next.js shell: landing, studio, content pages, route adapters |
| `lib/` | server logic shared by Next.js and the collector (ES modules, no framework imports) |
| `server/` | the standalone collector and the access-log importer |
| `content/` | the markdown the demo site's chat answers from |
| `middleware.js` | AI-crawler logging and markdown responses |

`public/*.js` are loaded with `<script>` tags in a fixed order and must not become bundled imports. Edit them in place and syntax-check with `npm run check`. See [AGENTS.md](AGENTS.md) for the longer list of repo conventions, which apply to people as well as coding agents.

## Before you open a pull request

```bash
npm run check    # syntax-checks the plain scripts and the server
npm test         # unit and router tests (node:test, no extra dependencies)
npm run build    # production build
```

Add a test in `test/` when you change anything in `lib/`. For visual or widget changes, say how you checked them (browser, viewport) in the PR. Hard-refresh the browser when testing `public/*.js`; caching and the `things-v1` localStorage key can hide your change.

## Commit and PR style

- Short imperative subject ("Add rate limit to /api/track"), body explains why.
- One logical change per pull request. PRs are squash-merged.
- Update `docs/`, `README.md` and `.env.example` if you change behavior or configuration, and add a line to `CHANGELOG.md` under "Unreleased".

## Reporting bugs and ideas

Use the issue templates. For security problems follow [SECURITY.md](SECURITY.md) instead of opening an issue.
