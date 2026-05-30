import { DEV_STUB_MODE } from '../config';
import { getStore } from '../db';
import type { ArticleStore } from '../db/types';
import { nextStubArticle } from '../fixtures/articles';
import type { Article } from '../types';
import { apiClient, type IngestResult } from './api';
import { createId } from './id';
import { estimateReadingMinutes, hostnameFromUrl } from './format';
import { paragraphsToHtml } from './readerHtml';
import { isValidUrl, normalizeUrl } from './url';

export type IngestDeps = {
  store?: ArticleStore;
  /** Override the fetch step; defaults to stub or real API based on config. */
  fetchContent?: (url: string) => Promise<IngestResult>;
  stub?: boolean;
};

async function defaultFetchContent(
  url: string,
  stub: boolean,
): Promise<IngestResult> {
  if (stub) {
    // Simulate network latency so loading states are visible in the preview.
    await delay(450);
    const article = nextStubArticle();
    return {
      title: article.title,
      siteName: article.siteName,
      author: article.author,
      excerpt: article.excerpt,
      heroImageUrl: article.heroImageUrl,
      contentHtml: paragraphsToHtml(article.paragraphs),
      contentText: article.paragraphs.join('\n\n'),
    };
  }
  return apiClient.ingest(url);
}

/**
 * Saves a URL: writes a `pending` row immediately, fetches/extracts content,
 * then updates the row to `ready` (or `failed`). Returns the final article.
 */
export async function ingestUrl(
  rawUrl: string,
  deps: IngestDeps = {},
): Promise<Article> {
  if (!isValidUrl(rawUrl)) {
    throw new Error('Enter a valid web address.');
  }
  const store = deps.store ?? getStore();
  const stub = deps.stub ?? DEV_STUB_MODE;
  const url = normalizeUrl(rawUrl);

  const pending: Article = {
    id: createId(),
    url,
    title: hostnameFromUrl(url),
    siteName: hostnameFromUrl(url),
    contentHtml: '',
    contentText: '',
    status: 'pending',
    readProgress: 0,
    estimatedReadMinutes: 0,
    createdAt: Date.now(),
  };
  await store.upsertArticle(pending);

  try {
    const fetchContent =
      deps.fetchContent ?? ((u: string) => defaultFetchContent(u, stub));
    const result = await fetchContent(url);
    const ready: Article = {
      ...pending,
      title: result.title || pending.title,
      siteName: result.siteName || hostnameFromUrl(url),
      author: result.author,
      excerpt: result.excerpt,
      heroImageUrl: result.heroImageUrl,
      contentHtml: result.contentHtml,
      contentText: result.contentText,
      status: 'ready',
      estimatedReadMinutes: estimateReadingMinutes(result.contentText),
    };
    await store.upsertArticle(ready);
    return ready;
  } catch (err) {
    const failed: Article = { ...pending, status: 'failed' };
    await store.upsertArticle(failed);
    throw err instanceof Error ? err : new Error('Failed to save article.');
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
