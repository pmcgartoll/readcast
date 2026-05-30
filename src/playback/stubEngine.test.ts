import { createStubEngine } from './stubEngine';
import type { PlaybackTrack } from './types';

const track: PlaybackTrack = {
  articleId: 'a1',
  title: 'T',
  siteName: 'S',
  segmentUris: ['s0'],
  durationMs: 2000,
};

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('stubEngine', () => {
  it('loads a track, setting duration and clearing loading', async () => {
    const engine = createStubEngine();
    const p = engine.load(track);
    await jest.advanceTimersByTimeAsync(200);
    await p;
    const state = engine.getState();
    expect(state.durationMs).toBe(2000);
    expect(state.isLoading).toBe(false);
  });

  it('advances position while playing', async () => {
    const engine = createStubEngine();
    const p = engine.load(track);
    await jest.advanceTimersByTimeAsync(200);
    await p;
    await engine.play();
    await jest.advanceTimersByTimeAsync(1000);
    expect(engine.getState().positionMs).toBeGreaterThan(0);
    expect(engine.getState().isPlaying).toBe(true);
  });

  it('fires onEnded and stops at the end', async () => {
    const engine = createStubEngine();
    const ended = jest.fn();
    engine.onEnded(ended);
    const p = engine.load(track);
    await jest.advanceTimersByTimeAsync(200);
    await p;
    await engine.play();
    await jest.advanceTimersByTimeAsync(2500);
    expect(ended).toHaveBeenCalledTimes(1);
    expect(engine.getState().isPlaying).toBe(false);
    expect(engine.getState().positionMs).toBe(2000);
  });

  it('clamps seek within bounds', async () => {
    const engine = createStubEngine();
    const p = engine.load(track);
    await jest.advanceTimersByTimeAsync(200);
    await p;
    await engine.seekTo(99999);
    expect(engine.getState().positionMs).toBe(2000);
    await engine.seekTo(-50);
    expect(engine.getState().positionMs).toBe(0);
  });
});
