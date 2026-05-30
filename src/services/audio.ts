import { DEV_STUB_MODE } from '../config';
import { getStore } from '../db';
import type { ArticleStore } from '../db/types';
import { SAMPLE_AUDIO_URL } from '../fixtures/articles';
import type { Article, AudioJob, AudioJobStatus, AudioSegment } from '../types';
import { apiClient, mediaUrl, type ApiAudioJob, type AudioOptions } from './api';
import { chunkText } from './textChunk';

export type { AudioOptions } from './api';

/** Injectable backend surface so the service is testable without a network. */
export type AudioApi = {
  start: (
    articleId: string,
    chunks: string[],
    options: AudioOptions,
  ) => Promise<ApiAudioJob>;
  status: (articleId: string) => Promise<ApiAudioJob>;
  retry: (articleId: string) => Promise<ApiAudioJob>;
};

export type AudioDeps = {
  store?: ArticleStore;
  stub?: boolean;
  api?: AudioApi;
  /** Receives every intermediate job state so the UI can show live progress. */
  onUpdate?: (job: AudioJob) => void;
  pollIntervalMs?: number;
  maxPolls?: number;
  delay?: (ms: number) => Promise<void>;
};

const defaultApi: AudioApi = {
  start: (id, chunks, options) => apiClient.startAudio(id, chunks, options),
  status: (id) => apiClient.getAudioStatus(id),
  retry: (id) => apiClient.retryAudio(id),
};

/**
 * Shares a single in-flight request per article so the processing pipeline and
 * playback never trigger duplicate backend work for the same article.
 */
const inFlight = new Map<string, Promise<AudioJob>>();

function mapStatus(status: ApiAudioJob['status']): AudioJobStatus {
  return status === 'processing' ? 'generating' : status;
}

function toAudioJob(api: ApiAudioJob): AudioJob {
  return {
    articleId: api.articleId,
    status: mapStatus(api.status),
    totalChunks: api.totalChunks,
    completedChunks: api.completedChunks,
    error: api.error,
    segments: api.segments
      .slice()
      .sort((a, b) => a.index - b.index)
      .map<AudioSegment>((s) => ({
        index: s.index,
        uri: mediaUrl(s.url),
        durationMs: s.durationMs,
      })),
  };
}

function defaultDelay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function publish(
  store: ArticleStore,
  job: AudioJob,
  onUpdate?: (job: AudioJob) => void,
): Promise<AudioJob> {
  await store.upsertAudioJob(job);
  onUpdate?.(job);
  return job;
}

/** Polls the backend until the job is ready or failed, persisting each tick. */
async function pollUntilDone(
  article: Article,
  deps: AudioDeps,
  firstJob: AudioJob,
): Promise<AudioJob> {
  const store = deps.store ?? getStore();
  const api = deps.api ?? defaultApi;
  const delay = deps.delay ?? defaultDelay;
  const pollIntervalMs = deps.pollIntervalMs ?? 1500;
  const maxPolls = deps.maxPolls ?? 240;

  let job = await publish(store, firstJob, deps.onUpdate);
  let polls = 0;
  while (job.status !== 'ready' && job.status !== 'failed') {
    if (polls++ >= maxPolls) {
      throw new Error('Audio generation timed out.');
    }
    await delay(pollIntervalMs);
    job = await publish(store, toAudioJob(await api.status(article.id)), deps.onUpdate);
  }
  if (job.status === 'failed') {
    throw new Error(job.error || 'Audio generation failed.');
  }
  return job;
}

/** Stub path for DEV_STUB_MODE / web preview: a sample clip per chunk. */
async function stubEnsure(
  article: Article,
  deps: AudioDeps,
): Promise<AudioJob> {
  const store = deps.store ?? getStore();
  const delay = deps.delay ?? defaultDelay;
  const chunks = chunkText(article.contentText);
  await publish(
    store,
    {
      articleId: article.id,
      status: 'generating',
      totalChunks: chunks.length,
      completedChunks: 0,
      segments: [],
    },
    deps.onUpdate,
  );
  await delay(600);
  const segments: AudioSegment[] = chunks.map((chunk, index) => ({
    index,
    uri: SAMPLE_AUDIO_URL,
    durationMs: Math.max(4000, Math.round((chunk.length / 14) * 1000)),
  }));
  return publish(
    store,
    {
      articleId: article.id,
      status: 'ready',
      totalChunks: chunks.length,
      completedChunks: chunks.length,
      segments,
    },
    deps.onUpdate,
  );
}

async function startAndPoll(
  article: Article,
  deps: AudioDeps,
  options: AudioOptions,
): Promise<AudioJob> {
  const api = deps.api ?? defaultApi;
  const chunks = chunkText(article.contentText);
  const first = toAudioJob(await api.start(article.id, chunks, options));
  return pollUntilDone(article, deps, first);
}

function track(articleId: string, run: Promise<AudioJob>): Promise<AudioJob> {
  const guarded = run.finally(() => inFlight.delete(articleId));
  inFlight.set(articleId, guarded);
  return guarded;
}

/**
 * Ensures backend audio exists for an article and returns a ready AudioJob.
 * Reuses a locally cached ready job, dedups concurrent callers, and otherwise
 * starts a backend job and polls it to completion (persisting progress).
 */
export async function ensureAudio(
  article: Article,
  deps: AudioDeps = {},
  options: AudioOptions = {},
): Promise<AudioJob> {
  const store = deps.store ?? getStore();
  const stub = deps.stub ?? DEV_STUB_MODE;

  const existing = await store.getAudioJob(article.id);
  if (existing && existing.status === 'ready' && existing.segments.length > 0) {
    return existing;
  }

  const pending = inFlight.get(article.id);
  if (pending) return pending;

  return track(
    article.id,
    stub ? stubEnsure(article, deps) : startAndPoll(article, deps, options),
  );
}

/**
 * Forces reprocessing of a failed article: asks the backend to retry (reusing
 * any chunks already on disk) and polls to completion.
 */
export async function retryAudio(
  article: Article,
  deps: AudioDeps = {},
  options: AudioOptions = {},
): Promise<AudioJob> {
  const stub = deps.stub ?? DEV_STUB_MODE;
  if (stub) {
    inFlight.delete(article.id);
    return track(article.id, stubEnsure(article, deps));
  }
  const api = deps.api ?? defaultApi;
  return track(
    article.id,
    api.retry(article.id).then((job) => pollUntilDone(article, deps, toAudioJob(job))),
  );
}

/** Total duration across all segments of a job. */
export function totalDurationMs(job: AudioJob): number {
  return job.segments.reduce((sum, s) => sum + s.durationMs, 0);
}
