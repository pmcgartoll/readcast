import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { MAX_ARTICLE_CHARS } from './config';
import { ExtractionError, type ExtractResult } from './extract';
import type { TtsProvider } from './tts/types';

export type AppDeps = {
  fetchPage: (url: string) => Promise<string>;
  extractArticle: (html: string, url: string) => ExtractResult;
  ttsProvider: TtsProvider;
};

/**
 * Builds the Hono app with injected dependencies so routes can be tested
 * without real network or TTS access.
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

  app.post('/articles/:id/audio', async (c) => {
    const body = await c.req.json().catch(() => null);
    const chunks = body?.textChunks;
    if (!Array.isArray(chunks) || chunks.some((c2) => typeof c2 !== 'string')) {
      return c.json({ error: 'A "textChunks" string array is required.' }, 400);
    }
    const totalChars = chunks.reduce((n: number, s: string) => n + s.length, 0);
    if (totalChars > MAX_ARTICLE_CHARS) {
      return c.json({ error: 'Article is too long for audio generation.' }, 413);
    }
    const voice = typeof body?.voice === 'string' ? body.voice : undefined;
    const instructions =
      typeof body?.instructions === 'string' ? body.instructions : undefined;
    try {
      const segments = await deps.ttsProvider.synthesize(chunks, {
        voice,
        instructions,
      });
      return c.json({ segments });
    } catch (err) {
      return c.json(
        { error: err instanceof Error ? err.message : 'Audio generation failed.' },
        502,
      );
    }
  });

  return app;
}
