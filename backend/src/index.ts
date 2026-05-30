import { serve } from '@hono/node-server';

import { PORT, TTS_PROVIDER } from './config';
import { extractArticle } from './extract';
import { fetchPage } from './fetchPage';
import { createApp } from './server';
import { getTtsProvider } from './tts';

const app = createApp({
  fetchPage,
  extractArticle,
  ttsProvider: getTtsProvider(),
});

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`ReadCast backend listening on http://localhost:${info.port}`);
  console.log(`TTS provider: ${TTS_PROVIDER}`);
});
