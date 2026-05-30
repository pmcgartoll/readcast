import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { getStore } from '../db';
import { ensureAudio, retryAudio } from '../services/audio';
import type { Article, AudioJob, AudioJobStatus } from '../types';
import { useLibrary } from './LibraryProvider';
import { useSettings } from './SettingsProvider';

export type AudioProcessingContextValue = {
  /** Current audio job per article id, kept live as processing progresses. */
  jobs: Record<string, AudioJob>;
  getStatus: (articleId: string) => AudioJobStatus | undefined;
  getJob: (articleId: string) => AudioJob | undefined;
  /** Ensures a ready job exists (used by playback); shares in-flight work. */
  ensure: (article: Article) => Promise<AudioJob>;
  /** User-triggered retry of a failed job. */
  retry: (articleId: string) => void;
};

const AudioProcessingContext =
  createContext<AudioProcessingContextValue | null>(null);

/**
 * Drives the processing pipeline: as articles become `ready` (ingested), it
 * starts backend audio jobs for them (one at a time), polls for progress, and
 * exposes per-article status + a retry action. Playback also funnels through
 * `ensure` so it shares the same in-flight work and status.
 */
export function AudioProcessingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { articles } = useLibrary();
  const { voiceInstructions } = useSettings();
  const [jobs, setJobs] = useState<Record<string, AudioJob>>({});

  const jobsRef = useRef(jobs);
  jobsRef.current = jobs;
  const articlesRef = useRef(articles);
  articlesRef.current = articles;
  const instructionsRef = useRef(voiceInstructions);
  instructionsRef.current = voiceInstructions;

  const queueRef = useRef<string[]>([]);
  const runningRef = useRef(false);

  const onUpdate = useCallback((job: AudioJob) => {
    setJobs((prev) => ({ ...prev, [job.articleId]: job }));
  }, []);

  const ensure = useCallback(
    (article: Article) =>
      ensureAudio(
        article,
        { onUpdate },
        { instructions: instructionsRef.current },
      ),
    [onUpdate],
  );
  const ensureRef = useRef(ensure);
  ensureRef.current = ensure;

  // Sequentially work through queued article ids (concurrency 1).
  const pump = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    try {
      while (queueRef.current.length > 0) {
        const id = queueRef.current[0];
        const article = articlesRef.current.find((a) => a.id === id);
        if (article) {
          try {
            await ensureRef.current(article);
          } catch {
            // Failure is already reflected in job state via onUpdate.
          }
        }
        queueRef.current.shift();
      }
    } finally {
      runningRef.current = false;
    }
  }, []);

  // Hydrate persisted job statuses once on mount.
  useEffect(() => {
    let active = true;
    (async () => {
      const stored = await getStore().getAudioJobs();
      if (!active || stored.length === 0) return;
      setJobs((prev) => {
        const next = { ...prev };
        for (const job of stored) next[job.articleId] = job;
        return next;
      });
    })();
    return () => {
      active = false;
    };
  }, []);

  // Enqueue ready articles that still need audio (new, or interrupted).
  useEffect(() => {
    let enqueued = false;
    for (const article of articles) {
      if (article.status !== 'ready') continue;
      const job = jobsRef.current[article.id];
      const needsWork =
        !job || job.status === 'queued' || job.status === 'generating';
      if (!needsWork) continue;
      if (queueRef.current.includes(article.id)) continue;
      queueRef.current.push(article.id);
      enqueued = true;
    }
    if (enqueued) void pump();
  }, [articles, pump]);

  const retry = useCallback(
    (articleId: string) => {
      const article = articlesRef.current.find((a) => a.id === articleId);
      if (!article) return;
      void retryAudio(
        article,
        { onUpdate },
        { instructions: instructionsRef.current },
      ).catch(() => {
        // Failure already reflected in job state via onUpdate.
      });
    },
    [onUpdate],
  );

  const getStatus = useCallback(
    (articleId: string) => jobs[articleId]?.status,
    [jobs],
  );
  const getJob = useCallback(
    (articleId: string) => jobs[articleId],
    [jobs],
  );

  const value = useMemo<AudioProcessingContextValue>(
    () => ({ jobs, getStatus, getJob, ensure, retry }),
    [jobs, getStatus, getJob, ensure, retry],
  );

  return (
    <AudioProcessingContext.Provider value={value}>
      {children}
    </AudioProcessingContext.Provider>
  );
}

export function useAudioProcessing(): AudioProcessingContextValue {
  const ctx = useContext(AudioProcessingContext);
  if (!ctx) {
    throw new Error(
      'useAudioProcessing must be used within an AudioProcessingProvider',
    );
  }
  return ctx;
}
