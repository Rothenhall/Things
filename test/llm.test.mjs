import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { getConfig } from '../lib/env.mjs';
import { answerQuestion } from '../lib/answer.mjs';

test('providers: sarvam, gemini, groq and openrouter have defaults; unknown names fall back to OpenAI', () => {
  const s = getConfig({ LLM_PROVIDER: 'sarvam', LLM_API_KEY: 'sk_x' }).llm;
  assert.equal(s.baseUrl, 'https://api.sarvam.ai/v1');
  assert.equal(s.model, 'sarvam-105b');
  assert.equal(getConfig({ LLM_PROVIDER: 'gemini' }).llm.baseUrl, 'https://generativelanguage.googleapis.com/v1beta/openai');
  assert.equal(getConfig({ LLM_PROVIDER: 'groq' }).llm.baseUrl, 'https://api.groq.com/openai/v1');
  assert.equal(getConfig({ LLM_PROVIDER: 'openrouter' }).llm.baseUrl, 'https://openrouter.ai/api/v1');
  assert.equal(getConfig({ LLM_PROVIDER: 'mystery' }).llm.baseUrl, 'https://api.openai.com/v1');
  assert.equal(getConfig({ LLM_PROVIDER: 'sarvam', LLM_MODEL: 'glm5.3', LLM_BASE_URL: 'https://api.sarvam.ai/v2/' }).llm.baseUrl, 'https://api.sarvam.ai/v2');
});

test('sarvam: request goes to /v1/chat/completions with the key, reasoning text is stripped', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'things-llm-'));
  await fs.writeFile(path.join(dir, 'shipping.md'), '# Shipping\n\nWe ship to Canada in three to five business days.\n');
  const cfg = getConfig({ CONTENT_DIR: dir, DATA_DIR: dir, LLM_PROVIDER: 'sarvam', LLM_API_KEY: 'sk_test' });
  const real = globalThis.fetch;
  let seen;
  globalThis.fetch = async (url, init) => {
    seen = { url, headers: init.headers, body: JSON.parse(init.body) };
    return new Response(JSON.stringify({ choices: [{ message: { content: '<think>checking</think>Yes, in three to five business days.' } }] }), { status: 200 });
  };
  try {
    const r = await answerQuestion(cfg, 'Do you ship to Canada?');
    assert.equal(seen.url, 'https://api.sarvam.ai/v1/chat/completions');
    assert.equal(seen.headers['api-subscription-key'], 'sk_test');
    assert.equal(seen.headers.authorization, 'Bearer sk_test');
    assert.equal(seen.body.model, 'sarvam-105b');
    assert.equal(r.mode, 'llm');
    assert.equal(r.answer, 'Yes, in three to five business days.');
  } finally { globalThis.fetch = real; }
});

test('a failing provider falls back to quoting the content instead of erroring', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'things-llm-'));
  await fs.writeFile(path.join(dir, 'shipping.md'), '# Shipping\n\nWe ship to Canada in three to five business days.\n');
  const cfg = getConfig({ CONTENT_DIR: dir, DATA_DIR: dir, LLM_PROVIDER: 'sarvam', LLM_API_KEY: 'bad' });
  const real = globalThis.fetch, warn = console.warn;
  globalThis.fetch = async () => new Response('{}', { status: 401 });
  console.warn = () => {};
  try {
    const r = await answerQuestion(cfg, 'Do you ship to Canada?');
    assert.equal(r.answered, true);
    assert.equal(r.mode, 'extractive');
  } finally { globalThis.fetch = real; console.warn = warn; }
});
