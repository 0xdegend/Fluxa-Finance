import { Preview } from "@/app/types";
import { TokenInfo } from "@/app/types";

interface SwapPreviewProps {
  preview: Preview;
  fromToken: TokenInfo | undefined;
  toToken: TokenInfo | undefined;
  visible: boolean;
  animating: boolean;
}

export default function SwapPreview({
  preview,
  fromToken,
  toToken,
  visible,
  animating,
}: SwapPreviewProps) {
  if (!visible) return null;

  return (
    <div
      className={`transition-opacity duration-300 ${animating ? "opacity-0" : "opacity-100"} bg-gray-50 rounded-lg p-4 mb-2 border border-gray-100`}
      aria-live="polite"
    >
      <div className="mb-2 text-black font-rajdhani">
        Estimated Output:{" "}
        <b>
          {preview.estOut.toFixed(4)} {toToken?.symbol ?? ""}
        </b>
      </div>
      <div className="mb-2 text-black font-rajdhani">
        Price Impact: <b>{preview.priceImpact.toFixed(2)}%</b>
      </div>
      <div className="mb-2 text-black font-rajdhani">
        Fee:{" "}
        <b>
          {preview.fee.toFixed(4)} {fromToken?.symbol ?? ""}
        </b>
      </div>
      <div className="mb-2 text-black font-rajdhani">
        Minimum Received:{" "}
        <b>
          {preview.minReceived} {toToken?.symbol ?? ""}
        </b>
      </div>
      {preview.rate && (
        <div className="mb-2 text-black font-rajdhani">
          Rate: <b>{preview.rate}</b>
        </div>
      )}
      {preview.gasFeeUsd && (
        <div className="mb-2 text-black font-rajdhani">
          Gas Fee: <b>${preview.gasFeeUsd}</b>
        </div>
      )}
      {preview.timeEstimate != null && preview.timeEstimate > 0 && (
        <div className="text-black font-rajdhani">
          Est. Time: <b>~{preview.timeEstimate}s</b>
        </div>
      )}
    </div>
  );
}
