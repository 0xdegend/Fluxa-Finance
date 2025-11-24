"use client";
import React from "react";
import type { TokenSummaryCardProps } from "@/types";
import Sparkline from "../Common/SparkLine";
import SparkLine from "../Common/SparkLine";
function formatPrice(n?: number) {
  if (n === undefined || n === null) return "—";
  if (n >= 1) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return n.toPrecision(4);
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
      ${formatPrice(price)}
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
    <SparkLine series={priceSeries} />
  </div>
);

export default TokenSummaryCard;
