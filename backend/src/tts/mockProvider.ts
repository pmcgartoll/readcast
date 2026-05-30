import { estimateDurationMs, type TtsProvider } from './types';

/** Cap mock clips so silent fixtures stay tiny regardless of article length. */
const MOCK_MAX_MS = 4000;

/**
 * Builds a valid silent WAV (8 kHz mono 16-bit PCM) of the given duration.
 * Keeps the mock provider hermetic — no network, no keys — while still writing
 * real, playable bytes to disk so the storage/serving path is exercised.
 */
function silentWav(durationMs: number): Uint8Array {
  const sampleRate = 8000;
  const numSamples = Math.round((sampleRate * durationMs) / 1000);
  const dataSize = numSamples * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);
  return new Uint8Array(buffer);
}

/**
 * Deterministic, key-free provider. Returns silent audio per chunk so the full
 * pipeline is testable and the app is demoable without spending on TTS.
 */
export function createMockProvider(): TtsProvider {
  return {
    id: 'mock',
    async synthesizeChunk(text) {
      const durationMs = Math.min(estimateDurationMs(text), MOCK_MAX_MS);
      return { audio: silentWav(durationMs), format: 'wav', durationMs };
    },
  };
}
