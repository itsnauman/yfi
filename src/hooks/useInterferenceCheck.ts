import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { debug, error as logError } from "@tauri-apps/plugin-log";
import { InterferenceAnalysis } from "../types/interference";

interface UseInterferenceCheckResult {
  analysis: InterferenceAnalysis | null;
  loading: boolean;
  error: string | null;
  checkInterference: () => Promise<void>;
  clearAnalysis: () => void;
}

export function useInterferenceCheck(): UseInterferenceCheckResult {
  const [analysis, setAnalysis] = useState<InterferenceAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkInterference = useCallback(async () => {
    setLoading(true);
    setError(null);
    debug("useInterferenceCheck: starting interference check");
    try {
      const result = await invoke<InterferenceAnalysis>("check_interference");
      setAnalysis(result);
      debug(`useInterferenceCheck: complete - level: ${result.interference_level}, nearby: ${result.nearby_networks.length}`);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      logError(`useInterferenceCheck: failed - ${errorMsg}`);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearAnalysis = useCallback(() => {
    setAnalysis(null);
    setError(null);
  }, []);

  return {
    analysis,
    loading,
    error,
    checkInterference,
    clearAnalysis,
  };
}
