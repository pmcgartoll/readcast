export type ArticleStatus = 'pending' | 'ready' | 'failed';

export type Article = {
  id: string;
  url: string;
  title: string;
  siteName: string;
  author?: string;
  excerpt?: string;
  heroImageUrl?: string;
  /** Cleaned HTML used by the native WebView reader. */
  contentHtml: string;
  /** Plain text used for the web reader and for TTS. */
  contentText: string;
  status: ArticleStatus;
  /** 0..1 scroll progress through the article. */
  readProgress: number;
  estimatedReadMinutes: number;
  createdAt: number;
  archivedAt?: number;
};

export type AudioJobStatus = 'idle' | 'queued' | 'generating' | 'ready' | 'failed';

export type AudioSegment = {
  index: number;
  /** Local file path on device, or a remote/sample URL in stub mode. */
  uri: string;
  durationMs: number;
};

export type AudioJob = {
  articleId: string;
  status: AudioJobStatus;
  totalChunks: number;
  completedChunks: number;
  segments: AudioSegment[];
};

export type ListenQueueItem = {
  articleId: string;
  position: number;
};
