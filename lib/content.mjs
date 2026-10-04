// Site content: local markdown files and/or a crawled sitemap, chunked and searched with BM25.
import fs from 'node:fs/promises';
import path from 'node:path';

const STOP = new Set(('a an the is are was were be been am do does did of to in on at for with by from and or but if then so as it its ' +
  'this that these those i you we they he she me my your our can could should would will what how why when where which who whom there here ' +
  'about into than also just not no yes any some tell please').split(' '));

function stem(w) {
  if (w.length > 4 && w.endsWith('ies')) return w.slice(0, -3) + 'y';
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  return w;
}
export function terms(s) {
  return (String(s).toLowerCase().match(/[a-z0-9]+/g) || []).filter((w) => !STOP.has(w)).map(stem);
}

export function parseFrontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
  if (!m) return { meta: {}, body: text };
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z_-]+):\s*(.*)$/.exec(line);
    if (kv) meta[kv[1].toLowerCase()] = kv[2].replace(/^["']|["']$/g, '').trim();
  }
  return { meta, body: text.slice(m[0].length) };
}

async function walk(dir) {
  let out = [];
  let ents;
  try { ents = await fs.readdir(dir, { withFileTypes: true }); } catch (e) { return out; }
  for (const e of ents) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(await walk(p));
    else if (/\.md$/i.test(e.name) && !e.name.startsWith('_') && e.name.toLowerCase() !== 'readme.md') out.push(p);
  }
  return out;
}

function pathFromFile(rel) {
  let p = '/' + rel.replace(/\\/g, '/').replace(/\.md$/i, '');
  p = p.replace(/\/index$/, '') || '/';
  return p;
}

async function loadLocal(cfg) {
  const files = await walk(cfg.contentDir);
  const pages = [];
  for (const f of files) {
    const { meta, body } = parseFrontmatter(await fs.readFile(f, 'utf8'));
    const h1 = /^#\s+(.+)$/m.exec(body);
    const rel = path.relative(cfg.contentDir, f);
    pages.push({
      path: meta.path || pathFromFile(rel),
      title: meta.title || (h1 && h1[1].trim()) || path.basename(f, '.md'),
      description: meta.description || '',
      type: meta.type || 'page',
      body: body.trim(),
      url: '',
      source: 'local'
    });
  }
  return pages.sort((a, b) => a.path.localeCompare(b.path));
}

// ---- remote (crawl the site's own sitemap or a fixed URL list) ----
async function fetchText(url) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 10000);
  try {
    const r = await fetch(url, { signal: ac.signal, headers: { 'user-agent': 'ThingsContentBot/1.0' } });
    if (!r.ok) return '';
    return (await r.text()).slice(0, 2_000_000);
  } catch (e) { return ''; } finally { clearTimeout(t); }
}

const ENT = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' };
export function htmlToText(html) {
  let s = html
    .replace(/<(script|style|noscript|svg|nav|footer|form|template)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/gi, (m, n, t) => '\n\n' + '#'.repeat(Number(n)) + ' ' + t.replace(/<[^>]+>/g, '') + '\n\n')
    .replace(/<\/(p|div|li|tr|section|article|ul|ol)>|<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '');
  s = s.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => ENT[m]);
  return s.replace(/[ \t]+/g, ' ').replace(/\n\s*\n\s*\n+/g, '\n\n').trim();
}

async function loadRemote(cfg) {
  let urls = [...cfg.contentUrls];
  if (cfg.contentSitemap) {
    const origin = new URL(cfg.contentSitemap).origin;
    const locs = async (xml) => [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]);
    for (const u of await locs(await fetchText(cfg.contentSitemap))) {
      if (/\.xml$/i.test(u)) urls.push(...(await locs(await fetchText(u))));
      else urls.push(u);
    }
    urls = urls.filter((u) => { try { return new URL(u).origin === origin; } catch (e) { return false; } });
  }
  urls = [...new Set(urls)].slice(0, 50);
  const pages = [];
  for (const u of urls) {
    const html = await fetchText(u);
    if (!html) continue;
    const t = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
    const d = /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i.exec(html);
    const url = new URL(u);
    pages.push({
      path: url.pathname || '/',
      title: t ? htmlToText(t[1]) : url.pathname,
      description: d ? d[1] : '',
      type: 'page',
      body: htmlToText(html),
      url: u,
      source: 'remote'
    });
  }
  return pages;
}

// ---- chunking + BM25 ----
export function chunkPages(pages, base = '') {
  const chunks = [];
  for (const p of pages) {
    const url = p.url || (base + (p.path === '/' ? '/' : p.path));
    let heading = p.title;
    let buf = [];
    const flush = () => {
      const text = buf.join('\n').trim();
      buf = [];
      if (!text) return;
      // split long sections at a paragraph/sentence edge near the limit
      let start = 0;
      while (start < text.length) {
        let end = Math.min(text.length, start + 1100);
        if (end < text.length) {
          const cut = Math.max(text.lastIndexOf('\n', end), text.lastIndexOf('. ', end));
          if (cut > start + 400) end = cut + 1;
        }
        const piece = text.slice(start, end).trim();
        if (piece) chunks.push({ pagePath: p.path, title: p.title, heading, text: piece, url });
        start = end;
      }
    };
    for (const line of p.body.split(/\r?\n/)) {
      const h = /^#{1,3}\s+(.+)$/.exec(line);
      if (h) { flush(); heading = h[1].trim(); } else buf.push(line);
    }
    flush();
  }
  return chunks;
}

export function buildIndex(chunks) {
  const docs = chunks.map((c) => {
    const tf = new Map();
    const add = (ws, w) => ws.forEach((t) => tf.set(t, (tf.get(t) || 0) + w));
    add(terms(c.text), 1);
    add(terms(c.heading), 2.5);
    add(terms(c.title), 1);
    let len = 0;
    tf.forEach((v) => { len += v; });
    return { c, tf, len };
  });
  const df = new Map();
  docs.forEach((d) => d.tf.forEach((_, t) => df.set(t, (df.get(t) || 0) + 1)));
  const avg = docs.reduce((s, d) => s + d.len, 0) / (docs.length || 1);
  return { docs, df, avg, n: docs.length };
}

// Returns [{chunk, score, coverage}] best first. coverage = share of the question's terms found in the chunk.
export function search(index, question, k = 4) {
  const q = [...new Set(terms(question))];
  if (!q.length || !index.n) return [];
  const k1 = 1.5, b = 0.75;
  const out = [];
  for (const d of index.docs) {
    let score = 0, hit = 0;
    for (const t of q) {
      const f = d.tf.get(t);
      if (!f) continue;
      hit++;
      const n = index.df.get(t);
      const idf = Math.log(1 + (index.n - n + 0.5) / (n + 0.5));
      score += idf * (f * (k1 + 1)) / (f + k1 * (1 - b + b * d.len / index.avg));
    }
    if (hit) out.push({ chunk: d.c, score, coverage: hit / q.length });
  }
  return out.sort((a, b2) => b2.coverage * 2 + b2.score - (a.coverage * 2 + a.score)).slice(0, k);
}

// ---- cached access ----
let cache = null;
const REMOTE_TTL = 60 * 60 * 1000;

export async function getContent(cfg, base = '') {
  const files = await walk(cfg.contentDir);
  const stats = await Promise.all(files.map((f) => fs.stat(f).then((s) => f + s.mtimeMs + ':' + s.size).catch(() => f)));
  const sig = cfg.contentDir + '|' + stats.join('|') + '|' + base;
  const remoteWanted = cfg.contentSitemap || cfg.contentUrls.length;
  const stale = cache && remoteWanted && Date.now() - cache.remoteAt > REMOTE_TTL;
  if (cache && cache.sig === sig && !stale) return cache;
  const remote = remoteWanted && (!cache || stale) ? await loadRemote(cfg) : (cache ? cache.remote : []);
  const local = await loadLocal(cfg);
  const pages = [...local, ...remote.filter((r) => !local.some((l) => l.path === r.path))];
  const chunks = chunkPages(pages, base);
  cache = { sig, pages, remote, remoteAt: stale || !cache ? Date.now() : cache.remoteAt, chunks, index: buildIndex(chunks) };
  return cache;
}
