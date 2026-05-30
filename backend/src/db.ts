import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

/**
 * Thin wrapper around Node's built-in SQLite (`node:sqlite`). This is the only
 * module that imports the still-experimental API, so if it changes we adapt in
 * one place. The rest of the backend talks to the `Database` interface below.
 */
export type SqlValue = string | number | null;

export interface Database {
  exec(sql: string): void;
  run(sql: string, params?: SqlValue[]): void;
  get<T>(sql: string, params?: SqlValue[]): T | undefined;
  all<T>(sql: string, params?: SqlValue[]): T[];
  close(): void;
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS jobs (
    article_id      TEXT PRIMARY KEY NOT NULL,
    content_hash    TEXT NOT NULL,
    voice           TEXT NOT NULL,
    instructions    TEXT NOT NULL,
    status          TEXT NOT NULL,
    total_chunks    INTEGER NOT NULL,
    completed_chunks INTEGER NOT NULL DEFAULT 0,
    chunks_json     TEXT NOT NULL,
    error           TEXT,
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs (status);
  CREATE INDEX IF NOT EXISTS idx_jobs_hash ON jobs (content_hash);

  CREATE TABLE IF NOT EXISTS segments (
    content_hash TEXT NOT NULL,
    idx          INTEGER NOT NULL,
    duration_ms  INTEGER NOT NULL,
    format       TEXT NOT NULL,
    PRIMARY KEY (content_hash, idx)
  );
`;

/**
 * Opens (creating if needed) the SQLite database at `filename`, applies the
 * schema, and returns a typed query helper. Pass `:memory:` for tests.
 */
export function openDatabase(filename: string): Database {
  if (filename !== ':memory:') {
    mkdirSync(dirname(filename), { recursive: true });
  }
  const db = new DatabaseSync(filename);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec(SCHEMA);

  return {
    exec: (sql) => db.exec(sql),
    run: (sql, params = []) => {
      db.prepare(sql).run(...params);
    },
    get: <T>(sql: string, params: SqlValue[] = []) =>
      db.prepare(sql).get(...params) as T | undefined,
    all: <T>(sql: string, params: SqlValue[] = []) =>
      db.prepare(sql).all(...params) as T[],
    close: () => db.close(),
  };
}
