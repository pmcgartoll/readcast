import { OPENAI_TTS_MODEL, OPENAI_TTS_VOICE } from '../config';
import { estimateDurationMs, type TtsProvider } from './types';

/**
 * OpenAI text-to-speech provider. Synthesizes each chunk to MP3.
 *
 * Voice and instructions come per-request (so users can set a custom voice
 * prompt in the app), falling back to the server defaults from env.
 *
 * NOTE: This returns base64 data URIs for simplicity. In production you should
 * upload the audio to object storage (S3/R2) and return signed URLs instead,
 * so the client downloads bytes once and the API response stays small.
 */
export function createOpenAiProvider(apiKey: string): TtsProvider {
  return {
    async synthesize(chunks, options) {
      const voice = options?.voice?.trim() || OPENAI_TTS_VOICE;
      const instructions = options?.instructions?.trim();
      const segments = [];
      for (let index = 0; index < chunks.length; index++) {
        const chunk = chunks[index];
        const res = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: OPENAI_TTS_MODEL,
            voice,
            input: chunk,
            response_format: 'mp3',
            ...(instructions ? { instructions } : {}),
          }),
        });
        if (!res.ok) {
          const detail = await res.text().catch(() => '');
          throw new Error(`OpenAI TTS failed (${res.status}): ${detail}`);
        }
        const buffer = Buffer.from(await res.arrayBuffer());
        segments.push({
          index,
          uri: `data:audio/mpeg;base64,${buffer.toString('base64')}`,
          durationMs: estimateDurationMs(chunk),
        });
      }
      return segments;
    },
  };
}
