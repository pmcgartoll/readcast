import { createStubEngine } from './stubEngine';
import type { PlaybackEngine } from './types';

let instance: PlaybackEngine | null = null;

/**
 * Returns the singleton playback engine. Today this is always the simulated
 * engine. The native build will return a track-player engine here; nothing else
 * in the app needs to change.
 */
export function getEngine(): PlaybackEngine {
  if (!instance) {
    instance = createStubEngine();
  }
  return instance;
}
