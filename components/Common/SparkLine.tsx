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
    // nothing to render — return an empty SVG for layout stability
    return <svg width={width} height={height} aria-hidden="true" />;
  }

  // determine color based on last change
  const last = series[series.length - 1];
  const prev = series.length >= 2 ? series[series.length - 2] : undefined;
  const isUp = typeof prev === "number" ? last >= prev : null;
  const strokeColor = isUp === null ? neutralColor : isUp ? upColor : downColor;

  // compute min/max safely
  const max = Math.max(...series);
  const min = Math.min(...series);
  const range = max - min || 1; // avoid divide by zero

  // build points
  const pts = series.map((v, i) => {
    // x: distribute across width with small padding
    const x = (i / (series.length - 1)) * (width - 4) + 2;
    // y: invert so larger values are higher up
    const y = height - 6 - ((v - min) / range) * (height - 12);
    return `${x},${y}`;
  });
  const points = pts.join(" ");

  // accessible label
  const trendLabel =
    isUp === null ? `${last}` : isUp ? `up — ${last}` : `down — ${last}`;

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
