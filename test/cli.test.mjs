import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = path.join(root, 'packages', 'things', 'bin', 'things.mjs');
execFileSync(process.execPath, [path.join(root, 'scripts', 'sync-package.mjs')], { stdio: 'ignore' });
const run = (cwd, ...args) => execFileSync(process.execPath, [cli, ...args], { cwd, encoding: 'utf8', env: { ...process.env, NO_COLOR: '1' } });

test('embedSnippet: preset, custom config, decoration-only, escaping', async () => {
  const { embedSnippet } = await import('../packages/things/src/index.js');
  const a = embedSnippet({ endpoint: 'https://t.example', preset: 'plum' });
  assert.match(a, /data-endpoint="https:\/\/t\.example"/);
  assert.match(a, /data-preset="plum"/);
  const b = embedSnippet({ config: { name: "O'Neil & Co", color: '#fff' }, chat: false, track: false, schema: true });
  assert.match(b, /data-config='\{"name":"O&#39;Neil &amp; Co","color":"#fff"\}'/);
  assert.match(b, /data-chat="false"/);
  assert.match(b, /data-track="false"/);
  assert.match(b, /data-schema="true"/);
  assert.ok(!/data-preset/.test(b));
  assert.match(embedSnippet({ title: 'A "quoted" <b>' }), /data-title="A &quot;quoted&quot; &lt;b>"/);
});

test('cli init: copies the widget, writes settings, keeps secrets out of git, never overwrites', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'things-cli-'));
  await fs.mkdir(path.join(dir, 'public'));
  await fs.writeFile(path.join(dir, 'plum.json'), JSON.stringify({ things: '1.0', color: '#7B4DFF', shape: 'gumdrop' }));
  const out = run(dir, 'init', '--config', 'plum.json', '--site-url', 'https://example.com', '--endpoint', 'https://things.example.com');
  for (const f of ['things-chat.js', 'things.umd.js', 'three.min.js']) await fs.access(path.join(dir, 'public', 'things', f));
  const env = await fs.readFile(path.join(dir, 'things.env'), 'utf8');
  assert.match(env, /ADMIN_TOKEN=[a-f0-9]{48}/);
  assert.match(env, /ALLOWED_ORIGINS=https:\/\/example\.com/);
  assert.match(env, /CHAT_ENABLED=true/);
  assert.match(await fs.readFile(path.join(dir, '.gitignore'), 'utf8'), /things\.env/);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(dir, 'things.character.json'), 'utf8')), { color: '#7B4DFF', shape: 'gumdrop' });
  assert.match(out, /data-endpoint="https:\/\/things\.example\.com"/);
  assert.match(out, /data-config='\{"color":"#7B4DFF","shape":"gumdrop"\}'/);
  // a second run keeps the existing settings (and the token)
  run(dir, 'init');
  assert.equal(await fs.readFile(path.join(dir, 'things.env'), 'utf8'), env);
});

test('cli init --no-chat writes a capture-only config and still points tracking at the collector', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'things-cli-'));
  const out = run(dir, 'init', '--no-chat', '--preset', 'mint');
  assert.match(await fs.readFile(path.join(dir, 'things.env'), 'utf8'), /CHAT_ENABLED=false/);
  assert.match(out, /data-chat="false"/);
  assert.match(out, /data-endpoint="http:\/\/localhost:8787"/);
  assert.match(out, /data-preset="mint"/);
});

test('cli: token, snippet, version, unknown command', () => {
  assert.match(run(root, 'token').trim(), /^[a-f0-9]{48}$/);
  assert.match(run(root, 'snippet', '--endpoint', 'https://x.test', '--preset', 'dew'), /data-preset="dew"/);
  assert.match(run(root, '--version').trim(), /^\d+\.\d+\.\d+$/);
  assert.throws(() => run(root, 'nope'), /Unknown command/);
});
