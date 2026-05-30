import { serve } from '@hono/node-server';

import { createFileAudioStorage } from './audioStorage';
import { AUDIO_DIR, DB_PATH, PORT, TTS_PROVIDER } from './config';
import { openDatabase } from './db';
import { extractArticle } from './extract';
import { fetchPage } from './fetchPage';
import { createJobStore } from './jobStore';
import { createApp } from './server';
import { getTtsProvider } from './tts';
import { createWorker } from './worker';

const db = openDatabase(DB_PATH);
const jobStore = createJobStore(db);
const storage = createFileAudioStorage(AUDIO_DIR);
const ttsProvider = getTtsProvider();
const worker = createWorker({ jobStore, storage, ttsProvider });

// Resume any jobs interrupted by a previous restart.
jobStore.requeueStale();
worker.kick();

const app = createApp({
  fetchPage,
  extractArticle,
  jobStore,
  storage,
  worker,
  providerId: ttsProvider.id,
});

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`ReadCast backend listening on http://localhost:${info.port}`);
  console.log(`TTS provider: ${TTS_PROVIDER}`);
});
