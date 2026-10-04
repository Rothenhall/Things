# Publishing the npm package (for maintainers)

The package lives in `packages/things/`. It is not published yet. This page is the checklist for the first release and every one after.

## How the package is built

`packages/things/` holds hand-written files (`bin/`, `src/`, `package.json`, `README.md`, `templates/`). The engine, widget and collector are **copied** from the rest of the repository so the package ships exactly what the site runs:

| Copied to | From |
|---|---|
| `packages/things/dist/` | `public/things.umd.js`, `public/three.min.js`, `public/things-chat.js` |
| `packages/things/collector/lib/`, `collector/server/` | `lib/*.mjs`, `server/*.mjs` |
| `packages/things/templates/cloudflare-worker.js` | `snippets/cloudflare-worker.js` |
| `packages/things/LICENSE` | `LICENSE` |

`scripts/sync-package.mjs` does the copying. It runs automatically as the package's `prepack` step (so `npm pack` and `npm publish` are always current), and you can run it by hand with `npm run package:sync`. The copies are git-ignored; edit the originals, never the copies.

## One-time setup

1. **Pick the name.** The package is named `@rothenhall/things`. A scoped name needs a matching npm organisation: create the `rothenhall` organisation on npmjs.com (free for public packages), or change `"name"` in `packages/things/package.json` to something you own (and update the docs: search for `@rothenhall/things`).
2. **Check the repository fields** in `packages/things/package.json` (`repository`, `homepage`, `bugs`) point to the real repository.
3. **Sign in:** `npm login`. Turn on two-factor authentication for publishing.

## Before every release

```bash
npm ci
npm run check          # syntax-checks the browser scripts and the collector
npm test               # unit tests, including the CLI and package helpers
npm run package:sync
cd packages/things
npm pack --dry-run     # lists exactly what will be published
```

Check the file list: it should contain `bin/`, `src/`, `dist/`, `collector/`, `templates/`, `README.md`, `LICENSE` and `package.json`, and nothing else (no `.env`, no `data/`, no tests).

Then try the packed tarball the way a user would:

```bash
npm pack --pack-destination /tmp
mkdir /tmp/try && cd /tmp/try && npm init -y && mkdir public
npm install /tmp/rothenhall-things-1.0.0.tgz
npx things init --no-chat
npx things collector --port 8799 &
npx things doctor --endpoint http://localhost:8799
```

`doctor` should end with "Everything looks good" (a warning about `LLM_API_KEY` is normal).

## Version and changelog

Follow [Semantic Versioning](https://semver.org/): a fix is a patch, a new option a minor, a breaking change to the tag attributes, the settings file or the log format a major. Update the version in `packages/things/package.json` and add an entry under a new heading in [CHANGELOG.md](../CHANGELOG.md).

The package version is separate from the studio's `package.json`. `src/index.js` exports a `version` constant used by the CLI; keep it equal to the package version.

## Publish

```bash
cd packages/things
npm publish          # scoped public packages are public by default here (publishConfig.access = public)
```

Then tag the release in git (`git tag v1.0.0 && git push --tags`) and create a GitHub release with the changelog entry.

## After publishing

- In an empty folder run `npx @rothenhall/things@latest --version` and `npx @rothenhall/things@latest init` to confirm the published package works.
- Check the CDN path in [NPM_PACKAGE.md](NPM_PACKAGE.md#load-from-a-cdn-no-install) works: `https://cdn.jsdelivr.net/npm/@rothenhall/things@1/dist/things-chat.js` (jsDelivr can take a few minutes to see a new version).
- Recommend pinning in docs for anyone who needs reproducible builds.

## Provenance (recommended)

Publish from CI with provenance so users can verify the package was built from this repository:

```yaml
# .github/workflows/publish-package.yml (not included yet)
permissions: { contents: read, id-token: write }
steps:
  - uses: actions/checkout@v4
  - uses: actions/setup-node@v4
    with: { node-version: 22, registry-url: 'https://registry.npmjs.org' }
  - run: npm ci && npm run check && npm test
  - run: npm publish --provenance --access public
    working-directory: packages/things
    env: { NODE_AUTH_TOKEN: '${{ secrets.NPM_TOKEN }}' }
```

## Deprecating or unpublishing

Prefer `npm deprecate @rothenhall/things@"<1.0.1" "reason"` over unpublishing. npm only allows unpublishing in the first 72 hours or when nothing depends on it.
