export interface SpeedTestResults {
  downloadBandwidth: number;
  uploadBandwidth: number;
  latency: number;
  jitter: number;
}

export type SpeedStatus = "good" | "warning" | "bad";

export function getDownloadStatus(mbps: number | null): SpeedStatus {
  if (mbps === null) return "bad";
  if (mbps >= 50) return "good";
  if (mbps >= 10) return "warning";
  return "bad";
}

export function getUploadStatus(mbps: number | null): SpeedStatus {
  if (mbps === null) return "bad";
  if (mbps >= 10) return "good";
  if (mbps >= 3) return "warning";
  return "bad";
}

export function getSpeedTestLatencyStatus(ms: number | null): SpeedStatus {
  if (ms === null) return "bad";
  if (ms <= 30) return "good";
  if (ms <= 100) return "warning";
  return "bad";
}
