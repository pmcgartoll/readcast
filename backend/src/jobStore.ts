import type { Database, SqlValue } from './db';

export type JobStatus = 'queued' | 'processing' | 'ready' | 'failed';

export type SegmentMeta = {
  index: number;
  durationMs: number;
  format: string;
};

/** Internal job representation (includes the chunk texts the worker needs). */
export type Job = {
  articleId: string;
  contentHash: string;
  voice: string;
  instructions: string;
  status: JobStatus;
  totalChunks: number;
  completedChunks: number;
  chunks: string[];
  error?: string;
  segments: SegmentMeta[];
};

export type CreateJobInput = {
  articleId: string;
  contentHash: string;
  voice: string;
  instructions: string;
  chunks: string[];
};

type JobRow = {
  article_id: string;
  content_hash: string;
  voice: string;
  instructions: string;
  status: JobStatus;
  total_chunks: number;
  completed_chunks: number;
  chunks_json: string;
  error: string | null;
};

export interface JobStore {
  /** Reads a job (with live segment list + completed count) by article id. */
  getJob(articleId: string): Job | null;
  /**
   * Creates a job, or returns the existing one. If the content hash already has
   * every segment on disk, the job is marked `ready` immediately with no work.
   * A changed hash (new content/voice/instructions) or a failed job is reset.
   */
  createOrGetJob(input: CreateJobInput): Job;
  /** Marks the oldest queued job `processing` and returns it (worker claim). */
  claimNext(): Job | null;
  /** Records a finished chunk's metadata and bumps the job's progress. */
  recordSegment(articleId: string, contentHash: string, seg: SegmentMeta): void;
  markReady(articleId: string): void;
  markFailed(articleId: string, error: string): void;
  /** Re-queues a job for retry, keeping any segments already on disk. */
  resetForRetry(articleId: string): void;
  /** On startup, returns interrupted (`processing`) jobs to the queue. */
  requeueStale(): void;
  countSegments(contentHash: string): number;
}

function now(): number {
  return Date.now();
}

export function createJobStore(db: Database): JobStore {
  function getSegments(contentHash: string): SegmentMeta[] {
    const rows = db.all<{ idx: number; duration_ms: number; format: string }>(
      'SELECT idx, duration_ms, format FROM segments WHERE content_hash = ? ORDER BY idx ASC',
      [contentHash],
    );
    return rows.map((r) => ({
      index: r.idx,
      durationMs: r.duration_ms,
      format: r.format,
    }));
  }

  function countSegments(contentHash: string): number {
    const row = db.get<{ n: number }>(
      'SELECT COUNT(*) AS n FROM segments WHERE content_hash = ?',
      [contentHash],
    );
    return row?.n ?? 0;
  }

  function rowToJob(row: JobRow): Job {
    const segments = getSegments(row.content_hash);
    return {
      articleId: row.article_id,
      contentHash: row.content_hash,
      voice: row.voice,
      instructions: row.instructions,
      status: row.status,
      totalChunks: row.total_chunks,
      // Progress is derived from segments on disk so it never drifts.
      completedChunks: segments.length,
      chunks: JSON.parse(row.chunks_json) as string[],
      error: row.error ?? undefined,
      segments,
    };
  }

  function readRow(articleId: string): JobRow | null {
    return (
      db.get<JobRow>('SELECT * FROM jobs WHERE article_id = ?', [articleId]) ??
      null
    );
  }

  function getJob(articleId: string): Job | null {
    const row = readRow(articleId);
    return row ? rowToJob(row) : null;
  }

  function upsertJob(input: CreateJobInput, status: JobStatus): void {
    const ts = now();
    const params: SqlValue[] = [
      input.articleId,
      input.contentHash,
      input.voice,
      input.instructions,
      status,
      input.chunks.length,
      countSegments(input.contentHash),
      JSON.stringify(input.chunks),
      ts,
      ts,
    ];
    db.run(
      `INSERT INTO jobs
        (article_id, content_hash, voice, instructions, status, total_chunks,
         completed_chunks, chunks_json, error, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
       ON CONFLICT(article_id) DO UPDATE SET
         content_hash = excluded.content_hash,
         voice = excluded.voice,
         instructions = excluded.instructions,
         status = excluded.status,
         total_chunks = excluded.total_chunks,
         completed_chunks = excluded.completed_chunks,
         chunks_json = excluded.chunks_json,
         error = NULL,
         updated_at = excluded.updated_at`,
      params,
    );
  }

  function setStatus(articleId: string, status: JobStatus, error?: string): void {
    db.run(
      'UPDATE jobs SET status = ?, error = ?, updated_at = ? WHERE article_id = ?',
      [status, error ?? null, now(), articleId],
    );
  }

  return {
    getJob,
    countSegments,

    createOrGetJob(input) {
      const existing = readRow(input.articleId);
      const segmentCount = countSegments(input.contentHash);
      const allDone =
        input.chunks.length > 0 && segmentCount >= input.chunks.length;

      if (
        existing &&
        existing.content_hash === input.contentHash &&
        existing.status !== 'failed'
      ) {
        // Same request already tracked. Reconcile status with disk and return.
        if (allDone && existing.status !== 'ready') setStatus(input.articleId, 'ready');
        else if (!allDone && existing.status === 'ready')
          setStatus(input.articleId, 'queued');
        return getJob(input.articleId)!;
      }

      upsertJob(input, allDone ? 'ready' : 'queued');
      return getJob(input.articleId)!;
    },

    claimNext() {
      const row = db.get<JobRow>(
        "SELECT * FROM jobs WHERE status = 'queued' ORDER BY created_at ASC LIMIT 1",
      );
      if (!row) return null;
      setStatus(row.article_id, 'processing');
      return getJob(row.article_id);
    },

    recordSegment(articleId, contentHash, seg) {
      db.run(
        `INSERT INTO segments (content_hash, idx, duration_ms, format)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(content_hash, idx) DO UPDATE SET
           duration_ms = excluded.duration_ms, format = excluded.format`,
        [contentHash, seg.index, seg.durationMs, seg.format],
      );
      db.run(
        'UPDATE jobs SET completed_chunks = ?, updated_at = ? WHERE article_id = ?',
        [countSegments(contentHash), now(), articleId],
      );
    },

    markReady(articleId) {
      setStatus(articleId, 'ready');
    },

    markFailed(articleId, error) {
      setStatus(articleId, 'failed', error);
    },

    resetForRetry(articleId) {
      setStatus(articleId, 'queued');
    },

    requeueStale() {
      db.run(
        "UPDATE jobs SET status = 'queued', updated_at = ? WHERE status = 'processing'",
        [now()],
      );
    },
  };
}
