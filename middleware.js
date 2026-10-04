// AI-traffic layer for the Next.js site:
//  1. log hits from AI crawlers (GPTBot, ClaudeBot, PerplexityBot, ...) to the tracker
//  2. serve a clean markdown version of a page to those bots, to /page.md, and to "Accept: text/markdown"
import { NextResponse } from 'next/server';
import { classifyUA, wantsMarkdown } from './lib/bots.mjs';

const UTILITY = ['/llms.txt', '/llms-full.txt', '/robots.txt', '/sitemap.xml'];

export function middleware(request, event) {
  if (request.method !== 'GET') return NextResponse.next();
  const { pathname } = request.nextUrl;
  const bot = classifyUA(request.headers.get('user-agent'));
  const suffix = /\.md$/i.test(pathname);
  const utility = UTILITY.includes(pathname);
  const md = !utility && !pathname.startsWith('/md') &&
    (suffix || wantsMarkdown(request.headers.get('accept')) || (bot && process.env.MARKDOWN_FOR_BOTS !== 'false'));

  if (bot) {
    const target = (process.env.COLLECTOR_URL || process.env.INTERNAL_URL || 'http://127.0.0.1:' + (process.env.PORT || 3000)).replace(/\/+$/, '');
    event.waitUntil(
      fetch(target + '/api/track', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind: 'bot', ua: request.headers.get('user-agent'), path: pathname, format: md ? 'md' : 'html' })
      }).catch(() => {})
    );
  }
  if (!md) return NextResponse.next();

  const clean = pathname.replace(/\.md$/i, '').replace(/\/+$/, '');
  const res = NextResponse.rewrite(new URL('/md' + clean, request.url));
  res.headers.set('Vary', 'Accept, User-Agent');
  return res;
}

export const config = {
  matcher: ['/((?!api/|_next/|admin|.*\.(?:js|css|png|jpe?g|gif|svg|ico|webp|avif|woff2?|ttf|map|json|webmanifest|mp4|webm|glb)$).*)']
};
