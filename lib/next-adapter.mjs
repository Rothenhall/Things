// Bridges a Next.js route handler Request to lib/router.mjs.
import { handle } from './router.mjs';

// pathname: override when a middleware rewrite hides the real route from request.url
export async function nextHandle(request, pathname) {
  const url = new URL(request.url);
  const headers = Object.fromEntries(request.headers);
  const body = request.method === 'GET' || request.method === 'HEAD' ? '' : (await request.text()).slice(0, 16384);
  const ip = (headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const proto = headers['x-forwarded-proto'] || url.protocol.replace(':', '');
  const origin = proto + '://' + (headers['x-forwarded-host'] || headers.host || url.host);
  const res = await handle({ method: request.method, pathname: typeof pathname === 'string' ? pathname : url.pathname, query: url.searchParams, headers, ip, body, origin }, { mode: 'next' });
  return new Response(res.body === '' ? null : res.body, { status: res.status, headers: res.headers });
}
