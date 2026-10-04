import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { classifyUA, classifyReferrer, wantsMarkdown } from '../lib/bots.mjs';
import { terms, buildIndex, chunkPages, search, parseFrontmatter, htmlToText } from '../lib/content.mjs';
import { renderMarkdown, faqEntries, jsonLd, jsonLdString } from '../lib/seo.mjs';
import { normalizePath } from '../lib/router.mjs';

test('classifies AI crawlers by user-agent', () => {
  assert.equal(classifyUA('Mozilla/5.0 AppleWebKit/537.36; compatible; GPTBot/1.1; +https://openai.com/gptbot').id, 'GPTBot');
  assert.equal(classifyUA('Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)').id, 'ClaudeBot');
  assert.equal(classifyUA('Claude-User/1.0').kind, 'user');
  assert.equal(classifyUA('Mozilla/5.0 (Windows NT 10.0) Chrome/126 Safari/537.36'), null);
  assert.equal(classifyUA(''), null);
});

test('classifies AI referrals by referrer host and utm_source', () => {
  assert.equal(classifyReferrer('https://chatgpt.com/'), 'ChatGPT');
  assert.equal(classifyReferrer('https://www.perplexity.ai/search?q=x'), 'Perplexity');
  assert.equal(classifyReferrer('', 'chatgpt.com'), 'ChatGPT');
  assert.equal(classifyReferrer('https://example.com/'), null);
  assert.equal(classifyReferrer('https://notchatgpt.com/'), null);
});

test('detects markdown Accept headers', () => {
  assert.ok(wantsMarkdown('text/markdown, text/html;q=0.8'));
  assert.ok(!wantsMarkdown('text/html,application/xhtml+xml'));
});

test('parses frontmatter', () => {
  const { meta, body } = parseFrontmatter('---\ntitle: Hi\npath: /x\n---\n# Body');
  assert.equal(meta.title, 'Hi');
  assert.equal(meta.path, '/x');
  assert.equal(body, '# Body');
});

const pages = [
  { path: '/', title: 'Home', description: '', type: 'page', url: '', body: '# Home\n\n## Is it free?\n\nYes, it is MIT licensed with no paid tier.\n\n## Fur\n\nPick a fabric then adjust the pile sliders.' }
];

test('retrieval finds the matching section and rejects unrelated questions', () => {
  const index = buildIndex(chunkPages(pages));
  const hit = search(index, 'Is this free to use?');
  assert.equal(hit[0].chunk.heading, 'Is it free?');
  assert.ok(hit[0].coverage >= 0.5);
  const miss = search(index, 'Do you ship to Canada?');
  assert.ok(!miss.length || miss[0].coverage < 0.5);
});

test('terms drops stop words and stems plurals', () => {
  assert.deepEqual(terms('What are the sliders?'), ['slider']);
});

test('markdown renderer escapes HTML and blocks javascript: links', () => {
  const html = renderMarkdown('# T\n\n<script>alert(1)</script> [x](javascript:alert(1)) [ok](https://a.com)');
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('javascript:'));
  assert.ok(html.includes('<a href="https://a.com">ok</a>'));
});

test('FAQ page becomes FAQPage JSON-LD that is safe to inline', () => {
  const faq = { path: '/faq', title: 'FAQ', description: 'd', type: 'faq', body: '# FAQ\n\n## What </script> is it?\n\nA **toy**.' };
  assert.deepEqual(faqEntries(faq), [{ q: 'What </script> is it?', a: 'A toy.' }]);
  const ld = jsonLd({ siteName: 'S', siteDescription: 'D' }, [faq], '/faq', 'https://x.test');
  assert.ok(ld['@graph'].some((n) => n['@type'] === 'FAQPage'));
  assert.ok(!jsonLdString(ld).includes('</script>'));
});

test('htmlToText strips scripts and keeps headings', () => {
  const t = htmlToText('<nav>menu</nav><h2>Pricing</h2><p>Free &amp; open</p><script>x()</script>');
  assert.ok(t.includes('## Pricing') && t.includes('Free & open') && !t.includes('menu') && !t.includes('x()'));
});

test('normalizePath handles md prefixes and suffixes', () => {
  assert.equal(normalizePath('/md/faq'), '/faq');
  assert.equal(normalizePath('/faq.md'), '/faq');
  assert.equal(normalizePath('/md'), '/');
  assert.equal(normalizePath('/a/b/?x=1'), '/a/b');
});

test('router: chat logs gaps, tracking records bots, admin needs a token', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'things-'));
  const content = path.join(dir, 'content');
  await fs.mkdir(content);
  await fs.writeFile(path.join(content, 'index.md'), '---\npath: /\ntitle: Home\n---\n# Home\n\n## Is it free?\n\nYes, it is MIT licensed.\n');
  Object.assign(process.env, { DATA_DIR: path.join(dir, 'data'), CONTENT_DIR: content, ADMIN_TOKEN: 's3cret', SITE_URL: 'https://x.test' });
  const { handle } = await import('../lib/router.mjs');
  const mk = (method, pathname, body, headers = {}) => ({ method, pathname, query: new URLSearchParams(), headers, ip: '1.2.3.4', body: body ? JSON.stringify(body) : '', origin: 'http://localhost' });

  const ok = await handle(mk('POST', '/api/chat', { question: 'Is it free?', page: '/' }));
  assert.equal(ok.status, 200);
  assert.equal(JSON.parse(ok.body).answered, true);
  const gap = await handle(mk('POST', '/api/chat', { question: 'Do you ship to Canada?', page: '/' }));
  assert.equal(JSON.parse(gap.body).answered, false);

  assert.equal((await handle(mk('POST', '/api/track', { kind: 'bot', ua: 'GPTBot/1.1', path: '/nope' }))).status, 204);
  assert.equal((await handle(mk('POST', '/api/track', { kind: 'visit', vid: 'v1', type: 'start', path: '/', referrer: 'https://chatgpt.com/' }))).status, 204);
  assert.equal((await handle(mk('POST', '/api/track', { kind: 'visit', vid: 'v1', type: 'end', path: '/', referrer: 'https://chatgpt.com/', ms: 2000, engaged: false }))).status, 204);

  const login = await handle(mk('GET', '/admin'));
  assert.ok(login.body.includes('ADMIN_TOKEN'));
  assert.equal((await handle(mk('GET', '/api/admin/export'))).status, 401);
  const data = await handle(mk('GET', '/api/admin/export', null, { authorization: 'Bearer s3cret' }));
  const agg = JSON.parse(data.body);
  assert.equal(agg.questions.total, 2);
  assert.equal(agg.gaps[0].question, 'Do you ship to Canada?');
  assert.equal(agg.topQuestions.length, 2);
  assert.ok(agg.topTerms.length > 0);
  assert.equal(agg.bots[0].id, 'GPTBot');
  assert.equal(agg.botMissed[0].path, '/nope');
  assert.equal(agg.referrals.bounceRate, 1);

  const md = await handle(mk('GET', '/md'));
  assert.ok(md.body.startsWith('# Home'));
  assert.ok((await handle(mk('GET', '/llms.txt'))).body.includes('https://x.test/md'));
  const pre = await handle({ ...mk('OPTIONS', '/api/chat'), headers: { origin: 'https://a.com', 'access-control-request-private-network': 'true' } });
  assert.equal(pre.headers['access-control-allow-private-network'], 'true');
});

test('router: capture-only mode turns chat off but keeps tracking', async () => {
  process.env.CHAT_ENABLED = 'false';
  try {
    const { handle } = await import('../lib/router.mjs');
    const mk = (pathname, body) => ({ method: 'POST', pathname, query: new URLSearchParams(), headers: {}, ip: '5.6.7.8', body: JSON.stringify(body), origin: 'http://localhost' });
    const chat = await handle(mk('/api/chat', { question: 'Hello?' }));
    assert.equal(chat.status, 403);
    assert.equal((await handle(mk('/api/track', { kind: 'bot', ua: 'ClaudeBot/1.0', path: '/' }))).status, 204);
  } finally { delete process.env.CHAT_ENABLED; }
});
