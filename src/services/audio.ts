import { DEV_STUB_MODE } from '../config';
import { getStore } from '../db';
import type { ArticleStore } from '../db/types';
import { SAMPLE_AUDIO_URL } from '../fixtures/articles';
import type { Article, AudioJob, AudioSegment } from '../types';
import { apiClient } from './api';
import { chunkText } from './textChunk';

export type AudioDeps = {
  store?: ArticleStore;
  generate?: (articleId: string, chunks: string[]) => Promise<AudioSegment[]>;
  stub?: boolean;
};

/** Voice controls forwarded to the TTS backend when generating real audio. */
export type AudioOptions = {
  voice?: string;
  instructions?: string;
};

async function stubGenerate(chunks: string[]): Promise<AudioSegment[]> {
  await delay(600);
  return chunks.map((chunk, index) => ({
    index,
    uri: SAMPLE_AUDIO_URL,
    // Roughly 14 chars/sec of speech, just for a believable progress bar.
    durationMs: Math.max(4000, Math.round((chunk.length / 14) * 1000)),
  }));
}

/**
 * Ensures audio exists for an article, generating it if needed. Persists an
 * AudioJob so the UI can show progress and reuse cached segments.
 */
export async function ensureAudio(
  article: Article,
  deps: AudioDeps = {},
  options: AudioOptions = {},
): Promise<AudioJob> {
  const store = deps.store ?? getStore();
  const stub = deps.stub ?? DEV_STUB_MODE;

  const existing = await store.getAudioJob(article.id);
  if (existing && existing.status === 'ready') {
    return existing;
  }

  const chunks = chunkText(article.contentText);
  const job: AudioJob = {
    articleId: article.id,
    status: 'generating',
    totalChunks: chunks.length,
    completedChunks: 0,
    segments: [],
  };
  await store.upsertAudioJob(job);

  try {
    const generate =
      deps.generate ??
      ((id: string, c: string[]) =>
        stub
          ? stubGenerate(c)
          : apiClient.generateAudio(id, c, options).then((r) => r.segments));
    const segments = await generate(article.id, chunks);
    const ready: AudioJob = {
      ...job,
      status: 'ready',
      completedChunks: chunks.length,
      segments,
    };
    await store.upsertAudioJob(ready);
    return ready;
  } catch (err) {
    const failed: AudioJob = { ...job, status: 'failed' };
    await store.upsertAudioJob(failed);
    throw err instanceof Error ? err : new Error('Failed to generate audio.');
  }
}

/** Total duration across all segments of a job. */
export function totalDurationMs(job: AudioJob): number {
  return job.segments.reduce((sum, s) => sum + s.durationMs, 0);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
