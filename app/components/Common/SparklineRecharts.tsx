// components/Charts/SparklineRecharts.tsx
"use client";
import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

type SparklineRechartsProps = {
  series: number[];
  labels?: string[];
  change?: number;
  height?: number;
  upColor?: string;
  downColor?: string;
  neutralColor?: string;
  strokeWidth?: number;
  showGrid?: boolean;
};

function formatPrice(n?: number) {
  if (n === undefined || n === null) return "—";
  if (n >= 1) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return n.toPrecision(4);
}

type SparklineData = {
  idx: number;
  value: number;
  label: string;
};

type CustomTooltipProps = {
  active?: boolean;
  payload?: Array<{ payload?: SparklineData }>;
  label?: string;
};

const CustomTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  label,
}) => {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload!;
  if (!point) return null;
  return (
    <div
      className="bg-white/95 rounded-md p-2 text-sm shadow"
      style={{ pointerEvents: "none" }}
    >
      {/* <div className="font-semibold">{point.label}</div> */}
      <div className="text-xs text-gray-600 font-[funnel]">
        {formatPrice(point.value)}
      </div>
    </div>
  );
};
export default function SparklineRecharts({
  series,
  labels,
  change,
  height = 48,
  upColor = "#16a34a",
  downColor = "#ef4444",
  neutralColor = "#6b7280",
  strokeWidth = 2,
  showGrid = false,
}: SparklineRechartsProps) {
  // guard
  if (!Array.isArray(series) || series.length === 0) {
    return <svg width="100%" height={height} aria-hidden="true" />;
  }
  const first = series[0];
  const last = series[series.length - 1];
  const delta = last - first;
  const strokeColor =
    typeof change === "number"
      ? change > 0
        ? upColor
        : change < 0
          ? downColor
          : neutralColor
      : delta > 0
        ? upColor
        : delta < 0
          ? downColor
          : neutralColor;
  const data: SparklineData[] = series.map((value, i) => ({
    idx: i,
    value: Number(value),
    label: labels && labels[i] ? labels[i] : `${i + 1}`,
  }));

  return (
    <div
      style={{ width: "100%", height }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 4, right: 6, left: 6, bottom: 4 }}
        >
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#eee" />}
          <XAxis dataKey="label" hide />
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ stroke: "#00000011", strokeWidth: 1 }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            dot={false}
            isAnimationActive={true}
            animationDuration={400}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
