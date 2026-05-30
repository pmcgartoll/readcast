import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { ensureAudio, totalDurationMs } from '../services/audio';
import type { Article } from '../types';
import { getEngine } from './engine';
import type { EngineState } from './types';

const RATES = [1, 1.25, 1.5, 1.75, 2];

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
  isQueued: (articleId: string) => boolean;
};

const PlaybackContext = createContext<PlaybackContextValue | null>(null);

export function PlaybackProvider({ children }: { children: React.ReactNode }) {
  const engine = useMemo(() => getEngine(), []);
  const [queue, setQueue] = useState<Article[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [rate, setRate] = useState(1);
  const [engineState, setEngineState] = useState<EngineState>(engine.getState());

  const queueRef = useRef(queue);
  const indexRef = useRef(currentIndex);
  queueRef.current = queue;
  indexRef.current = currentIndex;

  const loadAndPlay = useCallback(
    async (index: number) => {
      const article = queueRef.current[index];
      if (!article) return;
      setCurrentIndex(index);
      const job = await ensureAudio(article);
      await engine.load({
        articleId: article.id,
        title: article.title,
        siteName: article.siteName,
        heroImageUrl: article.heroImageUrl,
        segmentUris: job.segments.map((s) => s.uri),
        durationMs: totalDurationMs(job),
      });
      await engine.play();
    },
    [engine],
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

  const playArticle = useCallback(
    async (article: Article) => {
      setQueue([article]);
      queueRef.current = [article];
      await loadAndPlay(0);
    },
    [loadAndPlay],
  );

  const enqueue = useCallback((article: Article) => {
    setQueue((prev) =>
      prev.some((a) => a.id === article.id) ? prev : [...prev, article],
    );
  }, []);

  const removeFromQueue = useCallback((articleId: string) => {
    setQueue((prev) => prev.filter((a) => a.id !== articleId));
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
    const idx = RATES.indexOf(rate);
    const nextRate = RATES[(idx + 1) % RATES.length];
    setRate(nextRate);
    await engine.setRate(nextRate);
  }, [engine, rate]);

  const isQueued = useCallback(
    (articleId: string) => queue.some((a) => a.id === articleId),
    [queue],
  );

  const value: PlaybackContextValue = {
    queue,
    currentIndex,
    current: currentIndex >= 0 ? (queue[currentIndex] ?? null) : null,
    isPlaying: engineState.isPlaying,
    isLoading: engineState.isLoading,
    positionMs: engineState.positionMs,
    durationMs: engineState.durationMs,
    rate,
    playArticle,
    enqueue,
    removeFromQueue,
    playAt,
    toggle,
    seekTo,
    skipNext,
    skipPrev,
    cycleRate,
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
