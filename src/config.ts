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
