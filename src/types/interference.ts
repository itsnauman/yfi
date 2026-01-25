import { MetricStatus } from "./metrics";

export interface NearbyNetwork {
  ssid: string;
  channel: number;
  frequency_ghz: number;
}

export interface InterferenceAnalysis {
  snr_db: number | null;
  snr_quality: string;
  current_channel: number | null;
  current_frequency_ghz: number | null;
  same_channel_count: number;
  overlapping_count: number;
  nearby_networks: NearbyNetwork[];
  interference_level: string;
  suggestions: string[];
}

export function getInterferenceLevelStatus(level: string): MetricStatus {
  switch (level) {
    case "Low":
      return "good";
    case "Moderate":
      return "warning";
    case "High":
    case "Severe":
      return "bad";
    default:
      return "neutral";
  }
}

export function getSnrStatus(snrDb: number | null): MetricStatus {
  if (snrDb === null) return "neutral";
  if (snrDb >= 40) return "good";
  if (snrDb >= 25) return "good";
  if (snrDb >= 15) return "warning";
  return "bad";
}
