// Agent-readable site output: llms.txt, markdown pages, JSON-LD, robots.txt, sitemap.xml, plus a tiny markdown renderer.
import { AI_BOTS } from './bots.mjs';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function pageMarkdown(page, base = '') {
  const body = page.body.replace(/^#\s+.+\n+/, '');
  const url = page.url || (base ? base + (page.path === '/' ? '/' : page.path) : '');
  return `# ${page.title}\n\n${page.description ? '> ' + page.description + '\n\n' : ''}${url ? 'Source: ' + url + '\n\n' : ''}${body}\n`;
}

const mdPath = (p) => '/md' + (p === '/' ? '' : p);

export function llmsTxt(cfg, pages, base) {
  const lines = [`# ${cfg.siteName}`, '', `> ${cfg.siteDescription}`, '', '## Pages', ''];
  for (const p of pages) lines.push(`- [${p.title}](${base}${mdPath(p.path)})${p.description ? ': ' + p.description : ''}`);
  lines.push('', '## Optional', '', `- [All pages in one file](${base}/llms-full.txt)`);
  return lines.join('\n') + '\n';
}

export function llmsFull(cfg, pages, base) {
  return `# ${cfg.siteName}\n\n> ${cfg.siteDescription}\n\n` + pages.map((p) => pageMarkdown(p, base)).join('\n---\n\n');
}

export function robotsTxt(cfg, base) {
  const out = ['User-agent: *', 'Allow: /', 'Disallow: /admin', 'Disallow: /api/', ''];
  if (cfg.aiBots === 'block') for (const b of AI_BOTS) out.push(`User-agent: ${b.id}`, 'Disallow: /', '');
  if (base) out.push(`Sitemap: ${base}/sitemap.xml`);
  return out.join('\n') + '\n';
}

export function sitemapXml(pages, base) {
  const urls = pages.map((p) => `  <url><loc>${esc(base + (p.path === '/' ? '/' : p.path))}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

// ## Question / answer pairs from a page with `type: faq`.
export function faqEntries(page) {
  const out = [];
  const parts = page.body.split(/^##\s+/m).slice(1);
  for (const part of parts) {
    const nl = part.indexOf('\n');
    const q = (nl < 0 ? part : part.slice(0, nl)).trim();
    const a = (nl < 0 ? '' : part.slice(nl + 1)).replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[*`>#]/g, '').replace(/\s+/g, ' ').trim();
    if (q && a) out.push({ q, a });
  }
  return out;
}

export function jsonLd(cfg, pages, pathname, base) {
  const page = pages.find((p) => p.path === pathname);
  const graph = [{ '@type': 'WebSite', name: cfg.siteName, description: cfg.siteDescription, ...(base ? { url: base } : {}) }];
  if (page) {
    graph.push({
      '@type': 'WebPage', name: page.title,
      ...(page.description ? { description: page.description } : {}),
      ...(base ? { url: base + (page.path === '/' ? '/' : page.path) } : {})
    });
    if (page.type === 'faq') {
      const items = faqEntries(page);
      if (items.length) graph.push({
        '@type': 'FAQPage',
        mainEntity: items.map((i) => ({ '@type': 'Question', name: i.q, acceptedAnswer: { '@type': 'Answer', text: i.a } }))
      });
    }
  }
  return { '@context': 'https://schema.org', '@graph': graph };
}

// Safe to place inside <script type="application/ld+json">.
export const jsonLdString = (obj) => JSON.stringify(obj).replace(/</g, '\\u003c');

// ---- minimal, safe markdown -> HTML (headings, lists, code, quotes, links, bold/italic) ----
function inline(text) {
  const codes = [];
  let s = esc(text).replace(/`([^`]+)`/g, (m, c) => { codes.push(c); return '\u0000' + (codes.length - 1) + '\u0000'; });
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, u) => (/^(https?:\/\/|mailto:|\/|#)/i.test(u) ? `<a href="${u}">${t}</a>` : t));
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
  return s.replace(/\u0000(\d+)\u0000/g, (m, i) => `<code>${codes[i]}</code>`);
}

export function renderMarkdown(md) {
  const lines = md.split(/\r?\n/);
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (/^```/.test(l)) {
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      out.push(`<pre><code>${esc(buf.join('\n'))}</code></pre>`);
    } else if (/^#{1,4}\s/.test(l)) {
      const n = /^#+/.exec(l)[0].length;
      out.push(`<h${n}>${inline(l.replace(/^#+\s+/, ''))}</h${n}>`);
      i++;
    } else if (/^\s*([-*]|\d+\.)\s+/.test(l)) {
      const ordered = /^\s*\d+\./.test(l);
      const items = [];
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) items.push(`<li>${inline(lines[i++].replace(/^\s*([-*]|\d+\.)\s+/, ''))}</li>`);
      out.push(`<${ordered ? 'ol' : 'ul'}>${items.join('')}</${ordered ? 'ol' : 'ul'}>`);
    } else if (/^>\s?/.test(l)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ''));
      out.push(`<blockquote>${inline(buf.join(' '))}</blockquote>`);
    } else if (/^---+\s*$/.test(l)) {
      out.push('<hr>');
      i++;
    } else if (!l.trim()) {
      i++;
    } else {
      const buf = [];
      while (i < lines.length && lines[i].trim() && !/^(```|#{1,4}\s|\s*([-*]|\d+\.)\s|>|---+\s*$)/.test(lines[i])) buf.push(lines[i++]);
      out.push(`<p>${inline(buf.join(' '))}</p>`);
    }
  }
  return out.join('\n');
}
