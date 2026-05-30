import { createSqliteStore } from './sqliteStore';
import type { ArticleStore } from './types';

let instance: ArticleStore | null = null;

/** Native store (iOS/Android): SQLite-backed. */
export function getStore(): ArticleStore {
  if (!instance) {
    instance = createSqliteStore();
  }
  return instance;
}

export type { ArticleStore } from './types';
