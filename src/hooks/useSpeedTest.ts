import { useState, useCallback, useRef } from "react";
import SpeedTest from "@cloudflare/speedtest";
import { debug, info, error as logError } from "@tauri-apps/plugin-log";
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
    info("useSpeedTest: starting speed test");

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
          debug("useSpeedTest: testing latency");
          setStatus("Testing latency...");
        } else if (type === "download") {
          debug("useSpeedTest: testing download");
          setStatus("Testing download...");
        } else if (type === "upload") {
          debug("useSpeedTest: testing upload");
          setStatus("Testing upload...");
        }
      };

      speedTest.onFinish = (results) => {
        setStatus("Processing results...");
        try {
          const summary = results.getSummary();
          const finalResults = {
            downloadBandwidth: (summary.download ?? 0) / 1_000_000,
            uploadBandwidth: (summary.upload ?? 0) / 1_000_000,
            latency: summary.latency ?? 0,
            jitter: summary.jitter ?? 0,
          };
          setResults(finalResults);
          info(`useSpeedTest: complete - download: ${finalResults.downloadBandwidth.toFixed(1)}Mbps, upload: ${finalResults.uploadBandwidth.toFixed(1)}Mbps, latency: ${finalResults.latency.toFixed(1)}ms`);
          setStatus("");
        } catch (e) {
          logError(`useSpeedTest: error processing results - ${e}`);
          setError(`Error processing results: ${e}`);
          setStatus("");
        }
        setLoading(false);
        speedTestRef.current = null;
      };

      speedTest.onError = (err: unknown) => {
        const errorMsg = err instanceof Error ? err.message : String(err);
        logError(`useSpeedTest: error - ${errorMsg}`);
        setError(errorMsg);
        setStatus("");
        setLoading(false);
        speedTestRef.current = null;
      };

      speedTest.play();
      setStatus("Starting test...");
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      logError(`useSpeedTest: initialization error - ${errorMsg}`);
      setError(errorMsg);
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
