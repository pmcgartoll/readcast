import { Platform } from 'react-native';

/**
 * DEV_STUB_MODE makes the app fully usable without a backend or TTS keys:
 * - ingest returns canned article content from fixtures
 * - audio generation returns a short sample track
 *
 * This is what lets the agent verify the whole UI loop in the web preview.
 * It defaults on in development and off in production builds.
 */
export const DEV_STUB_MODE: boolean =
  process.env.EXPO_PUBLIC_STUB_MODE === 'false'
    ? false
    : process.env.EXPO_PUBLIC_STUB_MODE === 'true'
      ? true
      : __DEV__;

/** Base URL for the ReadCast backend (ingest + TTS). */
export const API_BASE_URL: string =
  process.env.EXPO_PUBLIC_API_URL ??
  (Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000');

/** Words-per-minute used to estimate reading and listening time. */
export const READING_WPM = 230;

/** Max characters per TTS chunk. Long articles are split on sentence bounds. */
export const TTS_CHUNK_CHARS = 3500;

/** Selectable playback speeds, and the default applied to new listeners. */
export const PLAYBACK_RATES: readonly number[] = [0.75, 1, 1.25, 1.5, 1.75, 2];
export const DEFAULT_PLAYBACK_RATE = 1.25;

/** Continuous speed picker range (slider uses 0.05 steps). */
export const PLAYBACK_RATE_MIN = 0.5;
export const PLAYBACK_RATE_MAX = 3;
export const PLAYBACK_RATE_STEP = 0.05;
/** Quick-pick speeds shown in the player overlay. */
export const PLAYBACK_RATE_PRESETS: readonly number[] = [0.75, 1, 1.25, 1.5, 1.75];
