import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createApp } from '../src/app.js';
import { setAIProvider } from '../src/modules/ai/ai.controller.js';
import { AIProviderError, parseJsonObject } from '../src/modules/ai/providers/AIProvider.js';
import { MockProvider } from '../src/modules/ai/providers/mock.provider.js';
import { OllamaProvider } from '../src/modules/ai/providers/ollama.provider.js';
import { OpenAICompatibleProvider } from '../src/modules/ai/providers/openaiCompatible.provider.js';

const schema = z.object({ reply: z.string(), picks: z.array(z.string()) });
const messages = [{ role: 'user' as const, content: 'hi' }];

/** Stubs global fetch with one canned response and records the request. */
function stubFetch(response: { status?: number; json?: unknown; text?: string } | Error) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      if (response instanceof Error) throw response;
      const body = response.text ?? JSON.stringify(response.json);
      return new Response(body, { status: response.status ?? 200 });
    }),
  );
  return calls;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('parseJsonObject', () => {
  it('extracts JSON from fenced or chatty model output', () => {
    expect(parseJsonObject('Sure! ```json\n{"a":1}\n``` hope that helps')).toEqual({ a: 1 });
  });

  it('throws AIProviderError when there is no valid object', () => {
    expect(() => parseJsonObject('no json here')).toThrow(AIProviderError);
    expect(() => parseJsonObject('{not: valid}')).toThrow(AIProviderError);
  });
});

describe('OllamaProvider', () => {
  const ollama = new OllamaProvider('qwen2.5:3b', 'http://localhost:11434', 5000);

  it('calls /api/chat with the JSON Schema as the output format and validates the result', async () => {
    const calls = stubFetch({
      json: { message: { content: '{"reply":"Hi","picks":["P1"]}' } },
    });
    await expect(ollama.generateJson({ messages, schema })).resolves.toEqual({
      reply: 'Hi',
      picks: ['P1'],
    });
    expect(calls[0]!.url).toBe('http://localhost:11434/api/chat');
    const body = JSON.parse(String(calls[0]!.init.body));
    expect(body).toMatchObject({ model: 'qwen2.5:3b', stream: false, messages });
    expect(body.format).toMatchObject({ type: 'object', required: ['reply', 'picks'] });
    expect(calls[0]!.init.signal).toBeInstanceOf(AbortSignal);
  });

  it('rejects output that does not match the schema', async () => {
    stubFetch({ json: { message: { content: '{"reply":42}' } } });
    await expect(ollama.generateJson({ messages, schema })).rejects.toThrow(AIProviderError);
  });

  it('wraps HTTP errors and network failures in AIProviderError', async () => {
    stubFetch({ status: 404, text: 'model "qwen2.5:3b" not found' });
    await expect(ollama.generateJson({ messages, schema })).rejects.toThrow(/404/);

    stubFetch(new TypeError('fetch failed'));
    await expect(ollama.generateJson({ messages, schema })).rejects.toThrow(/unreachable/);
  });
});

describe('OpenAICompatibleProvider', () => {
  it('sends the key as a Bearer token, requests JSON mode and parses the first choice', async () => {
    const provider = new OpenAICompatibleProvider('m', 'https://llm.example/v1', 'sk-test', 5000);
    const calls = stubFetch({
      json: { choices: [{ message: { content: '{"reply":"ok","picks":[]}' } }] },
    });
    await expect(provider.generateJson({ messages, schema })).resolves.toEqual({
      reply: 'ok',
      picks: [],
    });
    expect(calls[0]!.url).toBe('https://llm.example/v1/chat/completions');
    expect((calls[0]!.init.headers as Record<string, string>).Authorization).toBe('Bearer sk-test');
    const body = JSON.parse(String(calls[0]!.init.body));
    expect(body.response_format).toEqual({ type: 'json_object' });
    expect(body.messages.at(-1).content).toContain('JSON Schema');
  });

  it('works without a key (local servers) and never echoes the key in errors', async () => {
    const keyless = new OpenAICompatibleProvider('m', 'http://localhost:1234/v1', undefined, 5000);
    const calls = stubFetch({
      json: { choices: [{ message: { content: '{"reply":"","picks":[]}' } }] },
    });
    await keyless.generateJson({ messages, schema });
    expect(calls[0]!.init.headers).not.toHaveProperty('Authorization');

    const keyed = new OpenAICompatibleProvider('m', 'https://llm.example/v1', 'sk-secret', 5000);
    stubFetch({ status: 401, text: 'invalid key' });
    const err = await keyed.generateJson({ messages, schema }).catch((e: Error) => e);
    expect(err).toBeInstanceOf(AIProviderError);
    expect((err as Error).message).not.toContain('sk-secret');
  });
});

describe('GET /ai/status', () => {
  const app = createApp();

  afterEach(() => setAIProvider(new MockProvider()));

  it('reports Ollama available only when the model is pulled', async () => {
    setAIProvider(new OllamaProvider('qwen2.5:3b', 'http://localhost:11434', 5000));

    stubFetch({ json: { models: [{ name: 'qwen2.5:3b' }] } });
    expect((await request(app).get('/api/v1/ai/status')).body.data.available).toBe(true);

    stubFetch({ json: { models: [{ name: 'llama3.2:3b' }] } });
    expect((await request(app).get('/api/v1/ai/status')).body.data.available).toBe(false);

    stubFetch(new TypeError('connect ECONNREFUSED'));
    expect((await request(app).get('/api/v1/ai/status')).body.data).toEqual({
      provider: 'ollama',
      model: 'qwen2.5:3b',
      available: false,
    });
  });
});
