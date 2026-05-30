import AsyncStorage from '@react-native-async-storage/async-storage';

import { createAsyncStore } from '../db/asyncStore';
import { ingestUrl } from './ingest';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('ingestUrl', () => {
  it('rejects invalid URLs before touching the store', async () => {
    const store = createAsyncStore();
    await expect(ingestUrl('not a url', { store })).rejects.toThrow(
      /valid web address/i,
    );
    expect(await store.getArticles()).toHaveLength(0);
  });

  it('saves a ready article with extracted content and reading time', async () => {
    const store = createAsyncStore();
    const article = await ingestUrl('example.com/post', {
      store,
      fetchContent: async () => ({
        title: 'Hello World',
        siteName: 'Example',
        contentHtml: '<p>Body</p>',
        contentText: Array.from({ length: 460 }, () => 'word').join(' '),
      }),
    });

    expect(article.status).toBe('ready');
    expect(article.title).toBe('Hello World');
    expect(article.url).toBe('https://example.com/post');
    expect(article.estimatedReadMinutes).toBeGreaterThanOrEqual(1);

    const stored = await store.getArticles();
    expect(stored).toHaveLength(1);
    expect(stored[0].status).toBe('ready');
  });

  it('marks the article failed and rethrows when extraction fails', async () => {
    const store = createAsyncStore();
    await expect(
      ingestUrl('example.com/bad', {
        store,
        fetchContent: async () => {
          throw new Error('extraction boom');
        },
      }),
    ).rejects.toThrow('extraction boom');

    const stored = await store.getArticles();
    expect(stored).toHaveLength(1);
    expect(stored[0].status).toBe('failed');
  });
});
