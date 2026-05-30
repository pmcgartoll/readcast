import { OPENAI_API_KEY, TTS_PROVIDER } from '../config';
import { createMockProvider } from './mockProvider';
import { createOpenAiProvider } from './openaiProvider';
import type { TtsProvider } from './types';

/** Selects the TTS provider from env, falling back to the mock provider. */
export function getTtsProvider(): TtsProvider {
  if (TTS_PROVIDER === 'openai' && OPENAI_API_KEY) {
    return createOpenAiProvider(OPENAI_API_KEY);
  }
  return createMockProvider();
}

export type { TtsProvider } from './types';
