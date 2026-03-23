import { SwapResult } from "@/app/types";

interface SwapSuccessProps {
  result: SwapResult;
  onClose: () => void;
}

export default function SwapSuccess({ result, onClose }: SwapSuccessProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
      <div className="bg-white rounded-lg p-6 shadow-lg text-center">
        <div className="text-green-600 text-2xl mb-2 font-rajdhani">
          Swap Successful!
        </div>
        <div className="mb-2 font-rajdhani">
          Tx Hash: <span className="font-mono text-xs">{result.txHash}</span>
        </div>
        <button
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded font-rajdhani"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
}
