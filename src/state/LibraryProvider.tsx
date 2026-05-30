import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import { getStore } from '../db';
import { ingestUrl } from '../services/ingest';
import type { Article } from '../types';

export type LibraryContextValue = {
  articles: Article[];
  isLoading: boolean;
  refresh: () => Promise<void>;
  addUrl: (url: string) => Promise<Article>;
  remove: (id: string) => Promise<void>;
  updateProgress: (id: string, progress: number) => Promise<void>;
  getById: (id: string) => Article | undefined;
};

const LibraryContext = createContext<LibraryContextValue | null>(null);

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const store = getStore();
    const items = await store.getArticles();
    setArticles(items);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const store = getStore();
      await store.init();
      const items = await store.getArticles();
      if (active) {
        setArticles(items);
        setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const addUrl = useCallback(
    async (url: string) => {
      const article = await ingestUrl(url);
      await refresh();
      return article;
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      await getStore().deleteArticle(id);
      await refresh();
    },
    [refresh],
  );

  const updateProgress = useCallback(async (id: string, progress: number) => {
    await getStore().setReadProgress(id, progress);
    setArticles((prev) =>
      prev.map((a) => (a.id === id ? { ...a, readProgress: progress } : a)),
    );
  }, []);

  const getById = useCallback(
    (id: string) => articles.find((a) => a.id === id),
    [articles],
  );

  const value: LibraryContextValue = {
    articles,
    isLoading,
    refresh,
    addUrl,
    remove,
    updateProgress,
    getById,
  };

  return (
    <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>
  );
}

export function useLibrary(): LibraryContextValue {
  const ctx = useContext(LibraryContext);
  if (!ctx) {
    throw new Error('useLibrary must be used within a LibraryProvider');
  }
  return ctx;
}
