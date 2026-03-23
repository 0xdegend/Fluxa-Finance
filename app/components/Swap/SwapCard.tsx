import React, { useState, useEffect } from "react";
import { Preview, SwapResult, TokenInfo, BalanceEntry } from "@/app/types";
import { TOKENS, NATIVE_PLACEHOLDER } from "@/app/data";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import ChainTokenModal from "../Common/ChainTokenModal";
import { adaptToTokenInfo } from "@/app/utils/tokenAdapter";
import {
  formatWeiToEth,
  getUsdValue,
  formatWithDecimals,
  isAddress,
  compositeKey,
  getDisplayedBalance,
  validate,
} from "@/app/utils";
import TokenRow from "./TokenRow";
import SwapPreview from "./SwapPreview";
import SwapSuccess from "./SwapSucess";
import { fetchRelayQuote } from "@/app/lib/relayQuote";
import { isStablecoin } from "@/app/lib/web3Service";
const adapted = adaptToTokenInfo(TOKENS);

interface SwapCardProps {
  selectedChain: string;
}

const SwapCard: React.FC<SwapCardProps> = ({ selectedChain }) => {
  const { authenticated, login } = usePrivy();
  const { wallets } = useWallets();
  const isWalletConnected = authenticated;
  const defaultEthToken =
    adapted.find((t) => t.symbol === "ETH" && t.chain === selectedChain) ||
    adapted[0];
  const [fromToken, setFromToken] = useState<TokenInfo | undefined>(
    defaultEthToken,
  );
  const [toToken, setToToken] = useState<TokenInfo | undefined>(adapted[1]);

  const [amount, setAmount] = useState<string>("");
  const [slippage, setSlippage] = useState<number>(0.5);
  const [showFromModal, setShowFromModal] = useState(false);
  const [showToModal, setShowToModal] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState("");
  const [amountTouched, setAmountTouched] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [success, setSuccess] = useState<SwapResult | null>(null);
  const [balances, setBalances] = useState<Record<string, BalanceEntry>>({});

  const handleLogin = async () => {
    login();
  };

  console.log(preview);

  async function fetchBalanceFor(
    chain: string,
    tokenAddress: string,
    wallet: string,
    symbol?: string,
  ): Promise<BalanceEntry | null> {
    const key = compositeKey(chain, tokenAddress);

    // Set loading state
    setBalances((prev) => ({
      ...prev,
      [key]:
        prev[key] && !prev[key].loading
          ? { ...prev[key], loading: true }
          : {
              loading: true,
              found: false,
              balanceRaw: "0",
              formatted: "0",
              decimals: 18,
              symbol: null,
              name: null,
            },
    }));

    try {
      let entry: BalanceEntry | null = null;

      if (
        symbol === "ETH" &&
        (tokenAddress === "" || tokenAddress === NATIVE_PLACEHOLDER)
      ) {
        // ✅ Native ETH — use native-balance API
        const url = `/api/native-balance?wallet=${encodeURIComponent(
          wallet,
        )}&chain=${encodeURIComponent(chain)}`;
        const r = await fetch(url);
        const j = await r.json().catch(() => null);
        console.debug("native-balance response:", j);

        // Response shape: { balance: string (wei), eth: string (formatted) }
        if (j && typeof j.eth === "string") {
          entry = {
            loading: false,
            found: true,
            balanceRaw: j.balance ?? "0",
            formatted: j.eth,
            decimals: 18,
            symbol: "ETH",
            name: "Ethereum",
          };
        }
      } else {
        // ✅ ERC20 — use erc20-balance API
        const url = `/api/erc20-balance?wallet=${encodeURIComponent(
          wallet,
        )}&token=${encodeURIComponent(tokenAddress)}&chain=${encodeURIComponent(
          chain,
        )}`;
        const r = await fetch(url);
        const j = await r.json().catch(() => null);
        console.debug("erc20-balance response:", j);

        if (j && j.found) {
          entry = {
            loading: false,
            found: true,
            balanceRaw: j.balance ?? "0",
            formatted:
              j.formatted ??
              formatWithDecimals(j.balance ?? "0", j.decimals ?? 18),
            decimals: j.decimals ?? 18,
            symbol: j.symbol ?? null,
            name: j.name ?? null,
          };
        }
      }

      const nextEntry: BalanceEntry = entry ?? {
        loading: false,
        found: false,
        balanceRaw: "0",
        formatted: "0",
        decimals: 18,
        symbol: symbol ?? null,
        name: null,
      };

      setBalances((prev) => {
        const next = { ...prev, [key]: nextEntry };
        console.debug("balances updated keys:", Object.keys(next));
        return next;
      });

      return nextEntry;
    } catch (err) {
      console.error("fetchBalanceFor error:", err);
      const fallback: BalanceEntry = {
        loading: false,
        found: false,
        balanceRaw: "0",
        formatted: "0",
        decimals: 18,
        symbol: symbol ?? null,
        name: null,
      };
      setBalances((prev) => ({ ...prev, [key]: fallback }));
      return null;
    }
  }

  useEffect(() => {
    let mounted = true;
    async function run() {
      if (!fromToken) return;
      const chain = selectedChain;
      let tokenAddr = fromToken.address ?? "";
      if (fromToken.symbol === "ETH" && (!tokenAddr || tokenAddr === "")) {
        tokenAddr = NATIVE_PLACEHOLDER;
      }
      if (
        !tokenAddr ||
        (!isAddress(tokenAddr) && tokenAddr !== NATIVE_PLACEHOLDER)
      ) {
        return;
      }
      const wallet =
        wallets && wallets.length > 0 ? wallets[0].address : undefined;
      if (!wallet) {
        return;
      }
      const key = compositeKey(chain, tokenAddr);
      const existing = balances[key];
      if (existing && !existing.loading && existing.found) return;
      if (!mounted) return;
      await fetchBalanceFor(chain, tokenAddr, wallet, fromToken.symbol);
    }
    run();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    fromToken?.chain,
    fromToken?.address,
    fromToken?.symbol,
    isWalletConnected,
    wallets?.[0]?.address,
    selectedChain,
  ]);

  async function handleQuick(percentage: number) {
    if (!fromToken) return;
    const chain = selectedChain;
    let resolvedAddr = fromToken.address ?? "";
    if (fromToken.symbol === "ETH" && (!resolvedAddr || resolvedAddr === "")) {
      resolvedAddr = NATIVE_PLACEHOLDER;
    }
    const wallet =
      wallets && wallets.length > 0 ? wallets[0].address : undefined;
    if (!wallet) return;
    const key = compositeKey(chain, resolvedAddr);
    let balanceEntry = balances[key];

    if (!balanceEntry || balanceEntry.loading) {
      // fetch and use returned entry (avoids stale state read)
      const fetched = await fetchBalanceFor(
        chain,
        resolvedAddr,
        wallet,
        fromToken.symbol,
      );
      balanceEntry = fetched ?? balances[key];
    }

    const balance = (balanceEntry?.formatted ?? "0").replace(/,/g, "");
    const numericBalance = parseFloat(balance);
    if (isNaN(numericBalance) || numericBalance <= 0) return;
    const newAmount = (numericBalance * percentage).toFixed(6);
    setAmount(newAmount);
    setPreview(null);
  }

  useEffect(() => {
    const controller = new AbortController();

    async function fetchQuote() {
      if (!fromToken || !toToken || !amount) {
        setPreview(null);
        return;
      }
      const parsed = parseFloat(amount.replace(/,/g, ""));
      if (isNaN(parsed) || parsed <= 0) {
        setPreview(null);
        return;
      }
      const wallet = wallets?.[0]?.address;
      if (!wallet) return;

      const quote = await fetchRelayQuote(
        fromToken,
        toToken,
        amount,
        wallet,
        selectedChain,
        toToken.chain ?? selectedChain, // destination chain from toToken
        slippage * 100, // convert 0.5% → 50 bps
      );

      if (!quote) return;

      setPreview({
        estOut: parseFloat(quote.estOut),
        estOutUsd: quote.estOutUsd,
        estInUsd: quote.estInUsd,
        priceImpact: parseFloat(quote.priceImpact),
        fee: parseFloat(quote.relayerFee),
        minReceived: parseFloat(quote.minReceived),
        gasFeeUsd: quote.gasFeeUsd,
        timeEstimate: quote.timeEstimate,
        rate: quote.rate,
      });
    }

    fetchQuote();
    return () => controller.abort();
  }, [
    amount,
    slippage,
    fromToken,
    toToken,
    wallets?.[0]?.address,
    selectedChain,
  ]);

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

  const [showAnim, setShowAnim] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  useEffect(() => {
    if (preview) {
      setShowAnim(true);
      const t = setTimeout(() => setShowAnim(false), 400);
      return () => clearTimeout(t);
    }
  }, [preview]);

  return (
    <div className="max-w-lg w-full mx-auto">
      <div
        className="rounded-xl shadow-md bg-white p-6 relative border border-gray-100 w-full"
        style={{ boxShadow: "0 4px 24px 0 rgba(0,0,0,0.04)" }}
      >
        {/* Sell header */}
        <div className="flex items-center justify-between mb-2">
          <label
            htmlFor="sell-amount"
            className="text-xs font-bold text-gray-600 font-rajdhani"
          >
            Sell
          </label>
          <div className="flex gap-2">
            <button
              className="text-xs px-2 py-1 bg-gray-100 rounded-full font-medium hover:bg-gray-200 text-black hover:cursor-pointer font-rajdhani"
              onClick={() => handleQuick(1)}
              aria-label="Set max amount"
            >
              Max
            </button>
            <button
              className="text-xs px-2 py-1 bg-gray-100 rounded-full font-medium hover:bg-gray-200 text-black hover:cursor-pointer font-rajdhani"
              onClick={() => handleQuick(0.5)}
              aria-label="Set 50 percent amount"
            >
              50%
            </button>
          </div>
        </div>

        {/* Sell token row */}
        <TokenRow
          label="Sell"
          inputId="sell-amount"
          token={fromToken}
          amount={amount}
          usdValue={preview ? parseFloat(preview.estInUsd) : 0}
          onSelectToken={() => setShowFromModal(true)}
          onAmountChange={(val) => {
            setAmount(val);
            setPreview(null);
          }}
          onFocus={() => setAmountTouched(true)}
          onBlur={() => setAmountTouched(true)}
        />

        {/* Balance display */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold font-rajdhani text-gray-500">
            Bal:{" "}
            {authenticated
              ? getDisplayedBalance(fromToken, selectedChain, balances)
              : "0"}
          </span>
        </div>

        {/* Switch button */}
        <div className="flex justify-center my-2">
          <button
            className="rounded-full bg-white border border-gray-200 shadow p-2 hover:bg-gray-50 focus:outline-none cursor-pointer"
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
        <label className="text-xs font-bold text-gray-600  font-rajdhani">
          Buy
        </label>
        <TokenRow
          label="Buy"
          token={toToken}
          amount={
            preview
              ? isStablecoin(toToken?.symbol)
                ? `${parseFloat(preview.estOutUsd).toFixed(2)}` // show USD amount for stables
                : `${preview.estOut.toFixed(6)}` // show token amount for others
              : "0"
          }
          usdValue={preview ? parseFloat(preview.estOutUsd) : 0}
          onSelectToken={() => setShowToModal(true)}
          readOnly
        />
        <div className="flex items-center gap-2 mb-2">
          <label
            htmlFor="slippage"
            className="text-xs text-gray-500 font-rajdhani"
          >
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
            className="border-[#6b63633f] border rounded px-2 py-1 w-20 text-xs text-black no-spinner outline-none mt-3 font-rajdhani"
            aria-label="Slippage tolerance"
          />
          <span className="text-xs text-gray-400">%</span>
        </div>

        {/* Preview toggle */}
        <div className="flex justify-center mb-2">
          <button
            type="button"
            aria-label={showPreview ? "Hide preview" : "Show preview"}
            onClick={() => setShowPreview((v) => !v)}
            className="p-1 rounded-full hover:bg-gray-100 focus:outline-none cursor-pointer"
          >
            <svg
              width="24"
              height="24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              className={`transition-transform duration-200 ${showPreview ? "rotate-180" : ""}`}
              aria-hidden="true"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </div>

        {/* Error */}
        {amountTouched && error && (
          <div className="text-red-500 text-xs mb-2 font-rajdhani">{error}</div>
        )}

        {/* Swap preview */}
        <SwapPreview
          preview={preview!}
          fromToken={fromToken}
          toToken={toToken}
          visible={!!preview && showPreview}
          animating={showAnim}
          amount={amount}
        />

        {/* CTA button */}
        <button
          className={`w-full mt-2 py-3 rounded-md font-bold text-lg uppercase tracking-wide shadow-inner font-rajdhani ${
            isWalletConnected
              ? "bg-green-500 text-white hover:bg-green-600"
              : "bg-gray-700 text-white"
          } transition-colors cursor-pointer`}
          style={{ boxShadow: "inset 0 2px 8px 0 rgba(0,0,0,0.08)" }}
          aria-label={isWalletConnected ? "Swap" : "Connect wallet"}
          disabled={
            swapping ||
            (isWalletConnected &&
              !!validate(fromToken, toToken, amount, selectedChain, balances))
          }
          onClick={isWalletConnected ? handleSwap : handleLogin}
        >
          {isWalletConnected
            ? swapping
              ? "Swapping..."
              : "Swap"
            : "Connect Wallet"}
        </button>

        {/* Success modal */}
        {success && (
          <SwapSuccess result={success} onClose={() => setSuccess(null)} />
        )}

        {/* Token modals */}
        <ChainTokenModal
          open={showFromModal}
          singleSelect
          initialSelected={fromToken ? [fromToken] : []}
          allowedTokens={adaptToTokenInfo(
            TOKENS.filter((t) => t.symbol !== toToken?.symbol),
          )}
          onConfirm={(tokens) => {
            const picked = tokens && tokens.length > 0 ? tokens[0] : undefined;
            if (picked) {
              setFromToken(picked);
              setPreview(null);
              setAmount("");
            }
            setShowFromModal(false);
          }}
          onClose={() => setShowFromModal(false)}
        />
        <ChainTokenModal
          open={showToModal}
          singleSelect
          initialSelected={toToken ? [toToken] : []}
          allowedTokens={adaptToTokenInfo(
            TOKENS.filter((t) => t.symbol !== fromToken?.symbol),
          )}
          onConfirm={(tokens) => {
            const picked = tokens && tokens.length > 0 ? tokens[0] : undefined;
            if (picked) {
              setToToken(picked);
              setPreview(null);
              setAmount("");
            }
            setShowToModal(false);
          }}
          onClose={() => setShowToModal(false)}
        />
      </div>
    </div>
  );
};

export default SwapCard;
