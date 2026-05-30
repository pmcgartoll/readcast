import { TTS_CHUNK_CHARS } from '../config';

/**
 * Splits article text into TTS-sized chunks without cutting sentences in half.
 *
 * Strategy: split into sentences, then greedily pack sentences into chunks up
 * to `maxChars`. A single sentence longer than `maxChars` is hard-split on
 * whitespace as a last resort so we never exceed the provider limit.
 */
export function chunkText(text: string, maxChars = TTS_CHUNK_CHARS): string[] {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];
  if (maxChars <= 0) return [normalized];

  const sentences = splitSentences(normalized);
  const chunks: string[] = [];
  let current = '';

  const flush = () => {
    const trimmed = current.trim();
    if (trimmed) chunks.push(trimmed);
    current = '';
  };

  for (const sentence of sentences) {
    if (sentence.length > maxChars) {
      flush();
      for (const piece of hardSplit(sentence, maxChars)) chunks.push(piece);
      continue;
    }
    if (current.length + sentence.length + 1 > maxChars) {
      flush();
    }
    current += (current ? ' ' : '') + sentence;
  }
  flush();

  return chunks;
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function hardSplit(sentence: string, maxChars: number): string[] {
  const words = sentence.split(/\s+/);
  const out: string[] = [];
  let current = '';
  for (const word of words) {
    if (current.length + word.length + 1 > maxChars && current) {
      out.push(current.trim());
      current = '';
    }
    current += (current ? ' ' : '') + word;
  }
  if (current.trim()) out.push(current.trim());
  return out;
}
