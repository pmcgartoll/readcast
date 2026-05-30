const FETCH_TIMEOUT_MS = 15_000;
const USER_AGENT =
  'ReadCastBot/0.1 (+https://readcast.app; like Mozilla/5.0)';

/** Fetches a web page's HTML with a timeout and a friendly User-Agent. */
export async function fetchPage(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,*/*' },
      redirect: 'follow',
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`Upstream returned ${res.status}`);
    }
    return await res.text();
  } finally {
    clearTimeout(timeout);
  }
}
