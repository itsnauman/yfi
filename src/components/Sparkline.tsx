import {
  LineChart,
  Line,
  ResponsiveContainer,
  YAxis,
} from "recharts";
import { MetricStatus } from "../types/metrics";

interface SparklineProps {
  data: number[];
  status?: MetricStatus;
  height?: number;
  invertColors?: boolean;
}

const statusColors: Record<MetricStatus, string> = {
  good: "#34c759",
  warning: "#ff9500",
  bad: "#ff3b30",
  neutral: "#8e8e93",
};

export function Sparkline({
  data,
  status = "neutral",
  height = 24,
  invertColors = false,
}: SparklineProps) {
  if (data.length === 0) {
    return <div style={{ width: 80, height }} />;
  }

  const chartData = data.map((value, index) => ({ index, value }));
  const color = invertColors
    ? status === "good"
      ? statusColors.bad
      : status === "bad"
        ? statusColors.good
        : statusColors[status]
    : statusColors[status];

  return (
    <div style={{ width: 80, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <YAxis domain={["dataMin", "dataMax"]} hide />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
