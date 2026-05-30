import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { PLAYBACK_RATES } from '../config';
import { getStore } from '../db';
import { totalDurationMs } from '../services/audio';
import { cacheSegments } from '../services/download';
import { useAudioProcessing } from '../state/AudioProcessingProvider';
import { useSettings } from '../state/SettingsProvider';
import type { Article } from '../types';
import { getCarPlay } from './carplay';
import { getEngine } from './engine';
import type { EngineState } from './types';

export type PlaybackContextValue = {
  queue: Article[];
  currentIndex: number;
  current: Article | null;
  isPlaying: boolean;
  isLoading: boolean;
  positionMs: number;
  durationMs: number;
  rate: number;
  playArticle: (article: Article) => Promise<void>;
  enqueue: (article: Article) => void;
  removeFromQueue: (articleId: string) => void;
  playAt: (index: number) => Promise<void>;
  toggle: () => Promise<void>;
  seekTo: (positionMs: number) => Promise<void>;
  skipNext: () => Promise<void>;
  skipPrev: () => Promise<void>;
  cycleRate: () => Promise<void>;
  setRate: (rate: number) => Promise<void>;
  isQueued: (articleId: string) => boolean;
};

const PlaybackContext = createContext<PlaybackContextValue | null>(null);

export function PlaybackProvider({ children }: { children: React.ReactNode }) {
  const engine = useMemo(() => getEngine(), []);
  const carplay = useMemo(() => getCarPlay(), []);
  const { playbackRate, setPlaybackRate } = useSettings();
  const { ensure } = useAudioProcessing();
  const [queue, setQueue] = useState<Article[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [engineState, setEngineState] = useState<EngineState>(engine.getState());

  const queueRef = useRef(queue);
  const indexRef = useRef(currentIndex);
  const rateRef = useRef(playbackRate);
  queueRef.current = queue;
  indexRef.current = currentIndex;
  rateRef.current = playbackRate;

  // Keep the engine's rate in sync with the saved default (and with changes).
  useEffect(() => {
    void engine.setRate(playbackRate);
  }, [engine, playbackRate]);

  const loadAndPlay = useCallback(
    async (index: number) => {
      const article = queueRef.current[index];
      if (!article) return;
      setCurrentIndex(index);
      const job = await ensure(article);
      // Download to the device cache so playback is local + offline-capable.
      const localized = await cacheSegments(job);
      if (localized !== job) {
        await getStore().upsertAudioJob(localized);
      }
      await engine.load({
        articleId: article.id,
        title: article.title,
        siteName: article.siteName,
        heroImageUrl: article.heroImageUrl,
        segmentUris: localized.segments.map((s) => s.uri),
        durationMs: totalDurationMs(localized),
      });
      // Re-apply rate in case the native engine resets it on load.
      await engine.setRate(rateRef.current);
      await engine.play();
    },
    [engine, ensure],
  );

  useEffect(() => {
    const unsubState = engine.subscribe(setEngineState);
    const unsubEnded = engine.onEnded(() => {
      const next = indexRef.current + 1;
      if (next < queueRef.current.length) {
        void loadAndPlay(next);
      }
    });
    return () => {
      unsubState();
      unsubEnded();
    };
  }, [engine, loadAndPlay]);

  // Let CarPlay drive selection: tapping an article in the car plays it here.
  useEffect(() => {
    return carplay.onSelectArticle((articleId) => {
      const index = queueRef.current.findIndex((a) => a.id === articleId);
      if (index >= 0) void loadAndPlay(index);
    });
  }, [carplay, loadAndPlay]);

  // Mirror the listen queue to CarPlay.
  useEffect(() => {
    carplay.setQueue(
      queue.map((a) => ({ articleId: a.id, title: a.title, siteName: a.siteName })),
    );
  }, [carplay, queue]);

  // Mirror Now Playing to CarPlay (and, on a native build, the lock screen).
  const current = currentIndex >= 0 ? (queue[currentIndex] ?? null) : null;
  useEffect(() => {
    carplay.setNowPlaying(
      current
        ? {
            articleId: current.id,
            title: current.title,
            siteName: current.siteName,
            artworkUrl: current.heroImageUrl,
            isPlaying: engineState.isPlaying,
          }
        : null,
    );
  }, [carplay, current, engineState.isPlaying]);

  const playArticle = useCallback(
    async (article: Article) => {
      const existing = queueRef.current.findIndex((a) => a.id === article.id);
      if (existing >= 0) {
        await loadAndPlay(existing);
        return;
      }
      const next = [...queueRef.current, article];
      queueRef.current = next;
      setQueue(next);
      await loadAndPlay(next.length - 1);
    },
    [loadAndPlay],
  );

  const enqueue = useCallback(
    (article: Article) => {
      if (queueRef.current.some((a) => a.id === article.id)) return;
      const next = [...queueRef.current, article];
      queueRef.current = next;
      setQueue(next);
      // If nothing is loaded yet, start the newly queued item.
      if (indexRef.current < 0) {
        void loadAndPlay(next.length - 1);
      }
    },
    [loadAndPlay],
  );

  const removeFromQueue = useCallback((articleId: string) => {
    const currentId = queueRef.current[indexRef.current]?.id;
    const next = queueRef.current.filter((a) => a.id !== articleId);
    queueRef.current = next;
    setQueue(next);
    setCurrentIndex(currentId ? next.findIndex((a) => a.id === currentId) : -1);
  }, []);

  const playAt = useCallback(
    async (index: number) => {
      await loadAndPlay(index);
    },
    [loadAndPlay],
  );

  const toggle = useCallback(async () => {
    if (engineState.isPlaying) {
      await engine.pause();
    } else if (engineState.durationMs > 0) {
      await engine.play();
    } else if (queueRef.current.length > 0) {
      await loadAndPlay(Math.max(0, indexRef.current));
    }
  }, [engine, engineState.isPlaying, engineState.durationMs, loadAndPlay]);

  const seekTo = useCallback(
    async (positionMs: number) => {
      await engine.seekTo(positionMs);
    },
    [engine],
  );

  const skipNext = useCallback(async () => {
    const next = indexRef.current + 1;
    if (next < queueRef.current.length) await loadAndPlay(next);
  }, [loadAndPlay]);

  const skipPrev = useCallback(async () => {
    if (engineState.positionMs > 3000) {
      await engine.seekTo(0);
      return;
    }
    const prev = indexRef.current - 1;
    if (prev >= 0) await loadAndPlay(prev);
    else await engine.seekTo(0);
  }, [engine, engineState.positionMs, loadAndPlay]);

  const cycleRate = useCallback(async () => {
    const idx = PLAYBACK_RATES.indexOf(rateRef.current);
    const nextRate = PLAYBACK_RATES[(idx + 1) % PLAYBACK_RATES.length];
    setPlaybackRate(nextRate);
    await engine.setRate(nextRate);
  }, [engine, setPlaybackRate]);

  const setRate = useCallback(
    async (next: number) => {
      setPlaybackRate(next);
      await engine.setRate(next);
    },
    [engine, setPlaybackRate],
  );

  const isQueued = useCallback(
    (articleId: string) => queue.some((a) => a.id === articleId),
    [queue],
  );

  const value: PlaybackContextValue = {
    queue,
    currentIndex,
    current,
    isPlaying: engineState.isPlaying,
    isLoading: engineState.isLoading,
    positionMs: engineState.positionMs,
    durationMs: engineState.durationMs,
    rate: playbackRate,
    playArticle,
    enqueue,
    removeFromQueue,
    playAt,
    toggle,
    seekTo,
    skipNext,
    skipPrev,
    cycleRate,
    setRate,
    isQueued,
  };

  return (
    <PlaybackContext.Provider value={value}>{children}</PlaybackContext.Provider>
  );
}

export function usePlayback(): PlaybackContextValue {
  const ctx = useContext(PlaybackContext);
  if (!ctx) {
    throw new Error('usePlayback must be used within a PlaybackProvider');
  }
  return ctx;
}
