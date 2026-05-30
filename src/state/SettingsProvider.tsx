import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { DEFAULT_PLAYBACK_RATE } from '../config';

export type Settings = {
  /** Default playback speed applied when a track loads. */
  playbackRate: number;
  /** Custom voice prompt (instructions) sent to the TTS provider. */
  voiceInstructions: string;
};

const STORAGE_KEY = 'readcast:settings';

const DEFAULT_SETTINGS: Settings = {
  playbackRate: DEFAULT_PLAYBACK_RATE,
  voiceInstructions: '',
};

export type SettingsContextValue = Settings & {
  /** True until persisted settings have loaded from storage. */
  isLoading: boolean;
  setPlaybackRate: (rate: number) => void;
  setVoiceInstructions: (instructions: string) => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

/**
 * Persists user preferences (playback speed, custom voice prompt) across
 * launches. Backed by AsyncStorage, which is available on both web and native,
 * so it needs no platform branch.
 */
export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Keep a ref so the stable setters always merge onto the latest settings.
  const settingsRef = React.useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (active && raw) {
          const parsed = JSON.parse(raw) as Partial<Settings>;
          setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        }
      } catch {
        // Corrupt or missing settings fall back to defaults.
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const persist = useCallback((next: Settings) => {
    setSettings(next);
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const setPlaybackRate = useCallback(
    (rate: number) => persist({ ...settingsRef.current, playbackRate: rate }),
    [persist],
  );
  const setVoiceInstructions = useCallback(
    (instructions: string) =>
      persist({ ...settingsRef.current, voiceInstructions: instructions }),
    [persist],
  );

  const value = useMemo<SettingsContextValue>(
    () => ({
      ...settings,
      isLoading,
      setPlaybackRate,
      setVoiceInstructions,
    }),
    [settings, isLoading, setPlaybackRate, setVoiceInstructions],
  );

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return ctx;
}
