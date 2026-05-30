import { OPENAI_TTS_MODEL, OPENAI_TTS_VOICE } from '../config';
import { estimateDurationMs, type TtsProvider } from './types';

/**
 * OpenAI text-to-speech provider. Synthesizes a single chunk to MP3 bytes,
 * which the worker persists to disk (so the response stays small and the audio
 * is reused). Voice and instructions come per-request, falling back to the
 * server defaults from env.
 */
export function createOpenAiProvider(apiKey: string): TtsProvider {
  return {
    id: `openai:${OPENAI_TTS_MODEL}`,
    async synthesizeChunk(text, options) {
      const voice = options?.voice?.trim() || OPENAI_TTS_VOICE;
      const instructions = options?.instructions?.trim();
      const res = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: OPENAI_TTS_MODEL,
          voice,
          input: text,
          response_format: 'mp3',
          ...(instructions ? { instructions } : {}),
        }),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(`OpenAI TTS failed (${res.status}): ${detail}`);
      }
      const audio = new Uint8Array(await res.arrayBuffer());
      return { audio, format: 'mp3', durationMs: estimateDurationMs(text) };
    },
  };
}
