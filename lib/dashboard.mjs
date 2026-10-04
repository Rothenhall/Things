// Admin dashboard: aggregates the JSONL logs and renders one self-contained HTML page.
import crypto from 'node:crypto';
import { readAll } from './store.mjs';
import { terms } from './content.mjs';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const day = (t) => new Date(t).toISOString().slice(0, 10);
const BOUNCE_MS = 10000;

// ---- auth ----
export const cookieValue = (cfg) => crypto.createHash('sha256').update('things-admin:' + cfg.adminToken).digest('hex');
function same(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
export function tokenOk(cfg, token) { return !!cfg.adminToken && same(token || '', cfg.adminToken); }
export function isAuthed(cfg, headers) {
  if (!cfg.adminToken) return false;
  const auth = headers.authorization || '';
  if (/^Bearer\s/i.test(auth) && tokenOk(cfg, auth.replace(/^Bearer\s+/i, ''))) return true;
  const m = /(?:^|;\s*)things_admin=([a-f0-9]+)/.exec(headers.cookie || '');
  return !!m && same(m[1], cookieValue(cfg));
}

// ---- aggregation ----
export async function aggregate(cfg, days) {
  const since = Date.now() - days * 86400000;
  const [qs, hits, visitRows] = await Promise.all([
    readAll(cfg, 'questions.jsonl', since), readAll(cfg, 'bot-hits.jsonl', since), readAll(cfg, 'visits.jsonl', since)
  ]);

  const gapMap = new Map();
  const askMap = new Map();
  const termMap = new Map();
  let answered = 0;
  for (const r of qs) {
    const ts = terms(r.q);
    const akey = [...ts].sort().join(' ') || r.q.toLowerCase();
    const a = askMap.get(akey) || { question: r.q, count: 0, answered: 0, last: 0 };
    a.count++; if (r.answered) a.answered++;
    if (r.t >= a.last) { a.last = r.t; a.question = r.q; }
    askMap.set(akey, a);
    for (const w of new Set(ts)) termMap.set(w, (termMap.get(w) || 0) + 1);
    if (r.answered) { answered++; continue; }
    const key = akey;
    const g = gapMap.get(key) || { question: r.q, count: 0, last: 0, best: 0, pages: new Set() };
    g.count++;
    if (r.t >= g.last) { g.last = r.t; g.question = r.q; }
    g.best = Math.max(g.best, r.score || 0);
    if (r.page) g.pages.add(r.page);
    gapMap.set(key, g);
  }
  const gaps = [...gapMap.values()].map((g) => ({ ...g, pages: [...g.pages] })).sort((a, b) => b.count - a.count || b.last - a.last);

  const topQuestions = [...askMap.values()].sort((a, b) => b.count - a.count || b.last - a.last).slice(0, 50);
  const topTerms = [...termMap.entries()].map(([term, count]) => ({ term, count })).sort((a, b) => b.count - a.count).slice(0, 20);

  const botMap = new Map();
  const pageMap = new Map();
  const missMap = new Map();
  for (const h of hits) {
    const b = botMap.get(h.bot) || { id: h.bot, vendor: h.vendor, kind: h.kind, hits: 0, md: 0, paths: new Set(), last: 0 };
    b.hits++; if (h.format === 'md') b.md++; b.paths.add(h.path); b.last = Math.max(b.last, h.t);
    botMap.set(h.bot, b);
    if (h.known) {
      const p = pageMap.get(h.path) || { path: h.path, hits: 0, bots: new Set() };
      p.hits++; p.bots.add(h.bot); pageMap.set(h.path, p);
    } else {
      const m = missMap.get(h.path) || { path: h.path, hits: 0, bots: new Set() };
      m.hits++; m.bots.add(h.bot); missMap.set(h.path, m);
    }
  }
  const finish = (m) => [...m.values()].map((x) => ({ ...x, bots: x.bots ? [...x.bots] : undefined, paths: x.paths ? x.paths.size : undefined })).sort((a, b) => b.hits - a.hits);

  // merge start/end beacons by visit id
  const vm = new Map();
  for (const v of visitRows) {
    const cur = vm.get(v.vid) || { source: v.source, path: v.path, ms: 0, engaged: false, ended: false, t: v.t };
    if (v.type === 'end') { cur.ended = true; cur.ms = Math.max(cur.ms, v.ms || 0); cur.engaged = cur.engaged || !!v.engaged; }
    vm.set(v.vid, cur);
  }
  const visits = [...vm.values()];
  const bounced = (v) => v.ended && v.ms < BOUNCE_MS && !v.engaged;
  const sumBy = (keyFn) => {
    const m = new Map();
    for (const v of visits) {
      const k = keyFn(v);
      const s = m.get(k) || { key: k, visits: 0, ended: 0, bounced: 0, ms: 0 };
      s.visits++;
      if (v.ended) { s.ended++; s.ms += v.ms; if (bounced(v)) s.bounced++; }
      m.set(k, s);
    }
    return [...m.values()].map((s) => ({ ...s, avgMs: s.ended ? Math.round(s.ms / s.ended) : 0, bounceRate: s.ended ? s.bounced / s.ended : null })).sort((a, b) => b.visits - a.visits);
  };
  const ended = visits.filter((v) => v.ended);

  return {
    days,
    questions: { total: qs.length, answered, unanswered: qs.length - answered, gapCount: gaps.length },
    gaps,
    topQuestions,
    topTerms,
    bots: finish(botMap).map((b) => ({ ...b, vendor: b.vendor })),
    botPages: finish(pageMap),
    botMissed: finish(missMap),
    botHitsTotal: hits.length,
    referrals: { total: visits.length, bounceRate: ended.length ? ended.filter(bounced).length / ended.length : null, bySource: sumBy((v) => v.source), byPage: sumBy((v) => v.path) },
    daily: dailySeries(days, qs, hits, visits)
  };
}

function dailySeries(days, qs, hits, visits) {
  const out = [];
  for (let i = Math.min(days, 30) - 1; i >= 0; i--) out.push({ day: day(Date.now() - i * 86400000), q: 0, bots: 0, ref: 0 });
  const at = new Map(out.map((o) => [o.day, o]));
  qs.forEach((r) => { const o = at.get(day(r.t)); if (o) o.q++; });
  hits.forEach((r) => { const o = at.get(day(r.t)); if (o) o.bots++; });
  visits.forEach((r) => { const o = at.get(day(r.t)); if (o) o.ref++; });
  return out;
}

export const promptsText = (agg) => agg.gaps.map((g) => g.question).join('\n') + '\n';

export function csv(rows, cols) {
  const q = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  return [cols.join(','), ...rows.map((r) => cols.map((c) => q(r[c])).join(','))].join('\n') + '\n';
}

// ---- html ----
const CSS = `
:root{--bg:#f7f3ea;--card:#fbf9f3;--ink:#1a1712;--mut:#5c5648;--line:#ddd5c4;--acc:#a85c30;--ok:#3b7a4f;--bad:#b3402a}
@media(prefers-color-scheme:dark){:root{--bg:#14120d;--card:#1d1a13;--ink:#f1ece0;--mut:#a39b88;--line:#34301f;--acc:#d98a58;--ok:#6fbf86;--bad:#e8806a}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,-apple-system,Segoe UI,sans-serif}
main{max-width:1080px;margin:0 auto;padding:24px 16px 64px}h1{font-size:1.5rem;margin:0}h2{font-size:1.05rem;margin:32px 0 4px}
.sub{color:var(--mut);font-size:.9rem;margin:2px 0 12px}header{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between}
nav a{color:var(--ink);margin-left:6px;padding:4px 10px;border:1px solid var(--line);border-radius:999px;text-decoration:none;font-size:.85rem}nav a.on{background:var(--ink);color:var(--bg)}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-top:16px}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 14px}.card b{display:block;font-size:1.6rem;line-height:1.2}.card span{color:var(--mut);font-size:.8rem}
table{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--line);border-radius:12px;overflow:hidden;font-size:.9rem}
th,td{text-align:left;padding:8px 12px;border-bottom:1px solid var(--line);vertical-align:top}th{color:var(--mut);font-weight:600;font-size:.78rem;text-transform:uppercase;letter-spacing:.05em}tr:last-child td{border-bottom:0}
td.n,th.n{text-align:right;font-variant-numeric:tabular-nums}.empty{color:var(--mut);padding:14px;background:var(--card);border:1px dashed var(--line);border-radius:12px}
.pill{display:inline-block;padding:1px 8px;border-radius:999px;border:1px solid var(--line);font-size:.75rem;color:var(--mut)}.ok{color:var(--ok)}.bad{color:var(--bad)}
textarea{width:100%;min-height:120px;background:var(--card);color:var(--ink);border:1px solid var(--line);border-radius:12px;padding:10px;font:13px/1.5 ui-monospace,Menlo,Consolas,monospace}
.bars{display:flex;align-items:flex-end;gap:2px;height:48px}.bars i{flex:1;background:var(--acc);opacity:.75;border-radius:2px 2px 0 0;min-height:1px}
form.login{max-width:340px;margin:20vh auto;display:grid;gap:10px}input,button{font:inherit;padding:9px 12px;border-radius:8px;border:1px solid var(--line);background:var(--card);color:var(--ink)}button{background:var(--ink);color:var(--bg);cursor:pointer}
a{color:var(--acc)}code{background:var(--card);border:1px solid var(--line);border-radius:4px;padding:0 4px}
`;

const shell = (title, body) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${esc(title)}</title><style>${CSS}</style></head><body>${body}</body></html>`;

export function renderLogin(message) {
  return shell('Admin login', `<form class="login" method="post" action="/admin"><h1>Things admin</h1>${message ? `<p class="bad">${esc(message)}</p>` : ''}<input type="password" name="token" placeholder="ADMIN_TOKEN" autocomplete="current-password" autofocus required><button>Sign in</button></form>`);
}

const table = (head, rows, empty) => rows.length
  ? `<table><thead><tr>${head.map((h) => `<th${h[1] ? ' class="n"' : ''}>${esc(h[0])}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>`
  : `<div class="empty">${esc(empty)}</div>`;
const pct = (x) => (x == null ? 'n/a' : Math.round(x * 100) + '%');
const secs = (ms) => (ms ? (ms / 1000).toFixed(1) + 's' : 'n/a');

export function renderDashboard(cfg, a, checks) {
  const range = [7, 30, 90].map((d) => `<a href="/admin?days=${d}" class="${d === a.days ? 'on' : ''}">${d}d</a>`).join('');
  const answeredPct = a.questions.total ? a.questions.answered / a.questions.total : null;
  const max = Math.max(1, ...a.daily.map((d) => d.q + d.bots + d.ref));
  const bars = a.daily.map((d) => `<i title="${d.day}: ${d.q} questions, ${d.bots} bot hits, ${d.ref} AI referrals" style="height:${Math.round(((d.q + d.bots + d.ref) / max) * 100)}%"></i>`).join('');

  const askRows = a.topQuestions.slice(0, 25).map((q) => `<tr><td>${esc(q.question)}</td><td class="n">${q.count}</td><td class="n ${q.answered < q.count ? 'bad' : 'ok'}">${pct(q.answered / q.count)}</td><td>${day(q.last)}</td></tr>`);
  const termChips = a.topTerms.map((t) => `<span class="pill">${esc(t.term)} &middot; ${t.count}</span>`).join(' ');
  const gapRows = a.gaps.slice(0, 100).map((g) => `<tr><td>${esc(g.question)}</td><td class="n">${g.count}</td><td class="n">${Math.round(g.best * 100)}%</td><td>${esc(g.pages.slice(0, 2).join(', '))}</td><td>${day(g.last)}</td></tr>`);
  const botRows = a.bots.map((b) => `<tr><td><b>${esc(b.id)}</b> <span class="pill">${esc(b.kind)}</span></td><td>${esc(b.vendor)}</td><td class="n">${b.hits}</td><td class="n">${b.paths}</td><td class="n">${b.md}</td><td>${day(b.last)}</td></tr>`);
  const pageRows = a.botPages.slice(0, 25).map((p) => `<tr><td><code>${esc(p.path)}</code></td><td class="n">${p.hits}</td><td>${esc(p.bots.join(', '))}</td></tr>`);
  const missRows = a.botMissed.slice(0, 25).map((p) => `<tr><td><code>${esc(p.path)}</code></td><td class="n">${p.hits}</td><td>${esc(p.bots.join(', '))}</td></tr>`);
  const srcRows = a.referrals.bySource.map((s) => `<tr><td><b>${esc(s.key)}</b></td><td class="n">${s.visits}</td><td class="n">${secs(s.avgMs)}</td><td class="n ${s.bounceRate > 0.6 ? 'bad' : ''}">${pct(s.bounceRate)}</td></tr>`);
  const landRows = a.referrals.byPage.slice(0, 25).map((s) => `<tr><td><code>${esc(s.key)}</code></td><td class="n">${s.visits}</td><td class="n">${secs(s.avgMs)}</td><td class="n ${s.bounceRate > 0.6 ? 'bad' : ''}">${pct(s.bounceRate)}</td></tr>`);
  const checkRows = checks.map((c) => `<tr><td class="${c.ok ? 'ok' : 'bad'}">${c.ok ? 'OK' : 'Fix'}</td><td>${esc(c.label)}</td><td>${esc(c.note)}</td></tr>`);

  return shell('Things admin', `<main>
<header><div><h1>${esc(cfg.siteName)} <span class="pill">admin</span></h1><p class="sub">Last ${a.days} days. Data lives in <code>${esc(cfg.dataDir)}</code>.</p></div><nav>${range}</nav></header>
<div class="cards">
<div class="card"><b>${a.questions.total}</b><span>questions asked</span></div>
<div class="card"><b>${pct(answeredPct)}</b><span>answered from content</span></div>
<div class="card"><b class="${a.questions.gapCount ? 'bad' : ''}">${a.questions.gapCount}</b><span>content gaps</span></div>
<div class="card"><b>${a.botHitsTotal}</b><span>AI crawler hits</span></div>
<div class="card"><b>${a.referrals.total}</b><span>visits from AI answers</span></div>
<div class="card"><b>${pct(a.referrals.bounceRate)}</b><span>of those bounced (&lt;10s, no interaction)</span></div>
</div>
<div class="sub" style="margin-top:14px">Daily activity</div><div class="bars">${bars}</div>

<h2>1. What visitors ask most</h2><p class="sub">${cfg.chatEnabled ? 'All questions, answered or not, grouped by wording. Use this to decide what to put on the page, in the FAQ or in your navigation.' : 'Chat is turned off (CHAT_ENABLED=false), so nothing is collected here. Turn it on to see what visitors ask.'}</p>
${table([['Question'], ['Asked', 1], ['Answered', 1], ['Last']], askRows, 'No questions yet.')}
${termChips ? `<p class="sub" style="margin-top:12px">Topics that come up most:</p><p>${termChips}</p>` : ''}

<h2>2. Content gaps</h2><p class="sub">Questions the site could not answer, grouped by wording, most asked first. Write a page or FAQ entry for each, then test the same prompts in ChatGPT and Perplexity.</p>
${table([['Question'], ['Asked', 1], ['Best match', 1], ['Asked on'], ['Last']], gapRows, 'No gaps yet. Unanswered questions appear here.')}
<p class="sub"><a href="/api/admin/export?type=prompts&days=${a.days}">Download as prompts (txt)</a> &middot; <a href="/api/admin/export?type=gaps&days=${a.days}">gaps (csv)</a> &middot; <a href="/api/admin/export?type=json&days=${a.days}">everything (json)</a></p>
<textarea readonly onclick="this.select()" aria-label="Prompts to test">${esc(promptsText(a).trim())}</textarea>

<h2>3. AI crawlers</h2><p class="sub">By user-agent. Spoofable, so treat it as a trend, not proof.</p>
${table([['Bot'], ['Vendor'], ['Hits', 1], ['Pages', 1], ['Got markdown', 1], ['Last seen']], botRows, 'No AI crawler hits yet.')}
<h2>Pages AI engines read</h2>
${table([['Page'], ['Hits', 1], ['Bots']], pageRows, 'Nothing yet.')}
<h2>Requested but missing</h2><p class="sub">AI crawlers asked for these paths and there was no page. The AI engine hit a dead end.</p>
${table([['Path'], ['Hits', 1], ['Bots']], missRows, 'No misses. Good.')}

<h2>4. Visits from AI answers</h2><p class="sub">People who clicked through from ChatGPT, Perplexity, Claude and others. Only these visits are recorded.</p>
${table([['Source'], ['Visits', 1], ['Avg time', 1], ['Bounce', 1]], srcRows, 'No AI-referred visits yet.')}
<h2>Landing pages</h2>
${table([['Page'], ['Visits', 1], ['Avg time', 1], ['Bounce', 1]], landRows, 'Nothing yet.')}

<h2>5. Agent readiness</h2>
${table([['Status'], ['Check'], ['Note']], checkRows, '')}
</main>`);
}
