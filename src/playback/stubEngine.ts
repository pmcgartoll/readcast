import type { EngineState, PlaybackEngine, PlaybackTrack } from './types';

const TICK_MS = 250;

/**
 * Simulated playback engine. It advances a position timer without producing
 * sound, which is exactly what the agent/web loop needs to verify the player
 * UI, queue advancement, and progress without native audio or TTS keys.
 *
 * The native engine (Phase 2) will replace this with react-native-track-player
 * behind the same PlaybackEngine interface.
 */
export function createStubEngine(): PlaybackEngine {
  let state: EngineState = {
    isPlaying: false,
    positionMs: 0,
    durationMs: 0,
    isLoading: false,
  };
  let rate = 1;
  let timer: ReturnType<typeof setInterval> | null = null;
  const stateListeners = new Set<(s: EngineState) => void>();
  const endedListeners = new Set<() => void>();

  function emit() {
    const snapshot = { ...state };
    stateListeners.forEach((l) => l(snapshot));
  }

  function stopTimer() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function startTimer() {
    stopTimer();
    timer = setInterval(() => {
      if (!state.isPlaying) return;
      const next = state.positionMs + TICK_MS * rate;
      if (next >= state.durationMs) {
        state = { ...state, positionMs: state.durationMs, isPlaying: false };
        stopTimer();
        emit();
        endedListeners.forEach((l) => l());
        return;
      }
      state = { ...state, positionMs: next };
      emit();
    }, TICK_MS);
  }

  return {
    async load(track: PlaybackTrack) {
      stopTimer();
      state = {
        isPlaying: false,
        positionMs: 0,
        durationMs: track.durationMs,
        isLoading: true,
      };
      emit();
      // Simulate buffering the first segment.
      await new Promise((r) => setTimeout(r, 150));
      state = { ...state, isLoading: false };
      emit();
    },
    async play() {
      if (state.durationMs <= 0) return;
      state = { ...state, isPlaying: true };
      emit();
      startTimer();
    },
    async pause() {
      state = { ...state, isPlaying: false };
      stopTimer();
      emit();
    },
    async seekTo(positionMs: number) {
      const clamped = Math.max(0, Math.min(state.durationMs, positionMs));
      state = { ...state, positionMs: clamped };
      emit();
    },
    async setRate(next: number) {
      rate = next;
    },
    subscribe(listener) {
      stateListeners.add(listener);
      listener({ ...state });
      return () => stateListeners.delete(listener);
    },
    onEnded(listener) {
      endedListeners.add(listener);
      return () => endedListeners.delete(listener);
    },
    getState() {
      return { ...state };
    },
  };
}
