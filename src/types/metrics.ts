export interface WifiInfo {
  connected: boolean;
  ssid: string | null;
  frequency_band: string | null;
  channel: string | null;
  link_rate_mbps: number | null;
  signal_dbm: number | null;
  noise_dbm: number | null;
}

export interface PingResult {
  latency_ms: number | null;
  jitter_ms: number | null;
  packet_loss_percent: number | null;
}

export interface DnsInfo {
  servers: string[];
  lookup_latency_ms: number | null;
}

export interface NetworkMetrics {
  wifi: WifiInfo;
  router_ip: string | null;
  router_ping: PingResult | null;
  internet_ping: PingResult | null;
  dns: DnsInfo;
}

export interface MetricHistory {
  linkRate: number[];
  signal: number[];
  noise: number[];
  routerPing: number[];
  routerJitter: number[];
  routerLoss: number[];
  internetPing: number[];
  internetJitter: number[];
  internetLoss: number[];
  dnsLookup: number[];
}

export type MetricStatus = "good" | "warning" | "bad" | "neutral";

export function getSignalStatus(dbm: number | null): MetricStatus {
  if (dbm === null) return "neutral";
  if (dbm > -60) return "good";
  if (dbm >= -75) return "warning";
  return "bad";
}

export function getPingStatus(ms: number | null): MetricStatus {
  if (ms === null) return "neutral";
  if (ms < 20) return "good";
  if (ms <= 100) return "warning";
  return "bad";
}

export function getJitterStatus(ms: number | null): MetricStatus {
  if (ms === null) return "neutral";
  if (ms < 10) return "good";
  if (ms <= 50) return "warning";
  return "bad";
}

export function getLossStatus(percent: number | null): MetricStatus {
  if (percent === null) return "neutral";
  if (percent === 0) return "good";
  if (percent <= 5) return "warning";
  return "bad";
}

export function getLinkRateStatus(mbps: number | null): MetricStatus {
  if (mbps === null) return "neutral";
  if (mbps >= 200) return "good";
  if (mbps >= 50) return "warning";
  return "bad";
}
