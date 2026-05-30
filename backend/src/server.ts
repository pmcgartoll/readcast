import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { AUDIO_ROUTE_PREFIX, MAX_ARTICLE_CHARS, OPENAI_TTS_VOICE } from './config';
import { MIME_BY_FORMAT, type AudioStorage } from './audioStorage';
import { ExtractionError, type ExtractResult } from './extract';
import { contentHash } from './hash';
import type { Job, JobStore } from './jobStore';
import type { Worker } from './worker';

export type AppDeps = {
  fetchPage: (url: string) => Promise<string>;
  extractArticle: (html: string, url: string) => ExtractResult;
  jobStore: JobStore;
  storage: AudioStorage;
  worker: Worker;
  /** TTS provider id, mixed into the content hash. */
  providerId: string;
};

/** Public job shape returned to the client (chunk texts are never exposed). */
function serializeJob(job: Job) {
  return {
    articleId: job.articleId,
    status: job.status,
    totalChunks: job.totalChunks,
    completedChunks: job.completedChunks,
    error: job.error,
    segments: job.segments.map((s) => ({
      index: s.index,
      url: `${AUDIO_ROUTE_PREFIX}/${job.contentHash}/${s.index}.${s.format}`,
      durationMs: s.durationMs,
    })),
  };
}

/**
 * Builds the Hono app with injected dependencies so routes can be tested
 * without real network, TTS, filesystem, or database access.
 */
export function createApp(deps: AppDeps): Hono {
  const app = new Hono();
  app.use('*', cors());

  app.get('/health', (c) => c.json({ ok: true }));

  app.post('/articles/ingest', async (c) => {
    const body = await c.req.json().catch(() => null);
    const url = body?.url;
    if (typeof url !== 'string' || !url.trim()) {
      return c.json({ error: 'A "url" string is required.' }, 400);
    }
    try {
      const html = await deps.fetchPage(url);
      const result = deps.extractArticle(html, url);
      return c.json(result);
    } catch (err) {
      const status = err instanceof ExtractionError ? 422 : 502;
      return c.json(
        { error: err instanceof Error ? err.message : 'Ingest failed.' },
        status,
      );
    }
  });

  // Start (or return) an audio job. Idempotent and non-blocking: synthesis runs
  // in the background worker; the client polls GET for status.
  app.post('/articles/:id/audio', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json().catch(() => null);
    const chunks = body?.textChunks;
    if (!Array.isArray(chunks) || chunks.some((x) => typeof x !== 'string')) {
      return c.json({ error: 'A "textChunks" string array is required.' }, 400);
    }
    const totalChars = chunks.reduce((n: number, s: string) => n + s.length, 0);
    if (totalChars > MAX_ARTICLE_CHARS) {
      return c.json({ error: 'Article is too long for audio generation.' }, 413);
    }
    const voice =
      (typeof body?.voice === 'string' && body.voice.trim()) || OPENAI_TTS_VOICE;
    const instructions =
      typeof body?.instructions === 'string' ? body.instructions.trim() : '';

    const hash = contentHash(deps.providerId, voice, instructions, chunks);
    const job = deps.jobStore.createOrGetJob({
      articleId: id,
      contentHash: hash,
      voice,
      instructions,
      chunks,
    });
    if (job.status === 'queued') deps.worker.kick();
    return c.json({ job: serializeJob(job) });
  });

  // Status poll endpoint.
  app.get('/articles/:id/audio', (c) => {
    const job = deps.jobStore.getJob(c.req.param('id'));
    if (!job) return c.json({ error: 'No audio job for this article.' }, 404);
    return c.json({ job: serializeJob(job) });
  });

  // Retry a failed (or any) job, reusing chunks already on disk.
  app.post('/articles/:id/audio/retry', (c) => {
    const id = c.req.param('id');
    const job = deps.jobStore.getJob(id);
    if (!job) return c.json({ error: 'No audio job for this article.' }, 404);
    deps.jobStore.resetForRetry(id);
    deps.worker.kick();
    return c.json({ job: serializeJob(deps.jobStore.getJob(id) as Job) });
  });

  // Static serving of stored audio. Content-addressed, so cache forever.
  app.get(`${AUDIO_ROUTE_PREFIX}/:hash/:file`, (c) => {
    const stored = deps.storage.read(c.req.param('hash'), c.req.param('file'));
    if (!stored) return c.json({ error: 'Audio not found.' }, 404);
    return new Response(new Uint8Array(stored.bytes), {
      headers: {
        'Content-Type': MIME_BY_FORMAT[stored.format],
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  });

  return app;
}
