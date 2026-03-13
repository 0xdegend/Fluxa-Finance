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
      {preview.timeEstimate && (
        <div className="mb-2 text-black font-[audiowide]">
          Est. Time: <b>~{preview.timeEstimate}s</b>
        </div>
      )}
      {preview.gasFeeUsd && (
        <div className="mb-2 text-black font-[audiowide]">
          Gas Fee: <b>${preview.gasFeeUsd}</b>
        </div>
      )}
      {preview.rate && (
        <div className="mb-2 text-black font-[audiowide]">
          Rate: <b>{preview.rate}</b>
        </div>
      )}
    </div>
  );
}
