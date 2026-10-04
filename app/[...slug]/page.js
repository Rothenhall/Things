import { notFound } from 'next/navigation';
import { getConfig } from '../../lib/env.mjs';
import { getContent } from '../../lib/content.mjs';
import { renderMarkdown } from '../../lib/seo.mjs';
import JsonLd from '../JsonLd';

// HTML twin of every file in content/, so bots and people see the same pages (bots get the markdown form).
export const dynamic = 'force-dynamic';

async function find(params) {
  const { slug } = await params;
  const cfg = getConfig();
  const { pages } = await getContent(cfg, cfg.siteUrl);
  const path = '/' + slug.map(decodeURIComponent).join('/');
  return { page: pages.find((p) => p.path === path && p.source === 'local'), path };
}

export async function generateMetadata({ params }) {
  const { page } = await find(params);
  return page ? { title: page.title, description: page.description || undefined } : {};
}

export default async function ContentPage({ params }) {
  const { page, path } = await find(params);
  if (!page) notFound();
  return (
    <>
      <JsonLd path={path} />
      <main className="doc">
        <nav><a href="/">Things</a> <span aria-hidden="true">/</span> {page.title}</nav>
        <article dangerouslySetInnerHTML={{ __html: renderMarkdown(page.body) }} />
      </main>
    </>
  );
}
