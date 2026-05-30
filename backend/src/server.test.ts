import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createFileAudioStorage } from './audioStorage';
import { openDatabase, type Database } from './db';
import { extractArticle, ExtractionError } from './extract';
import { createJobStore } from './jobStore';
import { createApp } from './server';
import type { SynthesizedChunk, TtsOptions, TtsProvider } from './tts/types';
import { createWorker, type Worker } from './worker';

const html = readFileSync(
  new URL('../fixtures/article.html', import.meta.url),
  'utf8',
);

/** Counting provider so tests can assert how many chunks were synthesized. */
function makeCountingProvider(): TtsProvider & { calls: () => number } {
  let calls = 0;
  return {
    id: 'mock',
    calls: () => calls,
    async synthesizeChunk(_text: string, _options?: TtsOptions): Promise<SynthesizedChunk> {
      calls += 1;
      return { audio: new Uint8Array([1, 2, 3, 4]), format: 'wav', durationMs: 1000 };
    },
  };
}

type Harness = {
  app: ReturnType<typeof createApp>;
  worker: Worker;
  provider: ReturnType<typeof makeCountingProvider>;
  db: Database;
};

let dbs: Database[] = [];

function makeHarness(
  overrides: {
    fetchPage?: (url: string) => Promise<string>;
    extractArticle?: typeof extractArticle;
    provider?: TtsProvider & { calls: () => number };
  } = {},
): Harness {
  const db = openDatabase(':memory:');
  dbs.push(db);
  const jobStore = createJobStore(db);
  const storage = createFileAudioStorage(
    mkdtempSync(join(tmpdir(), 'readcast-audio-')),
  );
  const provider = overrides.provider ?? makeCountingProvider();
  const worker = createWorker({ jobStore, storage, ttsProvider: provider });
  const app = createApp({
    fetchPage: overrides.fetchPage ?? (async () => html),
    extractArticle: overrides.extractArticle ?? extractArticle,
    jobStore,
    storage,
    worker,
    providerId: provider.id,
  });
  return { app, worker, provider, db };
}

async function postJson(app: Harness['app'], path: string, body: unknown) {
  return app.request(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  dbs = [];
});
afterEach(() => {
  for (const db of dbs) db.close();
});

describe('GET /health', () => {
  it('returns ok', async () => {
    const res = await makeHarness().app.request('/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});

describe('POST /articles/ingest', () => {
  it('extracts and returns article content', async () => {
    const res = await postJson(makeHarness().app, '/articles/ingest', {
      url: 'https://example.com/slow-reading',
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.title).toContain('Slow Reading');
    expect(json.contentText).toContain('attention');
  });

  it('rejects a missing url with 400', async () => {
    const res = await postJson(makeHarness().app, '/articles/ingest', {});
    expect(res.status).toBe(400);
  });

  it('returns 422 when extraction fails', async () => {
    const res = await postJson(
      makeHarness({
        extractArticle: () => {
          throw new ExtractionError('no article');
        },
      }).app,
      '/articles/ingest',
      { url: 'https://example.com/paywalled' },
    );
    expect(res.status).toBe(422);
  });

  it('returns 502 when the page fetch fails', async () => {
    const res = await postJson(
      makeHarness({
        fetchPage: async () => {
          throw new Error('network down');
        },
      }).app,
      '/articles/ingest',
      { url: 'https://example.com/x' },
    );
    expect(res.status).toBe(502);
  });
});

describe('POST /articles/:id/audio', () => {
  it('queues a job, processes it, and reports ready with segment urls', async () => {
    const h = makeHarness();
    const start = await postJson(h.app, '/articles/a1/audio', {
      textChunks: ['First chunk.', 'Second chunk.'],
    });
    expect(start.status).toBe(200);
    expect((await start.json()).job.status).toBe('queued');

    await h.worker.drain();

    const status = await h.app.request('/articles/a1/audio');
    const { job } = await status.json();
    expect(job.status).toBe('ready');
    expect(job.totalChunks).toBe(2);
    expect(job.completedChunks).toBe(2);
    expect(job.segments).toHaveLength(2);
    expect(job.segments[0].url).toMatch(/^\/audio\/[a-f0-9]{64}\/0\.wav$/);
    expect(h.provider.calls()).toBe(2);
  });

  it('rejects a missing textChunks array with 400', async () => {
    const res = await postJson(makeHarness().app, '/articles/a1/audio', {});
    expect(res.status).toBe(400);
  });

  it('rejects an over-long article with 413', async () => {
    const huge = 'a'.repeat(200_001);
    const res = await postJson(makeHarness().app, '/articles/a1/audio', {
      textChunks: [huge],
    });
    expect(res.status).toBe(413);
  });
});

describe('process-once dedup', () => {
  it('does not re-synthesize identical content for a different article', async () => {
    const h = makeHarness();
    const chunks = ['Same content.', 'Across articles.'];

    await postJson(h.app, '/articles/a1/audio', { textChunks: chunks });
    await h.worker.drain();
    expect(h.provider.calls()).toBe(2);

    // Second article, identical chunks/voice/instructions -> cache hit.
    const res = await postJson(h.app, '/articles/a2/audio', { textChunks: chunks });
    const { job } = await res.json();
    expect(job.status).toBe('ready');
    await h.worker.drain();
    expect(h.provider.calls()).toBe(2); // unchanged: no new synthesis
  });

  it('re-synthesizes when the voice changes (new hash)', async () => {
    const h = makeHarness();
    const chunks = ['Voice sensitive.'];

    await postJson(h.app, '/articles/a1/audio', { textChunks: chunks });
    await h.worker.drain();
    expect(h.provider.calls()).toBe(1);

    await postJson(h.app, '/articles/a1/audio', {
      textChunks: chunks,
      voice: 'a-different-voice',
    });
    await h.worker.drain();
    expect(h.provider.calls()).toBe(2);
  });
});

describe('retry after failure', () => {
  it('marks a job failed, then completes on retry', async () => {
    let failNext = true;
    const provider: TtsProvider & { calls: () => number } = {
      id: 'mock',
      calls: () => 0,
      async synthesizeChunk() {
        if (failNext) throw new Error('tts down');
        return { audio: new Uint8Array([9]), format: 'wav', durationMs: 500 };
      },
    };
    const h = makeHarness({ provider });

    await postJson(h.app, '/articles/a1/audio', { textChunks: ['x'] });
    await h.worker.drain();
    let job = (await (await h.app.request('/articles/a1/audio')).json()).job;
    expect(job.status).toBe('failed');
    expect(job.error).toBe('tts down');

    failNext = false;
    const retry = await postJson(h.app, '/articles/a1/audio/retry', {});
    expect(retry.status).toBe(200);
    await h.worker.drain();
    job = (await (await h.app.request('/articles/a1/audio')).json()).job;
    expect(job.status).toBe('ready');
  });

  it('returns 404 retrying an unknown article', async () => {
    const res = await postJson(makeHarness().app, '/articles/nope/audio/retry', {});
    expect(res.status).toBe(404);
  });
});

describe('GET /articles/:id/audio', () => {
  it('returns 404 for an unknown article', async () => {
    const res = await makeHarness().app.request('/articles/unknown/audio');
    expect(res.status).toBe(404);
  });
});

describe('GET /audio static serving', () => {
  it('serves stored bytes with the right content type', async () => {
    const h = makeHarness();
    await postJson(h.app, '/articles/a1/audio', { textChunks: ['hello'] });
    await h.worker.drain();
    const { job } = await (await h.app.request('/articles/a1/audio')).json();
    const res = await h.app.request(job.segments[0].url);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('audio/wav');
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(
      new Uint8Array([1, 2, 3, 4]),
    );
  });

  it('returns 404 for a missing file', async () => {
    const res = await makeHarness().app.request('/audio/deadbeef/0.wav');
    expect(res.status).toBe(404);
  });
});
