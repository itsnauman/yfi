import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { NetworkMetrics, MetricHistory } from "../types/metrics";

const HISTORY_LENGTH = 30;
const POLL_INTERVAL_MS = 3000;

function pushToHistory(arr: number[], value: number | null): number[] {
  const newArr = [...arr, value ?? 0];
  if (newArr.length > HISTORY_LENGTH) {
    return newArr.slice(-HISTORY_LENGTH);
  }
  return newArr;
}

const initialHistory: MetricHistory = {
  linkRate: [],
  signal: [],
  noise: [],
  routerPing: [],
  routerJitter: [],
  routerLoss: [],
  internetPing: [],
  internetJitter: [],
  internetLoss: [],
  dnsLookup: [],
};

export function useWifiMetrics() {
  const [metrics, setMetrics] = useState<NetworkMetrics | null>(null);
  const [history, setHistory] = useState<MetricHistory>(initialHistory);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  const fetchMetrics = useCallback(async () => {
    try {
      const result = await invoke<NetworkMetrics>("get_network_metrics");
      if (!isMounted.current) return;

      setMetrics(result);
      setError(null);

      setHistory((prev) => ({
        linkRate: pushToHistory(prev.linkRate, result.wifi.link_rate_mbps),
        signal: pushToHistory(
          prev.signal,
          result.wifi.signal_dbm ? Math.abs(result.wifi.signal_dbm) : null
        ),
        noise: pushToHistory(
          prev.noise,
          result.wifi.noise_dbm ? Math.abs(result.wifi.noise_dbm) : null
        ),
        routerPing: pushToHistory(
          prev.routerPing,
          result.router_ping?.latency_ms ?? null
        ),
        routerJitter: pushToHistory(
          prev.routerJitter,
          result.router_ping?.jitter_ms ?? null
        ),
        routerLoss: pushToHistory(
          prev.routerLoss,
          result.router_ping?.packet_loss_percent ?? null
        ),
        internetPing: pushToHistory(
          prev.internetPing,
          result.internet_ping?.latency_ms ?? null
        ),
        internetJitter: pushToHistory(
          prev.internetJitter,
          result.internet_ping?.jitter_ms ?? null
        ),
        internetLoss: pushToHistory(
          prev.internetLoss,
          result.internet_ping?.packet_loss_percent ?? null
        ),
        dnsLookup: pushToHistory(prev.dnsLookup, result.dns.lookup_latency_ms),
      }));
    } catch (e) {
      if (!isMounted.current) return;
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    fetchMetrics();

    const interval = setInterval(fetchMetrics, POLL_INTERVAL_MS);

    return () => {
      isMounted.current = false;
      clearInterval(interval);
    };
  }, [fetchMetrics]);

  return { metrics, history, loading, error, refetch: fetchMetrics };
}
