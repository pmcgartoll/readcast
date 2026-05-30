import { API_BASE_URL } from '../config';
import type { AudioSegment } from '../types';

export type IngestResult = {
  title: string;
  siteName: string;
  author?: string;
  excerpt?: string;
  heroImageUrl?: string;
  contentHtml: string;
  contentText: string;
};

export type AudioResult = {
  segments: AudioSegment[];
};

/** Per-request voice controls forwarded to the backend TTS provider. */
export type AudioOptions = {
  voice?: string;
  instructions?: string;
};

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Request failed (${res.status}): ${text || res.statusText}`);
  }
  return (await res.json()) as T;
}

/** Real backend client. In DEV_STUB_MODE the services bypass this entirely. */
export const apiClient = {
  ingest(url: string): Promise<IngestResult> {
    return postJson<IngestResult>('/articles/ingest', { url });
  },
  generateAudio(
    articleId: string,
    textChunks: string[],
    options?: AudioOptions,
  ): Promise<AudioResult> {
    return postJson<AudioResult>(`/articles/${articleId}/audio`, {
      textChunks,
      voice: options?.voice,
      instructions: options?.instructions,
    });
  },
};
