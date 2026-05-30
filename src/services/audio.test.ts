import AsyncStorage from '@react-native-async-storage/async-storage';

import { createAsyncStore } from '../db/asyncStore';
import type { Article } from '../types';
import { ensureAudio, totalDurationMs } from './audio';

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

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('ensureAudio', () => {
  it('generates segments and marks the job ready', async () => {
    const store = createAsyncStore();
    const job = await ensureAudio(makeArticle(), {
      store,
      generate: async (_id, chunks) =>
        chunks.map((_c, index) => ({ index, uri: `seg${index}`, durationMs: 1000 })),
    });

    expect(job.status).toBe('ready');
    expect(job.segments.length).toBeGreaterThan(0);
    expect(totalDurationMs(job)).toBe(job.segments.length * 1000);
  });

  it('reuses a cached ready job without regenerating', async () => {
    const store = createAsyncStore();
    const generate = jest.fn(async () => [{ index: 0, uri: 's', durationMs: 500 }]);
    const article = makeArticle();

    await ensureAudio(article, { store, generate });
    await ensureAudio(article, { store, generate });

    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('marks the job failed and rethrows on error', async () => {
    const store = createAsyncStore();
    await expect(
      ensureAudio(makeArticle(), {
        store,
        generate: async () => {
          throw new Error('tts down');
        },
      }),
    ).rejects.toThrow('tts down');

    const job = await store.getAudioJob('a1');
    expect(job?.status).toBe('failed');
  });
});
