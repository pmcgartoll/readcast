import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { ExtractionError, extractArticle } from './extract';

const html = readFileSync(
  new URL('../fixtures/article.html', import.meta.url),
  'utf8',
);

describe('extractArticle', () => {
  it('pulls title, body text, site, author, and hero image', () => {
    const result = extractArticle(html, 'https://example.com/slow-reading');
    expect(result.title).toContain('Slow Reading');
    expect(result.siteName).toBe('Example Times');
    expect(result.author).toContain('Jordan Avery');
    expect(result.heroImageUrl).toBe('https://example.com/hero.jpg');
    expect(result.contentText).toContain('Slow reading is not about reading less');
    expect(result.contentHtml).toContain('<p');
  });

  it('throws ExtractionError when there is no readable article', () => {
    const empty = '<!DOCTYPE html><html><body><div>hi</div></body></html>';
    expect(() => extractArticle(empty, 'https://example.com')).toThrow(
      ExtractionError,
    );
  });
});
