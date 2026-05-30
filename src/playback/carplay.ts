import { NativeEventEmitter, NativeModules } from 'react-native';

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
  /** True only on a native build that includes the ReadCastCarPlay module. */
  isAvailable: boolean;
  setNowPlaying(info: CarPlayNowPlaying | null): void;
  setQueue(items: CarPlayQueueItem[]): void;
  /** Fires when the user picks an article from a CarPlay list. */
  onSelectArticle(listener: (articleId: string) => void): () => void;
}

function createNoopBridge(): CarPlayBridge {
  return {
    isAvailable: false,
    setNowPlaying() {},
    setQueue() {},
    onSelectArticle() {
      return () => {};
    },
  };
}

function createNativeBridge(native: any): CarPlayBridge {
  const emitter = new NativeEventEmitter(native);
  return {
    isAvailable: true,
    setNowPlaying(info) {
      native.setNowPlaying(info ?? null);
    },
    setQueue(items) {
      native.setQueue(items);
    },
    onSelectArticle(listener) {
      const sub = emitter.addListener('carplay:selectArticle', (e: { articleId: string }) =>
        listener(e.articleId),
      );
      return () => sub.remove();
    },
  };
}

let instance: CarPlayBridge | null = null;

/**
 * Returns the CarPlay bridge. On devices with the native module compiled in
 * (after `expo prebuild` + the config plugin), this talks to the CarPlay scene.
 * Everywhere else it is a safe no-op, so app code can call it unconditionally.
 */
export function getCarPlay(): CarPlayBridge {
  if (!instance) {
    const native = NativeModules.ReadCastCarPlay;
    instance = native ? createNativeBridge(native) : createNoopBridge();
  }
  return instance;
}
