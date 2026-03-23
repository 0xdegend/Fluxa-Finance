import { Preview } from "@/app/types";
import { TokenInfo } from "@/app/types";

const formatTokenAmount = (raw: number, decimals: number) => {
  if (decimals === 6) return (raw * 1e12).toFixed(2); // USDC, USDT
  if (decimals === 8) return (raw * 1e10).toFixed(4); // WBTC
  return raw.toFixed(6); // ETH and 18-decimal tokens
};

const formatMinReceived = (raw: number, decimals: number) => {
  return (raw / Math.pow(10, decimals)).toFixed(decimals === 6 ? 2 : 6);
};

interface SwapPreviewProps {
  preview: Preview;
  fromToken: TokenInfo | undefined;
  toToken: TokenInfo | undefined;
  visible: boolean;
  animating: boolean;
  amount: string;
}

export default function SwapPreview({
  preview,
  fromToken,
  toToken,
  visible,
  animating,
  amount,
}: SwapPreviewProps) {
  if (!visible) return null;

  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden text-sm">
      {/* Route badge */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <span className="text-fluxa-muted font-rajdhani">Route</span>
        <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-full px-3 py-1">
          <span className="font-rajdhani font-medium text-xs">
            Relay · ~{preview.timeEstimate}s
          </span>
        </div>
      </div>

      {[
        // {
        //   label: "You pay",
        //   value: `${amount} ${fromToken?.symbol}`,
        //   sub: `$${preview.estInUsd}`,
        // },
        {
          label: "Rate",
          value: `1 ${fromToken?.symbol} ≈ ${Number(preview.rate).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${toToken?.symbol}`,
        },
        {
          label: "Price impact",
          value: `${preview.priceImpact.toFixed(2)}%`,
          valueClass:
            Math.abs(preview.priceImpact) > 2
              ? "text-red-500"
              : "text-green-600",
        },
        {
          label: "Max slippage",
          value: "0.5%",
        },
        {
          label: "Receive at least",
          sublabel: "after max slippage",
          value: `$${(Number(preview.estOutUsd) * 0.995).toFixed(2)}`,
        },
        {
          label: "Network cost",
          value: `$${preview.gasFeeUsd}`,
        },
        {
          label: "Fee",
          value: `${preview.fee.toFixed(6)} ${fromToken?.symbol}`,
        },
      ].map((row, i, arr) => (
        <div
          key={row.label}
          className={`flex items-center justify-between px-4 py-3 ${i < arr.length - 1 ? "border-b border-gray-100" : ""}`}
        >
          <div>
            <p className="text-fluxa-muted font-rajdhani">{row.label}</p>
            {row.sublabel && (
              <p className="text-xs text-gray-400 font-rajdhani">
                {row.sublabel}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className={`font-medium font-rajdhani ${row.valueClass ?? ""}`}>
              {row.value}
            </p>
            {/* {row.sub && (
              <p className="text-xs text-fluxa-muted font-rajdhani">
                {row.sub}
              </p>
            )} */}
          </div>
        </div>
      ))}
    </div>
  );
}
