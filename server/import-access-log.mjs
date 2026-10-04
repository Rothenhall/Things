#!/usr/bin/env node
// Import AI crawler hits from a web server access log (nginx / Apache "combined" format) into the collector's
// data folder. Nothing leaves your machine. Use it when you cannot add middleware or a Worker to a site.
//
//   node server/import-access-log.mjs /var/log/nginx/access.log [--since=2026-10-01]
//
// Run it once per rotated log: it does not de-duplicate if you import the same lines twice.
import fs from 'node:fs';
import readline from 'node:readline';
import { getConfig } from '../lib/env.mjs';
import { append } from '../lib/store.mjs';
import { classifyUA } from '../lib/bots.mjs';
import { normalizePath } from '../lib/router.mjs';

try { process.loadEnvFile(process.env.THINGS_ENV_FILE || '.env'); } catch (e) { /* no .env */ }

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const sinceArg = (args.find((a) => a.startsWith('--since=')) || '').slice(8);
if (!file) { console.error('usage: node server/import-access-log.mjs <access.log> [--since=YYYY-MM-DD]'); process.exit(1); }
const since = sinceArg ? Date.parse(sinceArg) : 0;

// 203.0.113.9 - - [10/Oct/2026:13:55:36 +0000] "GET /faq HTTP/1.1" 200 512 "-" "Mozilla/5.0 ... GPTBot/1.1"
const LINE = /\[(\d+)\/(\w+)\/(\d+):(\d+:\d+:\d+) ([+-]\d{4})\] "(?:GET|HEAD) (\S+)[^"]*" (\d{3}) \S+ "[^"]*" "([^"]*)"/;
const cfg = getConfig();
let seen = 0, kept = 0;

const rl = readline.createInterface({ input: fs.createReadStream(file) });
for await (const line of rl) {
  seen++;
  const m = LINE.exec(line);
  if (!m) continue;
  const bot = classifyUA(m[8]);
  if (!bot) continue;
  const t = Date.parse(`${m[1]} ${m[2]} ${m[3]} ${m[4]} ${m[5]}`);
  if (!Number.isFinite(t) || t < since) continue;
  const status = Number(m[7]);
  await append(cfg, 'bot-hits.jsonl', { t, bot: bot.id, vendor: bot.vendor, kind: bot.kind, path: normalizePath(m[6]), known: status < 400, format: 'html' });
  kept++;
}
console.log(`Read ${seen} lines, imported ${kept} AI crawler hits into ${cfg.dataDir}`);
