import * as SQLite from 'expo-sqlite';

import type { Article, AudioJob, ListenQueueItem } from '../types';
import type { ArticleStore } from './types';

type ArticleRow = {
  id: string;
  url: string;
  title: string;
  siteName: string;
  author: string | null;
  excerpt: string | null;
  heroImageUrl: string | null;
  contentHtml: string;
  contentText: string;
  status: Article['status'];
  readProgress: number;
  estimatedReadMinutes: number;
  createdAt: number;
  archivedAt: number | null;
};

function rowToArticle(r: ArticleRow): Article {
  return {
    id: r.id,
    url: r.url,
    title: r.title,
    siteName: r.siteName,
    author: r.author ?? undefined,
    excerpt: r.excerpt ?? undefined,
    heroImageUrl: r.heroImageUrl ?? undefined,
    contentHtml: r.contentHtml,
    contentText: r.contentText,
    status: r.status,
    readProgress: r.readProgress,
    estimatedReadMinutes: r.estimatedReadMinutes,
    createdAt: r.createdAt,
    archivedAt: r.archivedAt ?? undefined,
  };
}

/**
 * SQLite-backed store for iOS/Android. Audio segments are stored as a JSON
 * column on the job row since they are always read/written together.
 */
export function createSqliteStore(): ArticleStore {
  let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

  async function db(): Promise<SQLite.SQLiteDatabase> {
    if (!dbPromise) {
      dbPromise = SQLite.openDatabaseAsync('readcast.db');
    }
    return dbPromise;
  }

  return {
    async init() {
      const d = await db();
      await d.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS articles (
          id TEXT PRIMARY KEY NOT NULL,
          url TEXT NOT NULL,
          title TEXT NOT NULL,
          siteName TEXT NOT NULL,
          author TEXT,
          excerpt TEXT,
          heroImageUrl TEXT,
          contentHtml TEXT NOT NULL,
          contentText TEXT NOT NULL,
          status TEXT NOT NULL,
          readProgress REAL NOT NULL DEFAULT 0,
          estimatedReadMinutes INTEGER NOT NULL DEFAULT 0,
          createdAt INTEGER NOT NULL,
          archivedAt INTEGER
        );
        CREATE TABLE IF NOT EXISTS queue (
          articleId TEXT PRIMARY KEY NOT NULL,
          position INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS audio_jobs (
          articleId TEXT PRIMARY KEY NOT NULL,
          status TEXT NOT NULL,
          totalChunks INTEGER NOT NULL,
          completedChunks INTEGER NOT NULL,
          segments TEXT NOT NULL
        );
      `);
    },

    async getArticles() {
      const d = await db();
      const rows = await d.getAllAsync<ArticleRow>(
        'SELECT * FROM articles ORDER BY createdAt DESC',
      );
      return rows.map(rowToArticle);
    },

    async getArticle(id) {
      const d = await db();
      const row = await d.getFirstAsync<ArticleRow>(
        'SELECT * FROM articles WHERE id = ?',
        id,
      );
      return row ? rowToArticle(row) : null;
    },

    async upsertArticle(a) {
      const d = await db();
      await d.runAsync(
        `INSERT INTO articles
          (id, url, title, siteName, author, excerpt, heroImageUrl, contentHtml,
           contentText, status, readProgress, estimatedReadMinutes, createdAt, archivedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           url=excluded.url, title=excluded.title, siteName=excluded.siteName,
           author=excluded.author, excerpt=excluded.excerpt,
           heroImageUrl=excluded.heroImageUrl, contentHtml=excluded.contentHtml,
           contentText=excluded.contentText, status=excluded.status,
           readProgress=excluded.readProgress,
           estimatedReadMinutes=excluded.estimatedReadMinutes,
           archivedAt=excluded.archivedAt`,
        a.id,
        a.url,
        a.title,
        a.siteName,
        a.author ?? null,
        a.excerpt ?? null,
        a.heroImageUrl ?? null,
        a.contentHtml,
        a.contentText,
        a.status,
        a.readProgress,
        a.estimatedReadMinutes,
        a.createdAt,
        a.archivedAt ?? null,
      );
    },

    async deleteArticle(id) {
      const d = await db();
      await d.runAsync('DELETE FROM articles WHERE id = ?', id);
      await d.runAsync('DELETE FROM queue WHERE articleId = ?', id);
      await d.runAsync('DELETE FROM audio_jobs WHERE articleId = ?', id);
    },

    async setReadProgress(id, progress) {
      const d = await db();
      const clamped = Math.max(0, Math.min(1, progress));
      await d.runAsync(
        'UPDATE articles SET readProgress = ? WHERE id = ?',
        clamped,
        id,
      );
    },

    async getQueue() {
      const d = await db();
      return d.getAllAsync<ListenQueueItem>(
        'SELECT articleId, position FROM queue ORDER BY position ASC',
      );
    },

    async setQueue(items) {
      const d = await db();
      await d.withTransactionAsync(async () => {
        await d.runAsync('DELETE FROM queue');
        for (const item of items) {
          await d.runAsync(
            'INSERT INTO queue (articleId, position) VALUES (?, ?)',
            item.articleId,
            item.position,
          );
        }
      });
    },

    async getAudioJob(articleId) {
      const d = await db();
      const row = await d.getFirstAsync<{
        articleId: string;
        status: AudioJob['status'];
        totalChunks: number;
        completedChunks: number;
        segments: string;
      }>('SELECT * FROM audio_jobs WHERE articleId = ?', articleId);
      if (!row) return null;
      return {
        articleId: row.articleId,
        status: row.status,
        totalChunks: row.totalChunks,
        completedChunks: row.completedChunks,
        segments: JSON.parse(row.segments),
      };
    },

    async upsertAudioJob(job) {
      const d = await db();
      await d.runAsync(
        `INSERT INTO audio_jobs (articleId, status, totalChunks, completedChunks, segments)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(articleId) DO UPDATE SET
           status=excluded.status, totalChunks=excluded.totalChunks,
           completedChunks=excluded.completedChunks, segments=excluded.segments`,
        job.articleId,
        job.status,
        job.totalChunks,
        job.completedChunks,
        JSON.stringify(job.segments),
      );
    },
  };
}
