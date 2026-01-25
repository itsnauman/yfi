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
        </span>
        <Sparkline data={history} status={status} invertColors={invertSparkline} />
      </div>
      {explanation && <div className="metric-explanation">{explanation}</div>}
    </div>
  );
}
