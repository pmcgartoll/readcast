import type { EngineState, PlaybackEngine, PlaybackTrack } from './types';

const TICK_MS = 250;

/**
 * Real web playback engine. Plays the episode's audio segments in sequence
 * through a single HTMLAudioElement, reporting aggregate position/duration so
 * the player UI works exactly as it does on native.
 *
 * Metro picks this over `engine.ts` on web. Native keeps using `engine.ts`
 * (the simulated engine today, react-native-track-player later). With
 * EXPO_PUBLIC_STUB_MODE=false this lets you actually hear real TTS audio in the
 * browser for testing.
 */
export function createWebEngine(): PlaybackEngine {
  let audio: HTMLAudioElement | null = null;
  let segmentUris: string[] = [];
  let durationsMs: number[] = [];
  let estimatedTotalMs = 0;
  let currentSegment = 0;
  let rate = 1;
  let timer: ReturnType<typeof setInterval> | null = null;

  let state: EngineState = {
    isPlaying: false,
    positionMs: 0,
    durationMs: 0,
    isLoading: false,
  };
  const stateListeners = new Set<(s: EngineState) => void>();
  const endedListeners = new Set<() => void>();

  function emit() {
    const snapshot = { ...state };
    stateListeners.forEach((l) => l(snapshot));
  }

  function offsetBeforeMs(index: number): number {
    let sum = 0;
    for (let i = 0; i < index && i < durationsMs.length; i++) {
      sum += durationsMs[i] ?? 0;
    }
    return sum;
  }

  function totalMs(): number {
    if (
      durationsMs.length === segmentUris.length &&
      durationsMs.every((d) => d > 0)
    ) {
      return durationsMs.reduce((a, b) => a + b, 0);
    }
    return estimatedTotalMs;
  }

  function currentPositionMs(): number {
    if (!audio) return state.positionMs;
    return offsetBeforeMs(currentSegment) + audio.currentTime * 1000;
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
      state = { ...state, positionMs: currentPositionMs(), durationMs: totalMs() };
      emit();
    }, TICK_MS);
  }

  /** Loads a segment's audio metadata to learn its exact duration. */
  function measureDuration(uri: string): Promise<number> {
    return new Promise((resolve) => {
      const probe = new Audio();
      probe.preload = 'metadata';
      const done = (ms: number) => {
        probe.src = '';
        resolve(ms);
      };
      probe.addEventListener(
        'loadedmetadata',
        () => done(Number.isFinite(probe.duration) ? probe.duration * 1000 : 0),
        { once: true },
      );
      probe.addEventListener('error', () => done(0), { once: true });
      probe.src = uri;
    });
  }

  function onSegmentEnded() {
    if (currentSegment < segmentUris.length - 1) {
      setSegment(currentSegment + 1, true);
      return;
    }
    state = { ...state, isPlaying: false, positionMs: totalMs() };
    stopTimer();
    emit();
    endedListeners.forEach((l) => l());
  }

  function setSegment(index: number, autoplay: boolean) {
    if (!audio) {
      audio = new Audio();
      audio.addEventListener('ended', onSegmentEnded);
    }
    currentSegment = index;
    audio.src = segmentUris[index];
    audio.playbackRate = rate;
    // Keep the voice natural (not chipmunked) at higher speeds where supported.
    (audio as unknown as { preservesPitch?: boolean }).preservesPitch = true;
    audio.load();
    if (autoplay) void audio.play().catch(() => {});
  }

  return {
    async load(track: PlaybackTrack) {
      stopTimer();
      audio?.pause();
      segmentUris = track.segmentUris.slice();
      estimatedTotalMs = track.durationMs;
      currentSegment = 0;
      durationsMs = [];
      state = {
        isPlaying: false,
        positionMs: 0,
        durationMs: estimatedTotalMs,
        isLoading: true,
      };
      emit();

      durationsMs = await Promise.all(segmentUris.map(measureDuration));

      if (segmentUris.length > 0) setSegment(0, false);
      state = { ...state, isLoading: false, durationMs: totalMs() };
      emit();
    },

    async play() {
      if (!audio || segmentUris.length === 0) return;
      try {
        await audio.play();
      } catch {
        // Autoplay can be blocked until a user gesture; leave state paused.
      }
      state = { ...state, isPlaying: !audio.paused };
      if (state.isPlaying) startTimer();
      emit();
    },

    async pause() {
      audio?.pause();
      state = { ...state, isPlaying: false };
      stopTimer();
      emit();
    },

    async seekTo(positionMs: number) {
      const total = totalMs();
      const clamped = Math.max(0, Math.min(total, positionMs));
      let idx = 0;
      let acc = 0;
      while (
        idx < durationsMs.length - 1 &&
        acc + (durationsMs[idx] ?? 0) <= clamped
      ) {
        acc += durationsMs[idx] ?? 0;
        idx += 1;
      }
      const withinSec = (clamped - acc) / 1000;
      const wasPlaying = state.isPlaying;
      if (idx !== currentSegment) setSegment(idx, false);
      if (audio) {
        const apply = () => {
          if (audio) audio.currentTime = withinSec;
          if (wasPlaying) void audio?.play().catch(() => {});
        };
        if (audio.readyState >= 1) apply();
        else audio.addEventListener('loadedmetadata', apply, { once: true });
      }
      state = { ...state, positionMs: clamped };
      emit();
    },

    async setRate(next: number) {
      rate = next;
      if (audio) audio.playbackRate = next;
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

let instance: PlaybackEngine | null = null;

/** Returns the singleton web playback engine. */
export function getEngine(): PlaybackEngine {
  if (!instance) {
    instance = createWebEngine();
  }
  return instance;
}
