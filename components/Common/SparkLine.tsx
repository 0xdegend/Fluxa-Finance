import React from "react";

type SparklineProps = {
  series: number[];
  width?: number;
  height?: number;
  upColor?: string; // optional override
  downColor?: string; // optional override
  neutralColor?: string;
};

export default function SparkLine({
  series,
  width = 180,
  height = 48,
  upColor = "#16a34a", // green-600
  downColor = "#ef4444", // red-500
  neutralColor = "#6b7280", // gray-500
}: SparklineProps) {
  if (!Array.isArray(series) || series.length === 0) {
    return <svg width={width} height={height} aria-hidden="true" />;
  }

  const first = series[0];
  const last = series[series.length - 1];
  const delta = last - first;
  const strokeColor =
    delta > 0 ? downColor : delta < 0 ? upColor : neutralColor;
  const max = Math.max(...series);
  const min = Math.min(...series);
  const range = max - min || 1; // avoid divide by zero

  const pts = series.map((v, i) => {
    const x = (i / (series.length - 1)) * (width - 4) + 2;

    const y = height - 6 - ((v - min) / range) * (height - 12);
    return `${x},${y}`;
  });
  const points = pts.join(" ");
  const trendLabel =
    delta > 0 ? `up — ${last}` : delta < 0 ? `down — ${last}` : `${last}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Sparkline: ${trendLabel}`}
      preserveAspectRatio="none"
    >
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}
