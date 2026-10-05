// @rothenhall/things: helpers that do not need a browser or React.
export const version = '1.0.0';

const attr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const jsonAttr = (o) => JSON.stringify(o).replace(/&/g, '&amp;').replace(/'/g, '&#39;');

/**
 * Build the <script> tag that puts a Things character on a page.
 *
 *   embedSnippet({ endpoint: 'https://things.example.com', preset: 'pebble' })
 *   embedSnippet({ config: characterJson, chat: false })      // custom character, decoration only
 *
 * @param {object}  o
 * @param {string}  [o.src='/things/things-chat.js']  where the widget file is served from
 * @param {string}  [o.endpoint]    your collector (omit for decoration-only characters)
 * @param {string}  [o.preset='pebble']  preset id (ignored when config is set)
 * @param {object}  [o.config]      a character exported from the studio
 * @param {boolean} [o.chat=true]   false = decoration only, no chat panel
 * @param {string}  [o.title] [o.greeting] [o.position] [o.color] [o.key]
 * @param {boolean} [o.track=true]  false turns off AI-referral tracking
 * @param {boolean} [o.schema=false] true injects JSON-LD from the collector
 * @param {string}  [o.assets]      where three.min.js and things.umd.js load from
 */
export function embedSnippet(o = {}) {
  const a = [];
  const add = (k, v) => { if (v !== undefined && v !== null && v !== '') a.push(`data-${k}="${attr(v)}"`); };
  add('endpoint', o.endpoint);
  if (o.config && typeof o.config === 'object') a.push(`data-config='${jsonAttr(o.config)}'`);
  else add('preset', o.preset || 'pebble');
  if (o.chat === false) a.push('data-chat="false"');
  add('title', o.title); add('greeting', o.greeting); add('position', o.position); add('color', o.color); add('key', o.key); add('assets', o.assets);
  if (o.track === false) a.push('data-track="false"');
  if (o.schema === true) a.push('data-schema="true"');
  return `<script src="${attr(o.src || '/things/things-chat.js')}"\n  ${a.join('\n  ')}\n  async></script>`;
}
