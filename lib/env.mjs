// Runtime configuration, read from environment variables (see .env.example).
import path from 'node:path';

const list = (v) => (v || '').split(',').map((s) => s.trim()).filter(Boolean);
const num = (v, d) => (v !== undefined && v !== '' && Number.isFinite(Number(v)) ? Number(v) : d);
const flag = (v, d) => (v === undefined || v === '' ? d : /^(1|true|yes|on)$/i.test(v));

export function getConfig(env = process.env) {
  const apiKey = env.LLM_API_KEY || '';
  let provider = (env.LLM_PROVIDER || '').toLowerCase();
  if (!provider) provider = apiKey || env.LLM_BASE_URL ? 'openai' : 'none';
  const d = provider === 'anthropic'
    ? { baseUrl: 'https://api.anthropic.com', model: 'claude-haiku-4-5-20251001' }
    : { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' };
  const origins = list(env.ALLOWED_ORIGINS);
  return {
    siteUrl: (env.SITE_URL || '').replace(/\/+$/, ''),
    siteName: env.SITE_NAME || 'Things',
    siteDescription: env.SITE_DESCRIPTION || 'Build a 3D plush character. Change the fur, face and outfit, then boop it.',
    contentDir: path.resolve(env.CONTENT_DIR || 'content'),
    contentSitemap: env.CONTENT_SITEMAP || '',
    contentUrls: list(env.CONTENT_URLS),
    dataDir: path.resolve(env.DATA_DIR || 'data'),
    maxLogBytes: num(env.LOG_MAX_MB, 10) * 1024 * 1024,
    adminToken: env.ADMIN_TOKEN || '',
    adminLocalOnly: env.ADMIN_LOCAL_ONLY === undefined || env.ADMIN_LOCAL_ONLY === '' ? null : flag(env.ADMIN_LOCAL_ONLY, false),
    allowedOrigins: origins.length ? origins : ['*'],
    originsExplicit: origins.length > 0,
    chatEnabled: flag(env.CHAT_ENABLED, true),
    siteKey: env.SITE_KEY || '',
    rateLimit: num(env.CHAT_RATE_LIMIT, 20),
    dailyLlmLimit: num(env.CHAT_DAILY_LLM_LIMIT, 500),
    fallbackMessage: env.CHAT_FALLBACK || "I don't have an answer to that yet. I've noted your question so it can be added.",
    markdownForBots: flag(env.MARKDOWN_FOR_BOTS, true),
    aiBots: (env.AI_BOTS || 'allow').toLowerCase() === 'block' ? 'block' : 'allow',
    llm: {
      provider,
      apiKey,
      baseUrl: (env.LLM_BASE_URL || d.baseUrl).replace(/\/+$/, ''),
      model: env.LLM_MODEL || d.model
    }
  };
}
