// Cloudflare Worker: make ANY website visible to the Things collector, with no code changes to the site.
// Route it in front of your site (Workers > Routes > example.com/*).
//
//  1. reports AI crawler hits (GPTBot, ClaudeBot, PerplexityBot ...) to your collector
//  2. serves the collector's clean markdown page to those crawlers (optional)
//  3. serves /llms.txt from the collector (optional)
//
// Variables (Worker > Settings > Variables):
//   COLLECTOR_URL   https://collector.example.com   (your tunnel / server running `npm run collector`)
//   SERVE_MARKDOWN  "true" to give crawlers markdown, anything else to only record hits
//   SERVE_LLMS_TXT  "true" to serve /llms.txt from the collector
//
// Keep BOTS in sync with lib/bots.mjs. User-agents can be spoofed: this is analytics, not security.
const BOTS = /GPTBot|OAI-SearchBot|ChatGPT-User|ClaudeBot|Claude-SearchBot|Claude-User|anthropic-ai|Claude-Web|PerplexityBot|Perplexity-User|Applebot|Amazonbot|Meta-ExternalAgent|FacebookBot|Bytespider|CCBot|cohere-ai|DuckAssistBot|MistralAI-User|YouBot|Diffbot/i;
const STATIC = /\.(js|css|png|jpe?g|gif|svg|ico|webp|avif|woff2?|ttf|map|json|webmanifest|mp4|webm|pdf|xml|txt)$/i;

export default {
  async fetch(request, env, ctx) {
    if (request.method !== 'GET') return fetch(request);
    const url = new URL(request.url);
    const ua = request.headers.get('user-agent') || '';

    if (url.pathname === '/llms.txt' && env.SERVE_LLMS_TXT === 'true') {
      return fetch(env.COLLECTOR_URL + '/llms.txt');
    }

    if (BOTS.test(ua)) {
      const wantMd = env.SERVE_MARKDOWN === 'true' && !STATIC.test(url.pathname);
      let md = null;
      if (wantMd) {
        const r = await fetch(env.COLLECTOR_URL + '/md' + (url.pathname === '/' ? '' : url.pathname.replace(/\/+$/, '')));
        if (r.ok) md = r;
      }
      ctx.waitUntil(fetch(env.COLLECTOR_URL + '/api/track', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind: 'bot', ua, path: url.pathname, format: md ? 'md' : 'html' })
      }).catch(() => {}));
      if (md) return new Response(md.body, { headers: { 'content-type': 'text/markdown; charset=utf-8', vary: 'User-Agent' } });
    }
    return fetch(request);
  }
};
