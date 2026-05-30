/** Adds https:// when the user omits a scheme, and trims whitespace. */
export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/** True when the (normalized) input parses as an http(s) URL with a host. */
export function isValidUrl(input: string): boolean {
  const normalized = normalizeUrl(input);
  try {
    const url = new URL(normalized);
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      url.hostname.includes('.')
    );
  } catch {
    return false;
  }
}
