import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

import { MAX_ARTICLE_CHARS } from './config';

export type ExtractResult = {
  title: string;
  siteName: string;
  author?: string;
  excerpt?: string;
  heroImageUrl?: string;
  contentHtml: string;
  contentText: string;
};

export class ExtractionError extends Error {}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/**
 * Runs Readability over raw HTML to produce clean article content. Pure and
 * network-free so it can be unit-tested against fixture HTML.
 */
export function extractArticle(html: string, url: string): ExtractResult {
  const dom = new JSDOM(html, { url });
  const { document } = dom.window;

  const ogImage =
    document
      .querySelector('meta[property="og:image"], meta[name="twitter:image"]')
      ?.getAttribute('content') ?? undefined;

  const reader = new Readability(document);
  const article = reader.parse();

  const text = article?.textContent?.trim() ?? '';
  if (!article || text.length < 50) {
    throw new ExtractionError(
      'Could not extract a readable article from this page.',
    );
  }

  const host = hostnameOf(url);
  return {
    title: article.title?.trim() || host,
    siteName: article.siteName?.trim() || host,
    author: article.byline?.trim() || undefined,
    excerpt: article.excerpt?.trim() || undefined,
    heroImageUrl: ogImage,
    contentHtml: article.content ?? '',
    contentText: text.slice(0, MAX_ARTICLE_CHARS),
  };
}
