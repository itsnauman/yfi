import { useState, useEffect, useCallback } from "react";
import { load } from "@tauri-apps/plugin-store";
import { debug, error as logError } from "@tauri-apps/plugin-log";
import { AppSettings, DEFAULT_SETTINGS } from "../types/settings";

const STORE_NAME = "settings.json";
const SETTINGS_KEY = "app_settings";

interface UseSettingsResult {
  settings: AppSettings;
  loading: boolean;
  saveApiKey: (apiKey: string) => Promise<void>;
  clearApiKey: () => Promise<void>;
  hasApiKey: boolean;
}

export function useSettings(): UseSettingsResult {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        debug("useSettings: loading settings");
        const store = await load(STORE_NAME);
        const savedSettings = await store.get<AppSettings>(SETTINGS_KEY);
        if (savedSettings) {
          setSettings(savedSettings);
          debug("useSettings: settings loaded successfully");
        }
      } catch (e) {
        logError(`useSettings: failed to load settings - ${e}`);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const saveApiKey = useCallback(async (apiKey: string) => {
    try {
      debug("useSettings: saving API key");
      const store = await load(STORE_NAME);
      const newSettings: AppSettings = {
        ...settings,
        openaiApiKey: apiKey,
      };
      await store.set(SETTINGS_KEY, newSettings);
      await store.save();
      setSettings(newSettings);
      debug("useSettings: API key saved successfully");
    } catch (e) {
      logError(`useSettings: failed to save API key - ${e}`);
      throw e;
    }
  }, [settings]);

  const clearApiKey = useCallback(async () => {
    try {
      debug("useSettings: clearing API key");
      const store = await load(STORE_NAME);
      const newSettings: AppSettings = {
        ...settings,
        openaiApiKey: null,
      };
      await store.set(SETTINGS_KEY, newSettings);
      await store.save();
      setSettings(newSettings);
      debug("useSettings: API key cleared successfully");
    } catch (e) {
      logError(`useSettings: failed to clear API key - ${e}`);
      throw e;
    }
  }, [settings]);

  return {
    settings,
    loading,
    saveApiKey,
    clearApiKey,
    hasApiKey: !!settings.openaiApiKey,
  };
}
