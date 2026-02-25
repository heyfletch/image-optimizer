import { useState, useEffect, useCallback, useRef } from 'react';
import { load } from '@tauri-apps/plugin-store';
import type { OptimizeSettings } from '../../sidecar/src/types';

const STORE_NAME = 'settings.json';
const SETTINGS_KEY = 'optimize-settings';

const defaultSettings: OptimizeSettings = {
  format: 'same',
  quality: 92,
  width: null,
  height: null,
  maintainAspectRatio: true,
  maxFileSize: null,
  svgMode: null,
};

export function useSettings() {
  const [settings, setSettingsState] = useState<OptimizeSettings>(defaultSettings);
  const [loaded, setLoaded] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load settings on mount
  useEffect(() => {
    (async () => {
      try {
        const store = await load(STORE_NAME);
        const saved = await store.get<OptimizeSettings>(SETTINGS_KEY);
        if (saved) {
          setSettingsState({ ...defaultSettings, ...saved });
        }
      } catch (err) {
        console.warn('Failed to load settings:', err);
      }
      setLoaded(true);
    })();
  }, []);

  // Save settings (debounced)
  const setSettings = useCallback((newSettings: OptimizeSettings) => {
    setSettingsState(newSettings);

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        const store = await load(STORE_NAME);
        await store.set(SETTINGS_KEY, newSettings);
        await store.save();
      } catch (err) {
        console.warn('Failed to save settings:', err);
      }
    }, 500);
  }, []);

  return { settings, setSettings, loaded };
}
