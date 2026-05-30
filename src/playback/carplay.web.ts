export type CarPlayQueueItem = {
  articleId: string;
  title: string;
  siteName: string;
};

export type CarPlayNowPlaying = {
  articleId: string;
  title: string;
  siteName: string;
  artworkUrl?: string;
  isPlaying: boolean;
};

export interface CarPlayBridge {
  isAvailable: boolean;
  setNowPlaying(info: CarPlayNowPlaying | null): void;
  setQueue(items: CarPlayQueueItem[]): void;
  onSelectArticle(listener: (articleId: string) => void): () => void;
}

/** Web has no CarPlay; everything is a no-op. */
export function getCarPlay(): CarPlayBridge {
  return {
    isAvailable: false,
    setNowPlaying() {},
    setQueue() {},
    onSelectArticle() {
      return () => {};
    },
  };
}
