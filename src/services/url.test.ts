import { isValidUrl, normalizeUrl } from './url';

describe('normalizeUrl', () => {
  it('adds https when scheme is missing', () => {
    expect(normalizeUrl('example.com/article')).toBe('https://example.com/article');
  });

  it('keeps existing scheme', () => {
    expect(normalizeUrl('http://example.com')).toBe('http://example.com');
    expect(normalizeUrl('  https://example.com  ')).toBe('https://example.com');
  });

  it('returns empty string for blank input', () => {
    expect(normalizeUrl('   ')).toBe('');
  });
});

describe('isValidUrl', () => {
  it('accepts hosts with a dot', () => {
    expect(isValidUrl('example.com')).toBe(true);
    expect(isValidUrl('https://sub.example.co.uk/x')).toBe(true);
  });

  it('rejects non-URLs and schemeless hosts without a dot', () => {
    expect(isValidUrl('')).toBe(false);
    expect(isValidUrl('localhost')).toBe(false);
    expect(isValidUrl('not a url')).toBe(false);
    expect(isValidUrl('ftp://example.com')).toBe(false);
  });
});
