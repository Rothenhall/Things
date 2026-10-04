// Append-only JSONL log files in DATA_DIR. No database to run; back up by copying the folder.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const counters = new Map();

export async function append(cfg, name, rec) {
  const file = path.join(cfg.dataDir, name);
  await fs.mkdir(cfg.dataDir, { recursive: true });
  await fs.appendFile(file, JSON.stringify(rec) + '\n');
  const n = (counters.get(file) || 0) + 1;
  counters.set(file, n);
  if (n % 200 === 1) {
    const st = await fs.stat(file).catch(() => null);
    if (st && st.size > cfg.maxLogBytes) await fs.rename(file, file + '.1').catch(() => {});
  }
}

export async function readAll(cfg, name, sinceMs = 0) {
  const out = [];
  for (const f of [name + '.1', name]) {
    let txt;
    try { txt = await fs.readFile(path.join(cfg.dataDir, f), 'utf8'); } catch (e) { continue; }
    for (const line of txt.split('\n')) {
      if (!line) continue;
      try {
        const r = JSON.parse(line);
        if (r.t >= sinceMs) out.push(r);
      } catch (e) { /* skip a torn line */ }
    }
  }
  return out;
}

// Daily-rotating anonymous id: lets us count distinct visitors without storing IPs.
export function anonId(ip, ua) {
  const day = new Date().toISOString().slice(0, 10);
  return crypto.createHash('sha256').update(day + '|' + ip + '|' + ua).digest('hex').slice(0, 12);
}
