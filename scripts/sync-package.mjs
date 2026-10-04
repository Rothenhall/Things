#!/usr/bin/env node
// Copies the engine, widget and collector from the repo root into packages/things so the npm package
// ships exactly what the site runs. The copies are git-ignored; this runs automatically on `npm pack` / `npm publish`.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = path.join(root, 'packages', 'things');
const copy = (from, to) => { fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(from, to); };

fs.rmSync(path.join(pkg, 'dist'), { recursive: true, force: true });
fs.rmSync(path.join(pkg, 'collector'), { recursive: true, force: true });

for (const f of ['things.umd.js', 'three.min.js', 'things-chat.js']) copy(path.join(root, 'public', f), path.join(pkg, 'dist', f));
// The engine is a UMD/CommonJS file; keep it CommonJS even though the package itself is ESM.
fs.writeFileSync(path.join(pkg, 'dist', 'package.json'), '{ "type": "commonjs" }\n');

for (const dir of ['lib', 'server']) {
  for (const f of fs.readdirSync(path.join(root, dir))) if (f.endsWith('.mjs')) copy(path.join(root, dir, f), path.join(pkg, 'collector', dir, f));
}
copy(path.join(root, 'snippets', 'cloudflare-worker.js'), path.join(pkg, 'templates', 'cloudflare-worker.js'));
copy(path.join(root, 'LICENSE'), path.join(pkg, 'LICENSE'));
console.log('things package synced: dist/, collector/, templates/cloudflare-worker.js, LICENSE');
