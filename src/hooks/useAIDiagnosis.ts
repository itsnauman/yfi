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

function formatTimeSeries(data: number[], unit: string): string {
  if (data.length === 0) return "No data";
  const last10 = data.slice(-10);
  return `[${last10.join(", ")}] ${unit}`;
}

function buildPrompt(input: DiagnosisInput): string {
  const { metrics, history, interferenceAnalysis, speedTestResults } = input;

  let prompt = `You are a Wi-Fi network diagnostic expert. Analyze the following network metrics and provide actionable recommendations to improve the user's Wi-Fi experience.

The data below includes time series measurements (oldest to newest) to help you identify trends and patterns.

## Network Configuration
`;

  if (metrics) {
    prompt += `- Frequency Band: ${metrics.wifi.frequency_band || "Unknown"}
- Channel: ${metrics.wifi.channel || "Unknown"}
- DNS Servers: ${metrics.dns.servers.length > 0 ? metrics.dns.servers.join(", ") : "None configured"}
`;
  }

  const sampleCount = Math.min(history.signal.length, 10);

  prompt += `
## Time Series Metrics (${sampleCount} samples, oldest to newest)

### Wi-Fi Signal Quality
- Signal Strength (dBm): ${formatTimeSeries(history.signal, "dBm")}
- Noise Level (dBm): ${formatTimeSeries(history.noise, "dBm")}
- Link Rate (Mbps): ${formatTimeSeries(history.linkRate, "Mbps")}

### Router Connection
- Latency (ms): ${formatTimeSeries(history.routerPing, "ms")}
- Jitter (ms): ${formatTimeSeries(history.routerJitter, "ms")}
- Packet Loss (%): ${formatTimeSeries(history.routerLoss, "%")}

### Internet Connection (to 1.1.1.1)
- Latency (ms): ${formatTimeSeries(history.internetPing, "ms")}
- Jitter (ms): ${formatTimeSeries(history.internetJitter, "ms")}
- Packet Loss (%): ${formatTimeSeries(history.internetLoss, "%")}

### DNS
- Lookup Latency (ms): ${formatTimeSeries(history.dnsLookup, "ms")}
`;

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
- Analyze the time series data for trends: improving, degrading, stable, or intermittent patterns
- Look for correlations between metrics (e.g., signal drops coinciding with latency spikes)
- Be concise but specific
- Focus on actionable recommendations the user can actually implement
- Signal strength: -30 to -50 dBm is excellent, -50 to -60 is good, -60 to -70 is fair, below -70 is weak
- Ping latency: under 20ms is excellent, 20-50ms is good, 50-100ms is acceptable, over 100ms is problematic
- Any packet loss above 0% is concerning
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
        model: openai("gpt-5-mini"),
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
