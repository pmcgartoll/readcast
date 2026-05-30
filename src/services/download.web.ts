import type { AudioJob } from '../types';

/**
 * Web preview streams segment URLs directly (no device filesystem), so caching
 * is a no-op here. Metro picks this file for the web bundle.
 */
export async function cacheSegments(job: AudioJob): Promise<AudioJob> {
  return job;
}
