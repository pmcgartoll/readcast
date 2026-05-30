export type AudioSegment = {
  index: number;
  uri: string;
  durationMs: number;
};

/** Per-request voice controls. Both fall back to server defaults when omitted. */
export type TtsOptions = {
  /** Named voice (e.g. "cedar"). */
  voice?: string;
  /** Free-form style prompt steering tone/pacing (gpt-4o-mini-tts only). */
  instructions?: string;
};

export interface TtsProvider {
  synthesize(chunks: string[], options?: TtsOptions): Promise<AudioSegment[]>;
}

/** Rough spoken-duration estimate used when the provider can't measure it. */
export function estimateDurationMs(text: string): number {
  return Math.max(4000, Math.round((text.length / 14) * 1000));
}
