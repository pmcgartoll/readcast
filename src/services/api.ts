import { API_BASE_URL } from '../config';

export type IngestResult = {
  title: string;
  siteName: string;
  author?: string;
  excerpt?: string;
  heroImageUrl?: string;
  contentHtml: string;
  contentText: string;
};

/** Backend job status. `processing` maps to the app's `generating`. */
export type ApiJobStatus = 'queued' | 'processing' | 'ready' | 'failed';

export type ApiJobSegment = {
  index: number;
  /** Path under the backend (composed against API_BASE_URL via `mediaUrl`). */
  url: string;
  durationMs: number;
};

export type ApiAudioJob = {
  articleId: string;
  status: ApiJobStatus;
  totalChunks: number;
  completedChunks: number;
  error?: string;
  segments: ApiJobSegment[];
};

/** Per-request voice controls forwarded to the backend TTS provider. */
export type AudioOptions = {
  voice?: string;
  instructions?: string;
};

async function postJson<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function getJson<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'GET' });
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, init);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Request failed (${res.status}): ${text || res.statusText}`);
  }
  return (await res.json()) as T;
}

/** Turns a backend-relative media path into an absolute, fetchable URL. */
export function mediaUrl(path: string): string {
  if (/^https?:|^file:|^data:/.test(path)) return path;
  return `${API_BASE_URL}${path}`;
}

/** Real backend client. In DEV_STUB_MODE the services bypass this entirely. */
export const apiClient = {
  ingest(url: string): Promise<IngestResult> {
    return postJson<IngestResult>('/articles/ingest', { url });
  },
  /** Starts (or returns) a backend audio job. Non-blocking. */
  startAudio(
    articleId: string,
    textChunks: string[],
    options?: AudioOptions,
  ): Promise<ApiAudioJob> {
    return postJson<{ job: ApiAudioJob }>(`/articles/${articleId}/audio`, {
      textChunks,
      voice: options?.voice,
      instructions: options?.instructions,
    }).then((r) => r.job);
  },
  /** Polls the current job status. */
  getAudioStatus(articleId: string): Promise<ApiAudioJob> {
    return getJson<{ job: ApiAudioJob }>(`/articles/${articleId}/audio`).then(
      (r) => r.job,
    );
  },
  /** Re-enqueues a failed job for retry. */
  retryAudio(articleId: string): Promise<ApiAudioJob> {
    return postJson<{ job: ApiAudioJob }>(
      `/articles/${articleId}/audio/retry`,
      {},
    ).then((r) => r.job);
  },
};
