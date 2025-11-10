"use client";
import React from "react";

interface TokenSummaryCardProps {
  token: string;
  price: number;
  change: number;
  priceSeries: number[];
}

// Placeholder sparkline using SVG
function Sparkline({ series }: { series: number[] }) {
  const max = Math.max(...series);
  const min = Math.min(...series);
  const points = series
    .map((v, i) => {
      const x = (i / (series.length - 1)) * 60;
      const y = 30 - ((v - min) / (max - min || 1)) * 24;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg width="64" height="32" aria-hidden="true">
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
  <div className="flex flex-col items-center bg-white rounded-lg shadow p-3 min-w-[120px]">
    <div className="font-semibold text-lg">{token}</div>
    <div className="text-sm text-gray-500">${price.toFixed(2)}</div>
    <div
      className={`text-xs ${change >= 0 ? "text-green-600" : "text-red-500"}`}
    >
      {change >= 0 ? "+" : ""}
      {change.toFixed(2)}%
    </div>
    <Sparkline series={priceSeries} />
  </div>
);

export default TokenSummaryCard;
