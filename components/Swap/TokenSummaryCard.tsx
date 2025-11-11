"use client";
import React from "react";
import type { TokenSummaryCardProps } from "@/types";
function Sparkline({ series }: { series: number[] }) {
  const width = 180;
  const height = 48;
  const max = Math.max(...series);
  const min = Math.min(...series);
  const points = series
    .map((v, i) => {
      const x = (i / (series.length - 1)) * (width - 4) + 2;
      const y = height - 6 - ((v - min) / (max - min || 1)) * (height - 12);
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg width={width} height={height} aria-hidden="true">
      <polyline fill="none" stroke="#4f46e5" strokeWidth="2" points={points} />
    </svg>
  );
}

const TokenSummaryCard: React.FC<TokenSummaryCardProps> = ({
  token,
  price,
  change,
  priceSeries,
}) => (
  <div className="flex flex-col items-center bg-white rounded-lg shadow p-3 min-w-[220px]">
    <div className="font-semibold text-lg font-[audiowide]">{token}</div>
    <div className="text-sm text-gray-500 font-[audiowide]">
      ${price.toFixed(2)}
    </div>
    <div
      className={`text-xs ${
        change >= 0
          ? "text-green-600 font-[audiowide]"
          : "text-red-500 font-[audiowide]"
      }`}
    >
      {change >= 0 ? "+" : ""}
      {change.toFixed(2)}%
    </div>
    <Sparkline series={priceSeries} />
  </div>
);

export default TokenSummaryCard;
