// Framework-agnostic request router shared by the Next.js app (app/api, app/admin, ...) and the
// standalone collector (server/collector.mjs). Input and output are plain objects.
//
//   req: { method, pathname, query: URLSearchParams, headers (lowercase keys), ip, body (string), origin }
//   res: { status, headers, body }
import { getConfig } from './env.mjs';
import { getContent } from './content.mjs';
import { answerQuestion } from './answer.mjs';
import { append, anonId } from './store.mjs';
import { classifyUA, classifyReferrer } from './bots.mjs';
import { llmsTxt, llmsFull, robotsTxt, sitemapXml, pageMarkdown, jsonLd } from './seo.mjs';
import { aggregate, renderDashboard, renderLogin, isAuthed, tokenOk, cookieValue, promptsText, csv } from './dashboard.mjs';

const buckets = new Map();
function limited(key, max, ms = 60000) {
  const now = Date.now();
  if (buckets.size > 5000) for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
  let b = buckets.get(key);
  if (!b || b.reset < now) { b = { n: 0, reset: now + ms }; buckets.set(key, b); }
  return ++b.n > max;
}

const json = (status, obj, headers = {}) => ({ status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers }, body: JSON.stringify(obj) });
const text = (status, body, type = 'text/plain; charset=utf-8', headers = {}) => ({ status, headers: { 'content-type': type, ...headers }, body });
const html = (status, body, headers = {}) => text(status, body, 'text/html; charset=utf-8', { 'cache-control': 'no-store', ...headers });

function corsHeaders(cfg, req) {
  const origin = req.headers.origin;
  const h = { vary: 'Origin' };
  if (cfg.allowedOrigins.includes('*')) h['access-control-allow-origin'] = '*';
  else if (origin && cfg.allowedOrigins.includes(origin)) h['access-control-allow-origin'] = origin;
  if (req.method === 'OPTIONS') {
    h['access-control-allow-methods'] = 'GET, POST, OPTIONS';
    h['access-control-allow-headers'] = 'content-type, x-things-key';
    h['access-control-max-age'] = '86400';
    // Chrome asks permission before a public page may call a private-network (e.g. localhost) server.
    if (req.headers['access-control-request-private-network']) h['access-control-allow-private-network'] = 'true';
  }
  return h;
}
const originAllowed = (cfg, req) => !req.headers.origin || cfg.allowedOrigins.includes('*') || cfg.allowedOrigins.includes(req.headers.origin);

function parseBody(req) {
  const type = req.headers['content-type'] || '';
  try {
    if (/application\/x-www-form-urlencoded/.test(type)) return Object.fromEntries(new URLSearchParams(req.body || ''));
    return JSON.parse(req.body || '{}') || {};
  } catch (e) { return {}; }
}

export function normalizePath(p) {
  let s = String(p || '/').split('?')[0].split('#')[0];
  try { s = decodeURIComponent(s); } catch (e) { /* keep raw */ }
  s = s.replace(/^\/md(?=\/|$)/, '').replace(/\.md$/i, '').replace(/\/+$/, '');
  return (s.startsWith('/') ? s : '/' + s).slice(0, 200) || '/';
}
const STATIC_KNOWN = ['/', '/studio', '/llms.txt', '/llms-full.txt', '/robots.txt', '/sitemap.xml'];

function readinessChecks(cfg, pages, mode) {
  const checks = [];
  checks.push({ ok: pages.length > 0, label: 'Content pages found', note: pages.length ? `${pages.length} pages in ${cfg.contentDir}${cfg.contentSitemap ? ' + sitemap crawl' : ''}` : 'Add .md files to the content folder (or set CONTENT_SITEMAP). The chat answers only from these.' });
  checks.push({ ok: !!cfg.siteUrl, label: 'SITE_URL set', note: cfg.siteUrl || 'Not set. Absolute URLs in llms.txt, sitemap and schema fall back to the request host.' });
  checks.push({ ok: pages.some((p) => p.type === 'faq'), label: 'FAQ page (FAQPage JSON-LD)', note: 'A content file with "type: faq" turns each ## heading into FAQ markup.' });
  checks.push({ ok: true, label: 'llms.txt and markdown pages', note: '/llms.txt, /llms-full.txt and /md/<path> are served.' });
  checks.push({ ok: true, label: 'AI crawlers in robots.txt', note: cfg.aiBots === 'block' ? 'Blocked (AI_BOTS=block).' : 'Allowed (AI_BOTS=allow).' });
  checks.push({ ok: true, label: 'Chat', note: cfg.chatEnabled ? 'On. Visitors can ask questions.' : 'Off (CHAT_ENABLED=false): capture-only mode.' });
  checks.push({ ok: true, label: 'Answer engine', note: cfg.llm.provider === 'none' ? 'Extractive: quotes the best passage. Set LLM_API_KEY for natural answers.' : `${cfg.llm.provider} / ${cfg.llm.model}` });
  checks.push({ ok: cfg.originsExplicit || (mode !== 'collector' && cfg.llm.provider === 'none'), label: 'ALLOWED_ORIGINS restricted', note: cfg.originsExplicit ? cfg.allowedOrigins.join(', ') : 'Open to any site. Set ALLOWED_ORIGINS to the sites that embed the widget.' });
  checks.push({ ok: !!cfg.adminToken, label: 'ADMIN_TOKEN set', note: cfg.adminToken ? 'Set.' : 'Not set: this dashboard is disabled.' });
  return checks;
}

export async function handle(req, { mode = 'next' } = {}) {
  const cfg = getConfig();
  const base = cfg.siteUrl || req.origin || '';
  const p = req.pathname.replace(/\/+$/, '') || '/';
  const cors = ['/api/chat', '/api/track', '/api/schema', '/api/health', '/llms.txt', '/llms-full.txt'].includes(p) || p.startsWith('/md')
    ? corsHeaders(cfg, req) : null;
  const done = (res) => (cors ? { ...res, headers: { ...res.headers, ...cors } } : res);

  if (req.method === 'OPTIONS') return cors ? { status: 204, headers: cors, body: '' } : text(404, 'Not found');

  try {
    // ---- visitor chat ----
    if (p === '/api/chat' && req.method === 'POST') {
      if (!cfg.chatEnabled) return done(json(403, { error: 'chat disabled' }));
      if (!originAllowed(cfg, req)) return done(json(403, { error: 'origin not allowed' }));
      const b = parseBody(req);
      if (cfg.siteKey && (req.headers['x-things-key'] || b.key) !== cfg.siteKey) return done(json(401, { error: 'bad site key' }));
      const question = String(b.question || '').replace(/\s+/g, ' ').trim().slice(0, 500);
      if (!question) return done(json(400, { error: 'question required' }));
      const ua = req.headers['user-agent'] || '';
      const anon = anonId(req.ip, ua);
      if (limited('chat:' + anon, cfg.rateLimit)) return done(json(429, { error: 'slow down' }));
      const r = await answerQuestion(cfg, question, base);
      await append(cfg, 'questions.jsonl', {
        t: Date.now(), q: question, answered: r.answered, score: r.score, mode: r.mode,
        page: String(b.page || '').slice(0, 200), anon, origin: (req.headers.origin || '').slice(0, 100)
      });
      return done(json(200, { answered: r.answered, answer: r.answer, sources: r.sources }));
    }

    // ---- tracking: AI crawler hits + AI-referred visits ----
    if (p === '/api/track' && req.method === 'POST') {
      const b = parseBody(req);
      const ua = req.headers['user-agent'] || '';
      if (limited('track:' + anonId(req.ip, ua), 120)) return done(json(429, { error: 'slow down' }));
      if (b.kind === 'bot') {
        const bot = classifyUA(b.ua);
        if (!bot) return done({ status: 204, headers: {}, body: '' });
        const path = normalizePath(b.path);
        const { pages } = await getContent(cfg, base);
        const known = STATIC_KNOWN.includes(path) || pages.some((x) => x.path === path);
        await append(cfg, 'bot-hits.jsonl', { t: Date.now(), bot: bot.id, vendor: bot.vendor, kind: bot.kind, path, known, format: b.format === 'md' ? 'md' : 'html' });
        return done({ status: 204, headers: {}, body: '' });
      }
      if (b.kind === 'visit') {
        const source = classifyReferrer(String(b.referrer || ''), String(b.utm || ''));
        if (!source || !b.vid) return done({ status: 204, headers: {}, body: '' });
        await append(cfg, 'visits.jsonl', {
          t: Date.now(), vid: String(b.vid).slice(0, 40), type: b.type === 'end' ? 'end' : 'start', source,
          path: normalizePath(b.path), ms: Math.max(0, Math.min(Number(b.ms) || 0, 3600000)), engaged: !!b.engaged
        });
        return done({ status: 204, headers: {}, body: '' });
      }
      return done(json(400, { error: 'unknown kind' }));
    }

    if (p === '/api/health') {
      const { pages } = await getContent(cfg, base);
      return done(json(200, { ok: true, mode, pages: pages.length, chat: cfg.chatEnabled, llm: cfg.llm.provider }));
    }

    // ---- agent-readable site ----
    if (p === '/llms.txt' || p === '/llms-full.txt' || p === '/sitemap.xml' || p === '/robots.txt') {
      const { pages } = await getContent(cfg, base);
      if (p === '/robots.txt') return text(200, robotsTxt(cfg, base), 'text/plain; charset=utf-8', { 'cache-control': 'public, max-age=3600' });
      if (p === '/sitemap.xml') return text(200, sitemapXml(pages, base), 'application/xml; charset=utf-8', { 'cache-control': 'public, max-age=3600' });
      const body = p === '/llms.txt' ? llmsTxt(cfg, pages, base) : llmsFull(cfg, pages, base);
      return done(text(200, body, 'text/plain; charset=utf-8', { 'cache-control': 'public, max-age=3600' }));
    }
    if (p === '/md' || p.startsWith('/md/')) {
      const { pages } = await getContent(cfg, base);
      const want = normalizePath(p);
      const page = pages.find((x) => x.path === want);
      if (!page) return done(text(404, '# Not found\n\nNo page at ' + want + '. See /llms.txt for the page list.\n', 'text/markdown; charset=utf-8'));
      return done(text(200, pageMarkdown(page, base), 'text/markdown; charset=utf-8', { 'cache-control': 'public, max-age=300', vary: 'Accept, User-Agent' }));
    }
    if (p === '/api/schema') {
      const { pages } = await getContent(cfg, base);
      return done(json(200, jsonLd(cfg, pages, normalizePath(req.query.get('path') || '/'), base), { 'cache-control': 'public, max-age=300' }));
    }

    // ---- admin ----
    if (p === '/admin' || p === '/api/admin/export') {
      if (!cfg.adminToken) return text(503, 'Admin is disabled. Set ADMIN_TOKEN in the environment and restart.\n');
      const localOnly = cfg.adminLocalOnly === null ? mode === 'collector' : cfg.adminLocalOnly;
      const proxied = req.headers['x-forwarded-for'] || req.headers['cf-connecting-ip'] || req.headers['x-real-ip'] || req.headers.forwarded;
      if (localOnly && proxied) return text(403, 'Admin is local-only on this server (ADMIN_LOCAL_ONLY). Open it from the machine itself.\n');

      if (p === '/admin' && req.method === 'POST') {
        if (limited('login:' + req.ip, 8)) return html(429, renderLogin('Too many attempts. Wait a minute.'));
        const b = parseBody(req);
        if (!tokenOk(cfg, b.token)) return html(401, renderLogin('Wrong token.'));
        const secure = /^https/.test(base) || req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
        return { status: 303, headers: { location: '/admin', 'set-cookie': `things_admin=${cookieValue(cfg)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000${secure}` }, body: '' };
      }
      if (!isAuthed(cfg, req.headers)) return p === '/admin' ? html(200, renderLogin()) : json(401, { error: 'unauthorized' });

      const days = [7, 30, 90].includes(Number(req.query.get('days'))) ? Number(req.query.get('days')) : 30;
      const agg = await aggregate(cfg, days);
      if (p === '/admin') {
        const { pages } = await getContent(cfg, base);
        return html(200, renderDashboard(cfg, agg, readinessChecks(cfg, pages, mode)));
      }
      const type = req.query.get('type');
      const dl = (name, mime, body) => text(200, body, mime, { 'content-disposition': `attachment; filename="${name}"`, 'cache-control': 'no-store' });
      if (type === 'prompts') return dl('prompts.txt', 'text/plain; charset=utf-8', promptsText(agg));
      if (type === 'gaps') return dl('content-gaps.csv', 'text/csv; charset=utf-8', csv(agg.gaps.map((g) => ({ question: g.question, asked: g.count, best_match: g.best, last: new Date(g.last).toISOString() })), ['question', 'asked', 'best_match', 'last']));
      return json(200, agg);
    }
  } catch (e) {
    console.error('[things] request failed:', e);
    return json(500, { error: 'internal error' });
  }
  return text(404, 'Not found');
}
