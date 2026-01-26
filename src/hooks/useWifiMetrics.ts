import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { debug, error as logError } from "@tauri-apps/plugin-log";
import { NetworkMetrics, MetricHistory } from "../types/metrics";
import { RingBuffer } from "../utils/RingBuffer";

const HISTORY_LENGTH = 30;
const POLL_INTERVAL_MS = 3000;

interface HistoryBuffers {
  linkRate: RingBuffer;
  signal: RingBuffer;
  noise: RingBuffer;
  routerPing: RingBuffer;
  routerJitter: RingBuffer;
  routerLoss: RingBuffer;
  internetPing: RingBuffer;
  internetJitter: RingBuffer;
  internetLoss: RingBuffer;
  dnsLookup: RingBuffer;
}

function createHistoryBuffers(): HistoryBuffers {
  return {
    linkRate: new RingBuffer(HISTORY_LENGTH),
    signal: new RingBuffer(HISTORY_LENGTH),
    noise: new RingBuffer(HISTORY_LENGTH),
    routerPing: new RingBuffer(HISTORY_LENGTH),
    routerJitter: new RingBuffer(HISTORY_LENGTH),
    routerLoss: new RingBuffer(HISTORY_LENGTH),
    internetPing: new RingBuffer(HISTORY_LENGTH),
    internetJitter: new RingBuffer(HISTORY_LENGTH),
    internetLoss: new RingBuffer(HISTORY_LENGTH),
    dnsLookup: new RingBuffer(HISTORY_LENGTH),
  };
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
  const buffersRef = useRef<HistoryBuffers>(createHistoryBuffers());

  const fetchMetrics = useCallback(async () => {
    try {
      debug("useWifiMetrics: fetching network metrics");
      const result = await invoke<NetworkMetrics>("get_network_metrics");
      if (!isMounted.current) return;

      setMetrics(result);
      setError(null);

      const buffers = buffersRef.current;
      buffers.linkRate.push(result.wifi.link_rate_mbps ?? 0);
      buffers.signal.push(
        result.wifi.signal_dbm ? Math.abs(result.wifi.signal_dbm) : 0
      );
      buffers.noise.push(
        result.wifi.noise_dbm ? Math.abs(result.wifi.noise_dbm) : 0
      );
      buffers.routerPing.push(result.router_ping?.latency_ms ?? 0);
      buffers.routerJitter.push(result.router_ping?.jitter_ms ?? 0);
      buffers.routerLoss.push(result.router_ping?.packet_loss_percent ?? 0);
      buffers.internetPing.push(result.internet_ping?.latency_ms ?? 0);
      buffers.internetJitter.push(result.internet_ping?.jitter_ms ?? 0);
      buffers.internetLoss.push(result.internet_ping?.packet_loss_percent ?? 0);
      buffers.dnsLookup.push(result.dns.lookup_latency_ms ?? 0);

      setHistory({
        linkRate: buffers.linkRate.toArray(),
        signal: buffers.signal.toArray(),
        noise: buffers.noise.toArray(),
        routerPing: buffers.routerPing.toArray(),
        routerJitter: buffers.routerJitter.toArray(),
        routerLoss: buffers.routerLoss.toArray(),
        internetPing: buffers.internetPing.toArray(),
        internetJitter: buffers.internetJitter.toArray(),
        internetLoss: buffers.internetLoss.toArray(),
        dnsLookup: buffers.dnsLookup.toArray(),
      });

      debug(`useWifiMetrics: metrics received - signal: ${result.wifi.signal_dbm}dBm, internet ping: ${result.internet_ping?.latency_ms}ms`);
    } catch (e) {
      if (!isMounted.current) return;
      const errorMsg = e instanceof Error ? e.message : String(e);
      logError(`useWifiMetrics: fetch failed - ${errorMsg}`);
      setError(errorMsg);
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
