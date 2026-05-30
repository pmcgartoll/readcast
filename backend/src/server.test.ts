import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { extractArticle, ExtractionError } from './extract';
import { createApp } from './server';
import { createMockProvider } from './tts/mockProvider';

const html = readFileSync(
  new URL('../fixtures/article.html', import.meta.url),
  'utf8',
);

function makeApp(overrides: Partial<Parameters<typeof createApp>[0]> = {}) {
  return createApp({
    fetchPage: async () => html,
    extractArticle,
    ttsProvider: createMockProvider(),
    ...overrides,
  });
}

async function postJson(app: ReturnType<typeof createApp>, path: string, body: unknown) {
  return app.request(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('GET /health', () => {
  it('returns ok', async () => {
    const res = await makeApp().request('/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});

describe('POST /articles/ingest', () => {
  it('extracts and returns article content', async () => {
    const res = await postJson(makeApp(), '/articles/ingest', {
      url: 'https://example.com/slow-reading',
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.title).toContain('Slow Reading');
    expect(json.contentText).toContain('attention');
  });

  it('rejects a missing url with 400', async () => {
    const res = await postJson(makeApp(), '/articles/ingest', {});
    expect(res.status).toBe(400);
  });

  it('returns 422 when extraction fails', async () => {
    const app = makeApp({
      extractArticle: () => {
        throw new ExtractionError('no article');
      },
    });
    const res = await postJson(app, '/articles/ingest', {
      url: 'https://example.com/paywalled',
    });
    expect(res.status).toBe(422);
  });

  it('returns 502 when the page fetch fails', async () => {
    const app = makeApp({
      fetchPage: async () => {
        throw new Error('network down');
      },
    });
    const res = await postJson(app, '/articles/ingest', {
      url: 'https://example.com/x',
    });
    expect(res.status).toBe(502);
  });
});

describe('POST /articles/:id/audio', () => {
  it('returns one segment per chunk', async () => {
    const res = await postJson(makeApp(), '/articles/a1/audio', {
      textChunks: ['First chunk.', 'Second chunk.'],
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.segments).toHaveLength(2);
    expect(json.segments[0]).toHaveProperty('uri');
    expect(json.segments[0]).toHaveProperty('durationMs');
  });

  it('rejects a missing textChunks array with 400', async () => {
    const res = await postJson(makeApp(), '/articles/a1/audio', {});
    expect(res.status).toBe(400);
  });
});
