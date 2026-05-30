import { SAMPLE_AUDIO_URL } from '../config';
import { estimateDurationMs, type TtsProvider } from './types';

/**
 * Deterministic, key-free provider. Returns a sample clip per chunk so the
 * full pipeline is testable and the app is demoable without spending on TTS.
 */
export function createMockProvider(): TtsProvider {
  return {
    async synthesize(chunks, _options) {
      return chunks.map((chunk, index) => ({
        index,
        uri: SAMPLE_AUDIO_URL,
        durationMs: estimateDurationMs(chunk),
      }));
    },
  };
}
