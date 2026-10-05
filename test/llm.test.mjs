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

test('greetings and thanks get a friendly reply without calling the model', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'things-llm-'));
  await fs.writeFile(path.join(dir, 'index.md'), '---\npath: /\n---\n# Home\n\nWe sell lamps.\n');
  const cfg = getConfig({ CONTENT_DIR: dir, DATA_DIR: dir, SITE_NAME: 'Lamp Shop', LLM_PROVIDER: 'sarvam', LLM_API_KEY: 'k' });
  const real = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; return new Response('{}', { status: 500 }); };
  try {
    for (const q of ['hi', 'Hello!', 'thanks', 'bye']) {
      const r = await answerQuestion(cfg, q);
      assert.equal(r.answered, true, q);
      assert.equal(r.mode, 'smalltalk', q);
    }
    assert.match((await answerQuestion(cfg, 'hi')).answer, /Lamp Shop/);
    assert.equal(calls, 0);
  } finally { globalThis.fetch = real; }
});

test('a general question reaches the model together with a profile of the site', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'things-llm-'));
  await fs.writeFile(path.join(dir, 'index.md'), '---\npath: /\ntitle: Lamp Shop\n---\n# Lamp Shop\n\nWe make handmade lamps in Pune.\n');
  const cfg = getConfig({ CONTENT_DIR: dir, DATA_DIR: dir, SITE_NAME: 'Lamp Shop', LLM_PROVIDER: 'openai', LLM_API_KEY: 'k' });
  const real = globalThis.fetch;
  let sent;
  globalThis.fetch = async (url, init) => {
    sent = JSON.parse(init.body);
    return new Response(JSON.stringify({ choices: [{ message: { content: 'It is a shop that makes handmade lamps in Pune.' } }] }), { status: 200 });
  };
  try {
    const r = await answerQuestion(cfg, 'what is this place about');
    assert.equal(r.mode, 'llm');
    assert.match(sent.messages[1].content, /About this site\. Name: Lamp Shop/);
    assert.match(sent.messages[1].content, /handmade lamps in Pune/);
  } finally { globalThis.fetch = real; }
});

test('the model can still refuse: NO_ANSWER becomes a content gap', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'things-llm-'));
  await fs.writeFile(path.join(dir, 'index.md'), '---\npath: /\n---\n# Home\n\nWe sell lamps.\n');
  const cfg = getConfig({ CONTENT_DIR: dir, DATA_DIR: dir, LLM_PROVIDER: 'openai', LLM_API_KEY: 'k' });
  const real = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ choices: [{ message: { content: 'NO_ANSWER' } }] }), { status: 200 });
  try {
    const r = await answerQuestion(cfg, 'what is the capital of France');
    assert.equal(r.answered, false);
  } finally { globalThis.fetch = real; }
});
