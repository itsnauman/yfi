import { useState, useCallback, useRef } from "react";
import SpeedTest from "@cloudflare/speedtest";
import { SpeedTestResults } from "../types/speedtest";

interface UseSpeedTestResult {
  results: SpeedTestResults | null;
  loading: boolean;
  error: string | null;
  status: string;
  runSpeedTest: () => void;
  clearResults: () => void;
}

export function useSpeedTest(): UseSpeedTestResult {
  const [results, setResults] = useState<SpeedTestResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const speedTestRef = useRef<SpeedTest | null>(null);

  const runSpeedTest = useCallback(() => {
    setLoading(true);
    setError(null);
    setResults(null);
    setStatus("Initializing...");

    try {
      const speedTest = new SpeedTest({
        autoStart: false,
        measurements: [
          { type: "latency", numPackets: 20 },
          { type: "download", bytes: 1_000_000, count: 4 },
          { type: "download", bytes: 10_000_000, count: 4 },
          { type: "download", bytes: 25_000_000, count: 4 },
          { type: "upload", bytes: 1_000_000, count: 4 },
          { type: "upload", bytes: 5_000_000, count: 4 },
          { type: "upload", bytes: 10_000_000, count: 4 },
        ],
      });
      speedTestRef.current = speedTest;

      speedTest.onResultsChange = ({ type }) => {
        if (type === "latency") {
          setStatus("Testing latency...");
        } else if (type === "download") {
          setStatus("Testing download...");
        } else if (type === "upload") {
          setStatus("Testing upload...");
        }
      };

      speedTest.onFinish = (results) => {
        setStatus("Processing results...");
        try {
          const summary = results.getSummary();
          setResults({
            downloadBandwidth: (summary.download ?? 0) / 1_000_000,
            uploadBandwidth: (summary.upload ?? 0) / 1_000_000,
            latency: summary.latency ?? 0,
            jitter: summary.jitter ?? 0,
          });
          setStatus("");
        } catch (e) {
          setError(`Error processing results: ${e}`);
          setStatus("");
        }
        setLoading(false);
        speedTestRef.current = null;
      };

      speedTest.onError = (err: unknown) => {
        setError(err instanceof Error ? err.message : String(err));
        setStatus("");
        setLoading(false);
        speedTestRef.current = null;
      };

      speedTest.play();
      setStatus("Starting test...");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("");
      setLoading(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    if (speedTestRef.current) {
      speedTestRef.current.pause();
      speedTestRef.current = null;
    }
    setResults(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    results,
    loading,
    error,
    status,
    runSpeedTest,
    clearResults,
  };
}
