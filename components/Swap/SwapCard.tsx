import React, { useState } from "react";
import TokenListModal from "./TokenListModal";
import Image from "next/image";
// Types
export interface Token {
  symbol: string;
  name: string;
  balance: number;
  icon?: string;
}
export interface Preview {
  estOut: number;
  priceImpact: number;
  fee: number;
  minReceived: number;
}
export interface SwapParams {
  fromToken: Token;
  toToken: Token;
  amount: number;
  slippage: number;
}
export interface SwapResult {
  txHash: string;
  status: "success" | "error";
}

// Example tokens
const TOKENS: Token[] = [
  {
    symbol: "ETH",
    name: "Ethereum",
    balance: 5.123,
    icon: "/logos/eth-logo.png",
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    balance: 2500,
    icon: "/logos/usdc-logo.png",
  },
  {
    symbol: "DAI",
    name: "Dai",
    balance: 1800,
    icon: "/logos/dai-logo.png",
  },
];

// TODO: Replace with real wallet connection logic
const isWalletConnected = false;

const SwapCard: React.FC = () => {
  const [fromToken, setFromToken] = useState<Token>(TOKENS[0]);
  const [toToken, setToToken] = useState<Token>(TOKENS[1]);
  const [amount, setAmount] = useState<string>("");
  const [slippage, setSlippage] = useState<number>(0.5);
  const [showFromModal, setShowFromModal] = useState(false);
  const [showToModal, setShowToModal] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState("");
  const [swapping, setSwapping] = useState(false);
  const [success, setSuccess] = useState<SwapResult | null>(null);

  // TODO: Replace with real USD price lookup
  const getUsdValue = (token: Token, amt: string | number) => {
    const n = typeof amt === "string" ? parseFloat(amt) : amt;
    if (token.symbol === "ETH") return n * 2000;
    if (token.symbol === "USDC" || token.symbol === "DAI") return n * 1;
    return 0;
  };

  const parsedAmount = parseFloat(amount);

  function validate() {
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0)
      return "Enter a valid amount.";
    if (parsedAmount > fromToken.balance)
      return `Amount exceeds wallet balance (${fromToken.balance} ${fromToken.symbol})`;
    if (fromToken.symbol === toToken.symbol) return "Select different tokens.";
    return "";
  }

  function handleQuick(percent: number) {
    setAmount((fromToken.balance * percent).toFixed(4));
  }

  // Auto-preview calculation as user types
  React.useEffect(() => {
    const err = validate();
    setError(err);
    if (err) {
      setPreview(null);
      return;
    }
    // TODO: Replace with real price/fee/impact logic
    const priceImpact = 0.2 + Math.random() * 0.3; // 0.2-0.5%
    const fee = parsedAmount * 0.001; // 0.1%
    let estOut = 0;
    if (fromToken.symbol === "ETH" && toToken.symbol === "USDC") {
      estOut = parsedAmount * 2000;
    } else if (fromToken.symbol === "USDC" && toToken.symbol === "ETH") {
      estOut = parsedAmount / 2000;
    } else if (fromToken.symbol === "ETH" && toToken.symbol === "DAI") {
      estOut = parsedAmount * 2000; // treat DAI like USDC for demo
    } else if (fromToken.symbol === "DAI" && toToken.symbol === "ETH") {
      estOut = parsedAmount / 2000;
    } else {
      estOut = parsedAmount; // same token or unknown pair
    }
    const minReceived = estOut * (1 - slippage / 100);
    setPreview({ estOut, priceImpact, fee, minReceived });
  }, [amount, slippage, fromToken, toToken]);

  async function handleSwap() {
    setSwapping(true);
    setError("");
    // TODO: Replace with real web3 swap logic
    await new Promise((res) => setTimeout(res, 1200));
    setSuccess({
      txHash: "0x" + Math.random().toString(16).slice(2, 18),
      status: "success",
    });
    setSwapping(false);
    setPreview(null);
    setAmount("");
  }

  // Animation fallback for preview
  const [showAnim, setShowAnim] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  React.useEffect(() => {
    if (preview) {
      setShowAnim(true);
      const t = setTimeout(() => setShowAnim(false), 400);
      return () => clearTimeout(t);
    }
  }, [preview]);

  return (
    <div
      className="rounded-xl shadow-md bg-white p-6 max-w-md w-full relative border border-gray-100"
      style={{ boxShadow: "0 4px 24px 0 rgba(0,0,0,0.04)" }}
    >
      {/* Sell row */}
      <div className="flex items-center justify-between mb-2">
        <label
          htmlFor="sell-amount"
          className="text-xs font-semibold text-gray-600"
        >
          Sell
        </label>
        <div className="flex gap-2">
          <button
            className="text-xs px-2 py-1 bg-gray-100 rounded-full font-medium hover:bg-gray-200 text-black hover:cursor-pointer"
            onClick={() => handleQuick(1)}
            aria-label="Set max amount"
          >
            Max
          </button>
          <button
            className="text-xs px-2 py-1 bg-gray-100 rounded-full font-medium hover:bg-gray-200 text-black hover:cursor-pointer"
            onClick={() => handleQuick(0.5)}
            aria-label="Set 50 percent amount"
          >
            50%
          </button>
        </div>
      </div>
      <div className="flex items-center gap-3 mb-2">
        <button
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 focus:outline-none text-black"
          onClick={() => setShowFromModal(true)}
          aria-label="Select sell token"
        >
          {/* TODO: Token icon */}
          <div className="w-7 h-7 rounded-full  flex items-center justify-center font-bold text-xs">
            <Image
              src={fromToken.icon || ""}
              alt={fromToken.symbol}
              width={24}
              height={24}
              className="rounded-full"
              unoptimized
            />
          </div>
          <span className="font-semibold">{fromToken.symbol}</span>
          <svg
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        <div className="flex-1 flex flex-col items-end">
          <input
            id="sell-amount"
            type="text"
            inputMode="decimal"
            pattern="[0-9]*[.,]?[0-9]*"
            step="any"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setPreview(null);
            }}
            className="text-2xl font-mono text-right outline-none bg-transparent w-full text-black no-spinner"
            placeholder="0"
            aria-label="Sell amount"
          />
          <span className="text-xs text-gray-400">
            $
            {amount
              ? getUsdValue(fromToken, amount).toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })
              : "0.00"}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-400">Bal: {fromToken.balance}</span>
      </div>
      {/* Swap arrow */}
      <div className="flex justify-center my-2">
        <button
          className="rounded-full bg-white border border-gray-200 shadow p-2 hover:bg-gray-50 focus:outline-none"
          aria-label="Switch tokens"
          onClick={() => {
            setFromToken(toToken);
            setToToken(fromToken);
            setPreview(null);
            setAmount("");
          }}
        >
          <svg
            width="24"
            height="24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
      {/* Buy row */}
      <div>
        <label
          htmlFor="sell-amount"
          className="text-xs font-semibold text-gray-600"
        >
          Buy
        </label>

        <div className="flex items-center gap-3 mb-2">
          <button
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 focus:outline-none"
            onClick={() => setShowToModal(true)}
            aria-label="Select buy token"
          >
            {/* TODO: Token icon */}
            <div className="w-7 h-7 rounded-full  flex items-center justify-center font-bold text-xs">
              <Image
                src={toToken.icon || ""}
                alt={toToken.symbol}
                width={24}
                height={24}
                className="rounded-full"
                unoptimized
              />
            </div>
            <span className="font-semibold text-black">{toToken.symbol}</span>
            <svg
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          <div className="flex-1 flex flex-col items-end">
            <span className="text-2xl font-mono text-right text-gray-700">
              {preview ? preview.estOut.toFixed(0) : "0"}
            </span>
            <span className="text-xs text-gray-400">
              $
              {getUsdValue(
                toToken,
                preview ? preview.estOut : 0
              ).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Slippage control */}
      <div className="flex items-center gap-2 mb-2">
        <label htmlFor="slippage" className="text-xs text-gray-500">
          Slippage
        </label>
        <input
          id="slippage"
          type="number"
          min="0.1"
          max="5"
          step="0.1"
          value={slippage}
          onChange={(e) => setSlippage(Number(e.target.value))}
          className="border rounded px-2 py-1 w-20 text-xs"
          aria-label="Slippage tolerance"
        />
        <span className="text-xs text-gray-400">%</span>
      </div>
      {/* Preview dropdown toggle */}
      <div className="flex justify-center mb-2">
        <button
          type="button"
          aria-label={showPreview ? "Hide preview" : "Show preview"}
          onClick={() => setShowPreview((v) => !v)}
          className="p-1 rounded-full hover:bg-gray-100 focus:outline-none"
        >
          <svg
            width="24"
            height="24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
            className={`transition-transform duration-200 ${
              showPreview ? "rotate-180" : ""
            }`}
            aria-hidden="true"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>
      {/* Error */}
      {error && <div className="text-red-500 text-xs mb-2">{error}</div>}

      {/* Preview info shown in toToken input area, toggled by dropdown */}
      {preview && showPreview && (
        <div
          className={`transition-opacity duration-300 ${
            showAnim ? "opacity-0" : "opacity-100"
          } bg-gray-50 rounded-lg p-4 mb-2 border border-gray-100`}
          aria-live="polite"
        >
          <div className="mb-1 text-black">
            Estimated Output:{" "}
            <b>
              {preview.estOut.toFixed(4)} {toToken.symbol}
            </b>
          </div>
          <div className="mb-1 text-black">
            Price Impact: <b>{preview.priceImpact.toFixed(2)}%</b>
          </div>
          <div className="mb-1 text-black">
            Fee:{" "}
            <b>
              {preview.fee.toFixed(4)} {fromToken.symbol}
            </b>
          </div>
          <div className="text-black">
            Minimum Received:{" "}
            <b>
              {preview.minReceived.toFixed(4)} {toToken.symbol}
            </b>
          </div>
        </div>
      )}
      {/* CTA button */}
      <button
        className={`w-full mt-2 py-3 rounded-full font-bold text-lg uppercase tracking-wide shadow-inner ${
          isWalletConnected
            ? "bg-green-500 text-white hover:bg-green-600"
            : "bg-orange-400 text-white hover:bg-orange-500"
        } transition-colors`}
        style={{ boxShadow: "inset 0 2px 8px 0 rgba(0,0,0,0.08)" }}
        aria-label={isWalletConnected ? "Swap" : "Connect wallet"}
        disabled={swapping || !!validate()}
        onClick={isWalletConnected ? handleSwap : undefined}
      >
        {isWalletConnected
          ? swapping
            ? "Swapping..."
            : "Swap"
          : "Connect Wallet"}
      </button>
      {/* Success modal */}
      {success && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white rounded-lg p-6 shadow-lg text-center">
            <div className="text-green-600 text-2xl mb-2">Swap Successful!</div>
            <div className="mb-2">
              Tx Hash:{" "}
              <span className="font-mono text-xs">{success.txHash}</span>
            </div>
            <button
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded"
              onClick={() => setSuccess(null)}
              aria-label="Close success modal"
            >
              Close
            </button>
          </div>
        </div>
      )}
      {/* Token modals */}
      <TokenListModal
        open={showFromModal}
        onSelect={(t) => {
          setFromToken(t);
          setPreview(null);
          setAmount("");
        }}
        onClose={() => setShowFromModal(false)}
        tokens={TOKENS.filter((t) => t.symbol !== toToken.symbol)}
      />
      <TokenListModal
        open={showToModal}
        onSelect={(t) => {
          setToToken(t);
          setPreview(null);
        }}
        onClose={() => setShowToModal(false)}
        tokens={TOKENS.filter((t) => t.symbol !== fromToken.symbol)}
      />
    </div>
  );
};

export default SwapCard;
