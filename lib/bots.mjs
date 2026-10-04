// Detect AI crawlers and AI-referred visitors. Pure functions, safe in the Edge runtime.
// User-agents can be spoofed: this is analytics, not authentication.

// kind: training = collects data for models, search = builds an AI search index,
// user = fetches a page live because a person asked an AI about it.
export const AI_BOTS = [
  { id: 'GPTBot', name: 'GPTBot', vendor: 'OpenAI', kind: 'training' },
  { id: 'OAI-SearchBot', name: 'OAI-SearchBot', vendor: 'OpenAI', kind: 'search' },
  { id: 'ChatGPT-User', name: 'ChatGPT-User', vendor: 'OpenAI', kind: 'user' },
  { id: 'ClaudeBot', name: 'ClaudeBot', vendor: 'Anthropic', kind: 'training' },
  { id: 'Claude-SearchBot', name: 'Claude-SearchBot', vendor: 'Anthropic', kind: 'search' },
  { id: 'Claude-User', name: 'Claude-User', vendor: 'Anthropic', kind: 'user' },
  { id: 'anthropic-ai', name: 'anthropic-ai', vendor: 'Anthropic', kind: 'training' },
  { id: 'Claude-Web', name: 'Claude-Web', vendor: 'Anthropic', kind: 'training' },
  { id: 'PerplexityBot', name: 'PerplexityBot', vendor: 'Perplexity', kind: 'search' },
  { id: 'Perplexity-User', name: 'Perplexity-User', vendor: 'Perplexity', kind: 'user' },
  { id: 'Applebot', name: 'Applebot', vendor: 'Apple', kind: 'search' },
  { id: 'Amazonbot', name: 'Amazonbot', vendor: 'Amazon', kind: 'search' },
  { id: 'Meta-ExternalAgent', name: 'Meta-ExternalAgent', vendor: 'Meta', kind: 'training' },
  { id: 'FacebookBot', name: 'FacebookBot', vendor: 'Meta', kind: 'training' },
  { id: 'Bytespider', name: 'Bytespider', vendor: 'ByteDance', kind: 'training' },
  { id: 'CCBot', name: 'CCBot', vendor: 'Common Crawl', kind: 'training' },
  { id: 'cohere-ai', name: 'cohere-ai', vendor: 'Cohere', kind: 'training' },
  { id: 'DuckAssistBot', name: 'DuckAssistBot', vendor: 'DuckDuckGo', kind: 'user' },
  { id: 'MistralAI-User', name: 'MistralAI-User', vendor: 'Mistral', kind: 'user' },
  { id: 'YouBot', name: 'YouBot', vendor: 'You.com', kind: 'search' },
  { id: 'Diffbot', name: 'Diffbot', vendor: 'Diffbot', kind: 'training' }
];

export function classifyUA(ua) {
  if (!ua) return null;
  const s = String(ua).toLowerCase();
  for (const b of AI_BOTS) if (s.includes(b.id.toLowerCase())) return b;
  return null;
}

// host (and its subdomains) -> display name
const AI_REFERRERS = {
  'chatgpt.com': 'ChatGPT',
  'chat.openai.com': 'ChatGPT',
  'perplexity.ai': 'Perplexity',
  'claude.ai': 'Claude',
  'gemini.google.com': 'Gemini',
  'bard.google.com': 'Gemini',
  'copilot.microsoft.com': 'Copilot',
  'you.com': 'You.com',
  'phind.com': 'Phind',
  'meta.ai': 'Meta AI',
  'grok.com': 'Grok',
  'chat.deepseek.com': 'DeepSeek',
  'chat.mistral.ai': 'Le Chat'
};
const UTM_HINTS = [
  ['chatgpt', 'ChatGPT'], ['openai', 'ChatGPT'], ['perplexity', 'Perplexity'], ['claude', 'Claude'],
  ['gemini', 'Gemini'], ['copilot', 'Copilot'], ['grok', 'Grok'], ['deepseek', 'DeepSeek']
];

function hostMatch(host) {
  host = host.toLowerCase().replace(/^www\./, '');
  for (const k of Object.keys(AI_REFERRERS)) if (host === k || host.endsWith('.' + k)) return AI_REFERRERS[k];
  return null;
}

// referrer: document.referrer / Referer header. utmSource: ?utm_source= value (ChatGPT adds utm_source=chatgpt.com).
export function classifyReferrer(referrer, utmSource) {
  if (referrer) {
    try {
      const name = hostMatch(new URL(referrer).hostname);
      if (name) return name;
    } catch (e) { /* not a URL */ }
  }
  if (utmSource) {
    const u = String(utmSource).toLowerCase();
    for (const [needle, name] of UTM_HINTS) if (u.includes(needle)) return name;
  }
  return null;
}

export function wantsMarkdown(accept) {
  return /(^|,|\s)text\/markdown(\s*;|\s*,|\s*$)/i.test(accept || '');
}
