import { createAsyncStore } from './asyncStore';
import type { ArticleStore } from './types';

let instance: ArticleStore | null = null;

/**
 * Default store (web + tests): AsyncStorage-backed. Native platforms resolve
 * `index.native.ts` instead, which returns the SQLite store. Keeping these
 * split means `expo-sqlite` is never pulled into the web bundle.
 */
export function getStore(): ArticleStore {
  if (!instance) {
    instance = createAsyncStore();
  }
  return instance;
}

export type { ArticleStore } from './types';
