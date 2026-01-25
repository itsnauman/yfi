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
  const width = 150;
  const padding = 2;

  if (data.length === 0) {
    return <div style={{ width, height }} />;
  }

  const color = invertColors
    ? status === "good"
      ? statusColors.bad
      : status === "bad"
        ? statusColors.good
        : statusColors[status]
    : statusColors[status];

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  const points = data
    .map((value, index) => {
      const x = padding + (index / (data.length - 1 || 1)) * innerWidth;
      const y = padding + innerHeight - ((value - min) / range) * innerHeight;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: "block" }}
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
