import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export type AudioFormat = 'mp3' | 'wav';

export const MIME_BY_FORMAT: Record<AudioFormat, string> = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
};

export type StoredAudio = {
  bytes: Uint8Array;
  format: AudioFormat;
};

/**
 * Durable, content-addressed audio storage. Files live at
 * `<root>/<contentHash>/<idx>.<format>` so identical content is written once
 * and reused. The DB only tracks metadata; the bytes live here.
 */
export interface AudioStorage {
  has(contentHash: string, index: number, format: AudioFormat): boolean;
  write(
    contentHash: string,
    index: number,
    format: AudioFormat,
    bytes: Uint8Array,
  ): void;
  /** Reads a stored file by its served name (e.g. "0.mp3"). */
  read(contentHash: string, fileName: string): StoredAudio | null;
}

function parseFileName(fileName: string): { index: number; format: AudioFormat } | null {
  const match = /^(\d+)\.(mp3|wav)$/.exec(fileName);
  if (!match) return null;
  return { index: Number(match[1]), format: match[2] as AudioFormat };
}

export function createFileAudioStorage(rootDir: string): AudioStorage {
  function pathFor(contentHash: string, index: number, format: AudioFormat): string {
    return join(rootDir, contentHash, `${index}.${format}`);
  }

  return {
    has(contentHash, index, format) {
      return existsSync(pathFor(contentHash, index, format));
    },

    write(contentHash, index, format, bytes) {
      mkdirSync(join(rootDir, contentHash), { recursive: true });
      writeFileSync(pathFor(contentHash, index, format), bytes);
    },

    read(contentHash, fileName) {
      const parsed = parseFileName(fileName);
      if (!parsed) return null;
      const filePath = pathFor(contentHash, parsed.index, parsed.format);
      if (!existsSync(filePath)) return null;
      return { bytes: readFileSync(filePath), format: parsed.format };
    },
  };
}
