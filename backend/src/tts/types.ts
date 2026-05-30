import type { AudioFormat } from '../audioStorage';

/** Per-request voice controls. Both fall back to server defaults when omitted. */
export type TtsOptions = {
  /** Named voice (e.g. "cedar"). */
  voice?: string;
  /** Free-form style prompt steering tone/pacing (gpt-4o-mini-tts only). */
  instructions?: string;
};

/** One synthesized chunk: raw audio bytes the worker writes to disk. */
export type SynthesizedChunk = {
  audio: Uint8Array;
  format: AudioFormat;
  durationMs: number;
};

export interface TtsProvider {
  /**
   * Stable identifier mixed into the content hash so audio from different
   * providers/models never collides (e.g. "mock", "openai:gpt-4o-mini-tts").
   */
  readonly id: string;
  synthesizeChunk(text: string, options?: TtsOptions): Promise<SynthesizedChunk>;
}

/** Rough spoken-duration estimate used when the provider can't measure it. */
export function estimateDurationMs(text: string): number {
  return Math.max(4000, Math.round((text.length / 14) * 1000));
}
