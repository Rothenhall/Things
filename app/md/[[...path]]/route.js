import { nextHandle } from '../../../lib/next-adapter.mjs';

export const dynamic = 'force-dynamic';

// Reached directly (/md/faq) or through the middleware rewrite, which hides the path from request.url.
export async function GET(request, { params }) {
  const { path = [] } = await params;
  return nextHandle(request, '/md' + (path.length ? '/' + path.join('/') : ''));
}
export const OPTIONS = GET;
