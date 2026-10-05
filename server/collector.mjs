#!/usr/bin/env node
// Things collector: a zero-dependency server you run on your own PC or server.
// It answers visitor questions, records content gaps and AI traffic, and serves the admin dashboard,
// llms.txt and markdown pages. The chat widget on any website can point at it (data-endpoint=...).
//
//   npm run collector          -> http://localhost:8787
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handle } from '../lib/router.mjs';
import { getConfig } from '../lib/env.mjs';
import { getContent } from '../lib/content.mjs';

try { process.loadEnvFile(process.env.THINGS_ENV_FILE || '.env'); } catch (e) { /* no .env file, use the real environment */ }

const PORT = Number(process.env.COLLECTOR_PORT || process.env.PORT || 8787);
const HOST = process.env.COLLECTOR_HOST || '0.0.0.0';
const MAX_BODY = 16 * 1024;

// The collector also serves the widget files, so one public address is enough for sites you cannot upload files to:
//   <script src="https://YOUR-COLLECTOR/things/things-chat.js" data-preset="pebble"></script>
// Package layout: collector/server -> ../../dist.  Repo layout: server -> ../public.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ASSET_DIRS = [path.resolve(HERE, '../../dist'), path.resolve(HERE, '../public')];
const ASSETS = new Set(['things-chat.js', 'things.umd.js', 'three.min.js']);
function serveAsset(url, res) {
  const m = /^\/things\/([a-z0-9.-]+)$/i.exec(url.pathname);
  if (!m || !ASSETS.has(m[1])) return false;
  for (const dir of ASSET_DIRS) {
    const file = path.join(dir, m[1]);
    if (fs.existsSync(file)) {
      res.writeHead(200, { 'content-type': 'application/javascript; charset=utf-8', 'cache-control': 'public, max-age=3600', 'x-content-type-options': 'nosniff' });
      res.end(fs.readFileSync(file));
      return true;
    }
  }
  return false;
}

const server = http.createServer((req, res) => {
  const chunks = [];
  let size = 0;
  req.on('data', (c) => {
    size += c.length;
    if (size <= MAX_BODY) chunks.push(c);
  });
  req.on('end', async () => {
    if (size > MAX_BODY) { res.writeHead(413).end('Payload too large'); return; }
    const host = req.headers.host || `localhost:${PORT}`;
    const url = new URL(req.url, 'http://' + host);
    if (req.method === 'GET' && serveAsset(url, res)) return;
    const proto = req.headers['x-forwarded-proto'] || 'http';
    const fwd = (req.headers['x-forwarded-for'] || req.headers['cf-connecting-ip'] || '').toString().split(',')[0].trim();
    const out = await handle({
      method: req.method,
      pathname: url.pathname,
      query: url.searchParams,
      headers: req.headers,
      ip: fwd || req.socket.remoteAddress || 'unknown',
      body: Buffer.concat(chunks).toString('utf8'),
      origin: `${proto}://${req.headers['x-forwarded-host'] || host}`
    }, { mode: 'collector' });
    res.writeHead(out.status, out.headers);
    res.end(out.body);
  });
});

server.listen(PORT, HOST, async () => {
  const cfg = getConfig();
  const { pages } = await getContent(cfg, cfg.siteUrl);
  console.log(`Things collector listening on http://localhost:${PORT}`);
  console.log(`  content:  ${pages.length} pages (${cfg.contentDir}${cfg.contentSitemap ? ' + ' + cfg.contentSitemap : ''})`);
  console.log(`  data:     ${cfg.dataDir}`);
  console.log(`  answers:  ${cfg.llm.provider === 'none' ? 'extractive (set LLM_API_KEY for natural answers)' : cfg.llm.provider + ' / ' + cfg.llm.model}`);
  console.log(`  admin:    ${cfg.adminToken ? `http://localhost:${PORT}/admin (local only)` : 'disabled (set ADMIN_TOKEN)'}`);
  if (!cfg.originsExplicit) console.log('  WARNING:  ALLOWED_ORIGINS is not set, so any website can use this collector. Set it to the sites that embed the widget.');
  if (!pages.length) console.log('  WARNING:  no content found. Add .md files to the content folder or set CONTENT_SITEMAP.');
});

for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => server.close(() => process.exit(0)));
