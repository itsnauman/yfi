import { useState, useCallback } from "react";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { debug, info, error as logError } from "@tauri-apps/plugin-log";
import { DiagnosisResult } from "../types/diagnosis";
import { NetworkMetrics, MetricHistory } from "../types/metrics";
import { InterferenceAnalysis } from "../types/interference";
import { SpeedTestResults } from "../types/speedtest";

interface DiagnosisInput {
  metrics: NetworkMetrics | null;
  history: MetricHistory;
  interferenceAnalysis: InterferenceAnalysis | null;
  speedTestResults: SpeedTestResults | null;
}

interface UseAIDiagnosisResult {
  result: DiagnosisResult | null;
  loading: boolean;
  error: string | null;
  diagnose: (apiKey: string, input: DiagnosisInput) => Promise<void>;
  clearResult: () => void;
}

function buildPrompt(input: DiagnosisInput): string {
  const { metrics, history, interferenceAnalysis, speedTestResults } = input;

  let prompt = `You are a Wi-Fi network diagnostic expert. Analyze the following network metrics and provide actionable recommendations to improve the user's Wi-Fi experience.

## Current Network Metrics
`;

  if (metrics) {
    prompt += `
### Wi-Fi Connection
- SSID: ${metrics.wifi.ssid || "Unknown"}
- Connected: ${metrics.wifi.connected}
- Frequency Band: ${metrics.wifi.frequency_band || "Unknown"}
- Channel: ${metrics.wifi.channel || "Unknown"}
- Link Rate: ${metrics.wifi.link_rate_mbps !== null ? `${metrics.wifi.link_rate_mbps} Mbps` : "Unknown"}
- Signal Strength: ${metrics.wifi.signal_dbm !== null ? `${metrics.wifi.signal_dbm} dBm` : "Unknown"}
- Noise Level: ${metrics.wifi.noise_dbm !== null ? `${metrics.wifi.noise_dbm} dBm` : "Unknown"}

### Router Connection
- Router IP: ${metrics.router_ip || "Unknown"}
- Router Ping: ${metrics.router_ping?.latency_ms !== null ? `${metrics.router_ping?.latency_ms} ms` : "Unknown"}
- Router Jitter: ${metrics.router_ping?.jitter_ms !== null ? `${metrics.router_ping?.jitter_ms} ms` : "Unknown"}
- Router Packet Loss: ${metrics.router_ping?.packet_loss_percent !== null ? `${metrics.router_ping?.packet_loss_percent}%` : "Unknown"}

### Internet Connection (to 1.1.1.1)
- Internet Ping: ${metrics.internet_ping?.latency_ms !== null ? `${metrics.internet_ping?.latency_ms} ms` : "Unknown"}
- Internet Jitter: ${metrics.internet_ping?.jitter_ms !== null ? `${metrics.internet_ping?.jitter_ms} ms` : "Unknown"}
- Internet Packet Loss: ${metrics.internet_ping?.packet_loss_percent !== null ? `${metrics.internet_ping?.packet_loss_percent}%` : "Unknown"}

### DNS
- DNS Servers: ${metrics.dns.servers.length > 0 ? metrics.dns.servers.join(", ") : "None configured"}
- DNS Lookup Latency: ${metrics.dns.lookup_latency_ms !== null ? `${metrics.dns.lookup_latency_ms} ms` : "Unknown"}
`;
  }

  if (history.signal.length > 0) {
    prompt += `
### Historical Trends (last ${history.signal.length} samples)
- Signal Strength Range: ${Math.min(...history.signal)} to ${Math.max(...history.signal)} dBm (as absolute values)
- Internet Ping Range: ${Math.min(...history.internetPing.filter(v => v > 0))} to ${Math.max(...history.internetPing)} ms
- Link Rate Range: ${Math.min(...history.linkRate.filter(v => v > 0))} to ${Math.max(...history.linkRate)} Mbps
`;
  }

  if (interferenceAnalysis) {
    prompt += `
### Interference Analysis
- Interference Level: ${interferenceAnalysis.interference_level}
- Signal-to-Noise Ratio: ${interferenceAnalysis.snr_db !== null ? `${interferenceAnalysis.snr_db} dB` : "Unknown"} (${interferenceAnalysis.snr_quality})
- Current Channel: ${interferenceAnalysis.current_channel || "Unknown"}
- Networks on Same Channel: ${interferenceAnalysis.same_channel_count}
- Overlapping Networks: ${interferenceAnalysis.overlapping_count}
- Total Nearby Networks: ${interferenceAnalysis.nearby_networks.length}
`;
  }

  if (speedTestResults) {
    prompt += `
### Speed Test Results
- Download Speed: ${speedTestResults.downloadBandwidth.toFixed(1)} Mbps
- Upload Speed: ${speedTestResults.uploadBandwidth.toFixed(1)} Mbps
- Latency: ${speedTestResults.latency.toFixed(0)} ms
- Jitter: ${speedTestResults.jitter.toFixed(0)} ms
`;
  }

  prompt += `
## Instructions
Analyze the above data and respond with a JSON object in this exact format:
{
  "summary": "A one-paragraph summary of the overall network health and main findings",
  "overallHealth": "good" | "warning" | "poor",
  "issues": [
    {
      "description": "Description of an identified issue",
      "severity": "high" | "medium" | "low"
    }
  ],
  "recommendations": [
    "Actionable recommendation 1",
    "Actionable recommendation 2"
  ]
}

Guidelines:
- Be concise but specific
- Focus on actionable recommendations the user can actually implement
- Consider signal strength (-30 to -50 dBm is excellent, -50 to -60 is good, -60 to -70 is fair, below -70 is weak)
- Consider ping latency (under 20ms is excellent, 20-50ms is good, 50-100ms is acceptable, over 100ms is problematic)
- Consider packet loss (any packet loss above 0% is concerning)
- If interference analysis is available, consider channel congestion
- Respond ONLY with the JSON object, no additional text
`;

  return prompt;
}

export function useAIDiagnosis(): UseAIDiagnosisResult {
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const diagnose = useCallback(async (apiKey: string, input: DiagnosisInput) => {
    setLoading(true);
    setError(null);
    setResult(null);
    info("useAIDiagnosis: starting AI diagnosis");

    try {
      const openai = createOpenAI({
        apiKey,
      });

      const prompt = buildPrompt(input);
      info(`useAIDiagnosis: prompt:\n${prompt}`);

      const { text } = await generateText({
        model: openai("gpt-4o-mini"),
        prompt,
      });

      debug(`useAIDiagnosis: received response from OpenAI`);

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Failed to parse AI response - no JSON found");
      }

      const parsed = JSON.parse(jsonMatch[0]) as DiagnosisResult;

      if (!parsed.summary || !parsed.overallHealth || !Array.isArray(parsed.issues) || !Array.isArray(parsed.recommendations)) {
        throw new Error("Invalid response format from AI");
      }

      setResult(parsed);
      info(`useAIDiagnosis: diagnosis complete - health: ${parsed.overallHealth}, issues: ${parsed.issues.length}`);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      logError(`useAIDiagnosis: failed - ${errorMsg}`);

      if (errorMsg.includes("401") || errorMsg.includes("Unauthorized") || errorMsg.includes("invalid_api_key")) {
        setError("Invalid API key. Please check your OpenAI API key in Settings.");
      } else if (errorMsg.includes("429") || errorMsg.includes("rate_limit")) {
        setError("Rate limit exceeded. Please wait a moment and try again.");
      } else if (errorMsg.includes("timeout") || errorMsg.includes("ETIMEDOUT")) {
        setError("Request timed out. Please try again.");
      } else {
        setError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    result,
    loading,
    error,
    diagnose,
    clearResult,
  };
}
