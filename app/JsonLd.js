import { getConfig } from '../lib/env.mjs';
import { getContent } from '../lib/content.mjs';
import { jsonLd, jsonLdString } from '../lib/seo.mjs';

// Server component: emits schema.org JSON-LD for a page path, built from the content folder.
export default async function JsonLd({ path }) {
  const cfg = getConfig();
  const { pages } = await getContent(cfg, cfg.siteUrl);
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd(cfg, pages, path, cfg.siteUrl)) }} />;
}
