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
  tooltip?: string;
}

const statusColors: Record<MetricStatus, string> = {
  good: "#34c759",
  warning: "#ff9500",
  bad: "#ff3b30",
  neutral: "#8e8e93",
};

const statusLabels: Record<MetricStatus, string> = {
  good: "Good",
  warning: "OK",
  bad: "Bad",
  neutral: "",
};

export function MetricRow({
  label,
  value,
  unit = "",
  status = "neutral",
  history,
  explanation,
  invertSparkline = false,
  tooltip,
}: MetricRowProps) {
  return (
    <div className="metric-row" title={tooltip}>
      <div className="metric-main">
        <span className="metric-label">{label}</span>
        <span className="metric-value" style={{ color: statusColors[status] }}>
          {value}
          {unit && <span className="metric-unit">{unit}</span>}
          {status !== "neutral" && statusLabels[status] && (
            <span className="metric-status-label">{statusLabels[status]}</span>
          )}
        </span>
        <Sparkline data={history} status={status} invertColors={invertSparkline} />
      </div>
      {explanation && <div className="metric-explanation">{explanation}</div>}
    </div>
  );
}
