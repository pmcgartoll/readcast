import type { Article, AudioJob, ListenQueueItem } from '../types';

/**
 * Storage seam for the library. Devices use SQLite; web and tests use an
 * AsyncStorage-backed implementation. Both satisfy this interface so the rest
 * of the app never branches on platform.
 */
export interface ArticleStore {
  init(): Promise<void>;

  getArticles(): Promise<Article[]>;
  getArticle(id: string): Promise<Article | null>;
  upsertArticle(article: Article): Promise<void>;
  deleteArticle(id: string): Promise<void>;
  setReadProgress(id: string, progress: number): Promise<void>;

  getQueue(): Promise<ListenQueueItem[]>;
  setQueue(items: ListenQueueItem[]): Promise<void>;

  getAudioJob(articleId: string): Promise<AudioJob | null>;
  upsertAudioJob(job: AudioJob): Promise<void>;
}
