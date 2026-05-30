import AsyncStorage from '@react-native-async-storage/async-storage';

import { createAsyncStore } from '../db/asyncStore';
import type { Article } from '../types';
import type { ApiAudioJob } from './api';
import { ensureAudio, retryAudio, totalDurationMs, type AudioApi } from './audio';

function makeArticle(overrides: Partial<Article> = {}): Article {
  return {
    id: 'a1',
    url: 'https://example.com',
    title: 'T',
    siteName: 'S',
    contentHtml: '<p>x</p>',
    contentText: 'Sentence one. Sentence two. Sentence three.',
    status: 'ready',
    readProgress: 0,
    estimatedReadMinutes: 1,
    createdAt: 1,
    ...overrides,
  };
}

const readyJob = (id: string): ApiAudioJob => ({
  articleId: id,
  status: 'ready',
  totalChunks: 1,
  completedChunks: 1,
  segments: [{ index: 0, url: '/audio/hash/0.wav', durationMs: 1000 }],
});

const queuedJob = (id: string): ApiAudioJob => ({
  articleId: id,
  status: 'queued',
  totalChunks: 1,
  completedChunks: 0,
  segments: [],
});

function makeApi(overrides: Partial<AudioApi> = {}): AudioApi {
  return {
    start: jest.fn(async (id: string) => queuedJob(id)),
    status: jest.fn(async (id: string) => readyJob(id)),
    retry: jest.fn(async (id: string) => queuedJob(id)),
    ...overrides,
  };
}

const fastDeps = (api: AudioApi) => ({
  store: createAsyncStore(),
  stub: false,
  api,
  delay: async () => {},
  pollIntervalMs: 0,
});

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('ensureAudio (start + poll)', () => {
  it('starts a backend job, polls to ready, and maps segment urls', async () => {
    const api = makeApi();
    const job = await ensureAudio(makeArticle(), fastDeps(api));

    expect(job.status).toBe('ready');
    expect(api.start).toHaveBeenCalledTimes(1);
    expect(api.status).toHaveBeenCalledTimes(1);
    expect(job.segments[0].uri).toContain('/audio/hash/0.wav');
    expect(totalDurationMs(job)).toBe(1000);
  });

  it('reuses a cached ready job without calling the backend again', async () => {
    const api = makeApi();
    const store = createAsyncStore();
    const article = makeArticle();

    await ensureAudio(article, { ...fastDeps(api), store });
    await ensureAudio(article, { ...fastDeps(api), store });

    expect(api.start).toHaveBeenCalledTimes(1);
  });

  it('dedups concurrent callers into a single backend request', async () => {
    const api = makeApi({
      start: jest.fn(async (id: string) => queuedJob(id)),
    });
    const deps = fastDeps(api);
    const article = makeArticle();

    const [a, b] = await Promise.all([
      ensureAudio(article, deps),
      ensureAudio(article, deps),
    ]);

    expect(a.status).toBe('ready');
    expect(b.status).toBe('ready');
    expect(api.start).toHaveBeenCalledTimes(1);
  });

  it('marks the job failed and rethrows on backend failure', async () => {
    const store = createAsyncStore();
    const api = makeApi({
      status: jest.fn(async (id: string) => ({
        ...queuedJob(id),
        status: 'failed' as const,
        error: 'tts down',
      })),
    });

    await expect(
      ensureAudio(makeArticle(), { ...fastDeps(api), store }),
    ).rejects.toThrow('tts down');

    const job = await store.getAudioJob('a1');
    expect(job?.status).toBe('failed');
    expect(job?.error).toBe('tts down');
  });
});

describe('retryAudio', () => {
  it('asks the backend to retry, then polls to ready', async () => {
    const api = makeApi();
    const job = await retryAudio(makeArticle(), fastDeps(api));

    expect(api.retry).toHaveBeenCalledTimes(1);
    expect(api.start).not.toHaveBeenCalled();
    expect(job.status).toBe('ready');
  });
});
