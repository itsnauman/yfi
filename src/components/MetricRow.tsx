import { Sparkline } from "./Sparkline";
import { MetricStatus } from "../types/metrics";

interface MetricRowProps {
  label: string;
  value: string;
  unit?: string;
  status?: MetricStatus;
  history: number[];
  explanation?: string | null;
  invertSparkline?: boolean;
}

const statusColors: Record<MetricStatus, string> = {
  good: "#22c55e",
  warning: "#f59e0b",
  bad: "#ef4444",
  neutral: "#9ca3af",
};

export function MetricRow({
  label,
  value,
  unit = "",
  status = "neutral",
  history,
  explanation,
  invertSparkline = false,
}: MetricRowProps) {
  return (
    <div className="metric-row">
      <div className="metric-main">
        <span className="metric-label">{label}</span>
        <span className="metric-value" style={{ color: statusColors[status] }}>
          {value}
          {unit && <span className="metric-unit">{unit}</span>}
        </span>
        <Sparkline data={history} status={status} invertColors={invertSparkline} />
      </div>
      {explanation && <div className="metric-explanation">{explanation}</div>}
    </div>
  );
}
