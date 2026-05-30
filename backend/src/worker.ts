import type { AudioStorage } from './audioStorage';
import type { Job, JobStore } from './jobStore';
import type { TtsProvider } from './tts/types';

export interface Worker {
  /** Starts processing the queue if it isn't already running (non-blocking). */
  kick(): void;
  /** Runs the queue to completion. Used by tests and startup. */
  drain(): Promise<void>;
}

export type WorkerDeps = {
  jobStore: JobStore;
  storage: AudioStorage;
  ttsProvider: TtsProvider;
};

/**
 * Single-concurrency, in-process worker. It claims queued jobs one at a time,
 * synthesizes any missing chunks, writes them to storage, and advances
 * progress. Already-synthesized chunks (same content hash) are skipped, so
 * cross-article reuse and post-failure retries never re-bill the TTS provider.
 */
export function createWorker(deps: WorkerDeps): Worker {
  const { jobStore, storage, ttsProvider } = deps;
  let running: Promise<void> | null = null;

  async function processJob(job: Job): Promise<void> {
    if (
      job.totalChunks > 0 &&
      jobStore.countSegments(job.contentHash) >= job.totalChunks
    ) {
      jobStore.markReady(job.articleId);
      return;
    }
    try {
      for (let index = 0; index < job.chunks.length; index++) {
        if (job.segments.some((s) => s.index === index)) continue;
        const out = await ttsProvider.synthesizeChunk(job.chunks[index], {
          voice: job.voice,
          instructions: job.instructions,
        });
        storage.write(job.contentHash, index, out.format, out.audio);
        jobStore.recordSegment(job.articleId, job.contentHash, {
          index,
          durationMs: out.durationMs,
          format: out.format,
        });
      }
      jobStore.markReady(job.articleId);
    } catch (err) {
      jobStore.markFailed(
        job.articleId,
        err instanceof Error ? err.message : 'Audio generation failed.',
      );
    }
  }

  async function loop(): Promise<void> {
    let job: Job | null;
    while ((job = jobStore.claimNext())) {
      await processJob(job);
    }
  }

  function kick(): void {
    if (running) return;
    running = loop().finally(() => {
      running = null;
    });
  }

  async function drain(): Promise<void> {
    kick();
    while (running) await running;
  }

  return { kick, drain };
}
