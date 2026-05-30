export type PlaybackTrack = {
  articleId: string;
  title: string;
  siteName: string;
  heroImageUrl?: string;
  /** Ordered audio segment URIs that make up the episode. */
  segmentUris: string[];
  durationMs: number;
};

export type EngineState = {
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
  isLoading: boolean;
};

/**
 * Playback engine seam. The web/dev build uses a simulated engine; the native
 * build will implement this with react-native-track-player (which also drives
 * the lock screen and CarPlay Now Playing). The rest of the app depends only on
 * this interface.
 */
export interface PlaybackEngine {
  load(track: PlaybackTrack): Promise<void>;
  play(): Promise<void>;
  pause(): Promise<void>;
  seekTo(positionMs: number): Promise<void>;
  setRate(rate: number): Promise<void>;
  /** Subscribe to state updates; returns an unsubscribe function. */
  subscribe(listener: (state: EngineState) => void): () => void;
  /** Called when a track finishes so the queue can advance. */
  onEnded(listener: () => void): () => void;
  getState(): EngineState;
}
