import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Article, AudioJob, ListenQueueItem } from '../types';
import type { ArticleStore } from './types';

const KEYS = {
  articles: 'readcast:articles',
  queue: 'readcast:queue',
  audioJobs: 'readcast:audioJobs',
} as const;

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

/**
 * AsyncStorage-backed store. Used on web and in tests. Simple JSON blobs are
 * fine for a personal library; the SQLite store handles device scale.
 */
export function createAsyncStore(): ArticleStore {
  return {
    async init() {
      // Nothing to migrate; keys are created lazily.
    },

    async getArticles() {
      const articles = await readJson<Article[]>(KEYS.articles, []);
      return [...articles].sort((a, b) => b.createdAt - a.createdAt);
    },

    async getArticle(id) {
      const articles = await readJson<Article[]>(KEYS.articles, []);
      return articles.find((a) => a.id === id) ?? null;
    },

    async upsertArticle(article) {
      const articles = await readJson<Article[]>(KEYS.articles, []);
      const next = articles.filter((a) => a.id !== article.id);
      next.push(article);
      await writeJson(KEYS.articles, next);
    },

    async deleteArticle(id) {
      const articles = await readJson<Article[]>(KEYS.articles, []);
      await writeJson(
        KEYS.articles,
        articles.filter((a) => a.id !== id),
      );
      const queue = await readJson<ListenQueueItem[]>(KEYS.queue, []);
      await writeJson(
        KEYS.queue,
        queue.filter((q) => q.articleId !== id),
      );
    },

    async setReadProgress(id, progress) {
      const articles = await readJson<Article[]>(KEYS.articles, []);
      const next = articles.map((a) =>
        a.id === id ? { ...a, readProgress: clamp01(progress) } : a,
      );
      await writeJson(KEYS.articles, next);
    },

    async getQueue() {
      const queue = await readJson<ListenQueueItem[]>(KEYS.queue, []);
      return [...queue].sort((a, b) => a.position - b.position);
    },

    async setQueue(items) {
      await writeJson(KEYS.queue, items);
    },

    async getAudioJob(articleId) {
      const jobs = await readJson<Record<string, AudioJob>>(KEYS.audioJobs, {});
      return jobs[articleId] ?? null;
    },

    async upsertAudioJob(job) {
      const jobs = await readJson<Record<string, AudioJob>>(KEYS.audioJobs, {});
      jobs[job.articleId] = job;
      await writeJson(KEYS.audioJobs, jobs);
    },
  };
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}
