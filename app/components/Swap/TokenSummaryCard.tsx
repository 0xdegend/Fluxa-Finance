"use client";
import React from "react";
import type { TokenSummaryCardProps } from "@/app/types";
import SparkLine from "../Common/SparkLine";
import SparklineRecharts from "../Common/SparklineRecharts";
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
  <div
    className={`flex flex-col items-center rounded-lg shadow p-3 min-w-[220px] ${
      change >= 0 ? "bg-[#e9f1e980]" : "bg-[#f4e8e96f]"
    }`}
  >
    <div className="font-semibold text-lg font-[funnel]">{token}</div>
    <div className="text-sm text-gray-500 font-[funnel]">
      ${formatPrice(price)}
    </div>
    <div
      className={`text-xs ${
        change >= 0
          ? "text-green-600 font-[funnel]"
          : "text-red-500 font-[funnel]"
      }`}
    >
      {change >= 0 ? "+" : ""}
      {change.toFixed(2)}%
    </div>
    <SparklineRecharts series={priceSeries} height={70} change={change} />
  </div>
);

export default TokenSummaryCard;
