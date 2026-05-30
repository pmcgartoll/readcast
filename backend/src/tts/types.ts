export type AudioSegment = {
  index: number;
  uri: string;
  durationMs: number;
};

export interface TtsProvider {
  synthesize(chunks: string[]): Promise<AudioSegment[]>;
}

/** Rough spoken-duration estimate used when the provider can't measure it. */
export function estimateDurationMs(text: string): number {
  return Math.max(4000, Math.round((text.length / 14) * 1000));
}
