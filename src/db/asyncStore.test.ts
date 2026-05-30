import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Article } from '../types';
import { createAsyncStore } from './asyncStore';

function article(id: string, createdAt: number): Article {
  return {
    id,
    url: `https://example.com/${id}`,
    title: id,
    siteName: 'Example',
    contentHtml: '<p>x</p>',
    contentText: 'x',
    status: 'ready',
    readProgress: 0,
    estimatedReadMinutes: 1,
    createdAt,
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('asyncStore', () => {
  it('upserts and returns articles newest-first', async () => {
    const store = createAsyncStore();
    await store.upsertArticle(article('old', 1));
    await store.upsertArticle(article('new', 2));
    const all = await store.getArticles();
    expect(all.map((a) => a.id)).toEqual(['new', 'old']);
  });

  it('updates an existing article on upsert', async () => {
    const store = createAsyncStore();
    await store.upsertArticle(article('a', 1));
    await store.upsertArticle({ ...article('a', 1), title: 'Updated' });
    const all = await store.getArticles();
    expect(all).toHaveLength(1);
    expect(all[0].title).toBe('Updated');
  });

  it('clamps read progress', async () => {
    const store = createAsyncStore();
    await store.upsertArticle(article('a', 1));
    await store.setReadProgress('a', 5);
    expect((await store.getArticle('a'))?.readProgress).toBe(1);
    await store.setReadProgress('a', -2);
    expect((await store.getArticle('a'))?.readProgress).toBe(0);
  });

  it('deletes an article and its queue entry', async () => {
    const store = createAsyncStore();
    await store.upsertArticle(article('a', 1));
    await store.setQueue([{ articleId: 'a', position: 0 }]);
    await store.deleteArticle('a');
    expect(await store.getArticle('a')).toBeNull();
    expect(await store.getQueue()).toHaveLength(0);
  });

  it('persists audio jobs', async () => {
    const store = createAsyncStore();
    await store.upsertAudioJob({
      articleId: 'a',
      status: 'ready',
      totalChunks: 2,
      completedChunks: 2,
      segments: [{ index: 0, uri: 's0', durationMs: 100 }],
    });
    const job = await store.getAudioJob('a');
    expect(job?.status).toBe('ready');
    expect(job?.segments).toHaveLength(1);
  });
});
