import 'dotenv/config';
import { join } from 'node:path';

export const PORT = Number(process.env.PORT ?? 3000);

/**
 * Where the backend persists its light SQLite database and the synthesized
 * audio files. Defaults to a gitignored `.data/` dir next to the server.
 */
export const DATA_DIR = process.env.DATA_DIR ?? join(process.cwd(), '.data');
export const DB_PATH = process.env.DB_PATH ?? join(DATA_DIR, 'readcast.db');
export const AUDIO_DIR = process.env.AUDIO_DIR ?? join(DATA_DIR, 'audio');

/** Path prefix under which stored audio files are served. */
export const AUDIO_ROUTE_PREFIX = '/audio';

/** "mock" (default, no keys) or "openai". */
export const TTS_PROVIDER = process.env.TTS_PROVIDER ?? 'mock';
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
export const OPENAI_TTS_MODEL = process.env.OPENAI_TTS_MODEL ?? 'gpt-4o-mini-tts';
/** Default voice; can be overridden per request from the app. */
export const OPENAI_TTS_VOICE = process.env.OPENAI_TTS_VOICE ?? 'cedar';

/** Guardrails. */
export const MAX_ARTICLE_CHARS = 200_000;
export const TTS_CHUNK_CHARS = 3500;

/** Sample clip returned by the mock TTS provider. */
export const SAMPLE_AUDIO_URL =
  'https://upload.wikimedia.org/wikipedia/commons/c/c8/Example.ogg';
