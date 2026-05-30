import { createHash } from 'node:crypto';

/**
 * Stable content hash used to dedup TTS work. Identical (provider, voice,
 * instructions, chunks) always map to the same hash, so audio is synthesized
 * once and reused across articles, devices, and reinstalls.
 */
export function contentHash(
  providerId: string,
  voice: string,
  instructions: string,
  chunks: string[],
): string {
  const h = createHash('sha256');
  const write = (s: string) => {
    h.update(s);
    h.update('\u0000');
  };
  write(providerId);
  write(voice);
  write(instructions);
  write(String(chunks.length));
  for (const chunk of chunks) write(chunk);
  return h.digest('hex');
}
