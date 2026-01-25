import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
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
    try {
      const result = await invoke<InterferenceAnalysis>("check_interference");
      setAnalysis(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
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
