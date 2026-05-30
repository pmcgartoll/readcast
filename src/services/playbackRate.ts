import {
  PLAYBACK_RATE_MAX,
  PLAYBACK_RATE_MIN,
  PLAYBACK_RATE_STEP,
} from '../config';

/** Clamps and snaps a rate to the allowed step grid. */
export function snapPlaybackRate(value: number): number {
  if (!Number.isFinite(value)) return PLAYBACK_RATE_MIN;
  const snapped = Math.round(value / PLAYBACK_RATE_STEP) * PLAYBACK_RATE_STEP;
  const clamped = Math.max(PLAYBACK_RATE_MIN, Math.min(PLAYBACK_RATE_MAX, snapped));
  return +clamped.toFixed(2);
}

/** Formats a rate for display (drops trailing zeros). */
export function formatPlaybackRate(rate: number): string {
  const snapped = snapPlaybackRate(rate);
  const text = Number.isInteger(snapped) ? String(snapped) : snapped.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  return `${text}×`;
}

/** Parses user-entered text like "1.25" or "1.25×" into a snapped rate. */
export function parsePlaybackRateInput(text: string): number | null {
  const cleaned = text.trim().replace(/×$/u, '');
  if (!cleaned) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  return snapPlaybackRate(value);
}
