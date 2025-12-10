import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Preview, SwapResult, TokenInfo } from "@/types";
import { TOKENS } from "@/data";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import ChainTokenModal from "../Common/ChainTokenModal";
import { adaptToTokenInfo } from "@/app/utils/tokenAdapter";

const adapted = adaptToTokenInfo(TOKENS);

const CHAIN_LOGOS: Record<string, string | undefined> = {
  base: "/logos/base-icon.svg",
  eth: "/logos/ethereum-icon.png",
  arbitrum: "/logos/arbitrum-icon.png",
  solana: "/logos/solana-icon.png",
  bsc: "/logos/bnb-icon.png",
};

function isAddress(x?: string) {
  return typeof x === "string" && /^0x[0-9a-fA-F]{40}$/.test(x);
}

function compositeKey(chain?: string, address?: string) {
  return `${(chain ?? "").toLowerCase()}:${(address ?? "").toLowerCase()}`;
}

type BalanceEntry = {
  loading: boolean;
  found: boolean;
  balanceRaw: string;
  formatted: string;
  decimals: number;
  symbol: string | null;
  name: string | null;
};

interface SwapCardProps {
  selectedChain: string;
}

const SwapCard: React.FC<SwapCardProps> = ({ selectedChain }) => {
  const { authenticated } = usePrivy();
  const { wallets } = useWallets();
  const NATIVE_PLACEHOLDER = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
  const isWalletConnected = authenticated;
  const defaultEthToken =
    adapted.find((t) => t.symbol === "ETH" && t.chain === selectedChain) ||
    adapted[0];
  const [fromToken, setFromToken] = useState<TokenInfo | undefined>(
    defaultEthToken
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

  const getUsdValue = (token: TokenInfo | undefined, amt: string | number) => {
    const n = typeof amt === "string" ? parseFloat(amt) || 0 : (amt as number);
    if (!token) return 0;
    if (token.symbol === "ETH") return n * 2000;
    if (token.symbol === "USDC" || token.symbol === "DAI") return n * 1;
    return 0;
  };

  function formatWeiToEth(weiStr: string): string | null {
    if (typeof weiStr !== "string" || !/^\d+$/.test(weiStr)) return null;
    try {
      const wei = BigInt(weiStr);
      const WEI_PER_ETH = BigInt("1000000000000000000"); // 1e18 as bigint

      const whole = wei / WEI_PER_ETH;
      const remainder = wei % WEI_PER_ETH;

      if (remainder === BigInt(0)) {
        return whole.toString();
      }
      let frac = remainder.toString().padStart(18, "0");
      frac = frac.replace(/0+$/g, ""); // remove trailing zeros

      return `${whole.toString()}.${frac}`;
    } catch {
      return null;
    }
  }

  function formatWithDecimals(balanceStr: string, decimals: number) {
    const digits = (balanceStr || "").replace(/^0+/, "");
    const dec = Math.max(0, Math.floor(Number(decimals) || 0));
    if (digits.length === 0) return "0";
    if (dec === 0) return digits;
    if (digits.length <= dec) {
      const frac = digits.padStart(dec, "0").replace(/0+$/, "");
      return frac === "" ? "0" : `0.${frac}`;
    }
    const intPart = digits.slice(0, digits.length - dec);
    const fracPart = digits.slice(digits.length - dec).replace(/0+$/, "");
    return fracPart === "" ? intPart : `${intPart}.${fracPart}`;
  }

  function addThousandsSeparators(intStr: string) {
    return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function formatForDisplay(numStr: string, maxDecimals = 3, truncate = true) {
    if (!numStr) return "0";
    const s = String(numStr);
    if (!s.includes(".")) {
      return addThousandsSeparators(s);
    }
    const [intPartRaw, fracRaw] = s.split(".");
    const intPart = intPartRaw === "" ? "0" : intPartRaw;
    if (maxDecimals <= 0) return addThousandsSeparators(intPart);

    if (truncate) {
      const frac = (fracRaw || "").slice(0, maxDecimals).replace(/0+$/, "");
      if (!frac) return addThousandsSeparators(intPart);
      return `${addThousandsSeparators(intPart)}.${frac}`;
    } else {
      const n = Number(s);
      if (!Number.isFinite(n)) {
        const frac = (fracRaw || "").slice(0, maxDecimals).replace(/0+$/, "");
        return frac
          ? `${addThousandsSeparators(intPart)}.${frac}`
          : addThousandsSeparators(intPart);
      }
      return n.toLocaleString(undefined, {
        maximumFractionDigits: maxDecimals,
      });
    }
  }

  async function fetchBalanceFor(
    chain: string,
    tokenAddress: string,
    wallet: string,
    symbol?: string
  ): Promise<BalanceEntry | null> {
    const key = compositeKey(chain, tokenAddress);
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
        // Native ETH: use wallet-balance API
        const url = `/api/wallet-balance?address=${encodeURIComponent(
          wallet
        )}&chain=${encodeURIComponent(chain)}`;
        const r = await fetch(url);
        const j = await r.json().catch(() => null);
        console.debug("wallet-balance response:", j);

        type ChainEntry = {
          chain: string;
          native_balance?: string; // wei
          native_balance_formatted?: string; // human string, optional
          [k: string]: unknown;
        };

        const chainEntry = Array.isArray(j?.chains)
          ? (j.chains as ChainEntry[]).find((c) => c.chain === chain)
          : (j?.chains as ChainEntry | undefined);

        if (
          chainEntry &&
          (chainEntry.native_balance || chainEntry.native_balance_formatted)
        ) {
          const rawWei = chainEntry.native_balance ?? "0";
          const formattedFromApi = chainEntry.native_balance_formatted;
          const formatted = formattedFromApi ?? formatWeiToEth(rawWei) ?? "0";
          entry = {
            loading: false,
            found: true,
            balanceRaw: rawWei,
            formatted,
            decimals: 18,
            symbol: "ETH",
            name: "Ethereum",
          };
        } else {
          // no data — leave entry null -> will fallback to not found
        }
      } else {
        // ERC20: use erc20-balance API
        const url = `/api/erc20-balance?wallet=${encodeURIComponent(
          wallet
        )}&token=${encodeURIComponent(tokenAddress)}&chain=${encodeURIComponent(
          chain
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

      const nextEntry = entry ?? {
        loading: false,
        found: false,
        balanceRaw: "0",
        formatted: "0",
        decimals: 18,
        symbol: symbol ?? null,
        name: null,
      };

      // update state with the final entry
      setBalances((prev) => {
        const next = {
          ...prev,
          [key]: nextEntry,
        };
        console.debug("balances updated keys:", Object.keys(next));
        return next;
      });

      return nextEntry;
    } catch (err) {
      console.error("fetchBalanceFor error", err);
      const fallback = {
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
  function getDisplayedBalance(t: TokenInfo | undefined) {
    if (!t) return "—";
    const chain = selectedChain;
    const tokenAddr = t.address ?? "";

    // For native ETH use the NATIVE_PLACEHOLDER as the key
    if (t.symbol === "ETH" && (!tokenAddr || tokenAddr === "")) {
      const key = compositeKey(chain, NATIVE_PLACEHOLDER);
      const e = balances[key];
      if (!e) return "—";
      if (e.loading) return "Loading...";
      return formatForDisplay(e.formatted ?? "0", 3, true);
    }

    if (tokenAddr && isAddress(tokenAddr)) {
      const key = compositeKey(chain, tokenAddr);
      const e = balances[key];
      if (!e) return "—";
      if (e.loading) return "Loading...";
      return formatForDisplay(e.formatted ?? "0", 3, true);
    }

    if (typeof t.balance === "string" || typeof t.balance === "number") {
      const s = String(t.balance);
      const cleaned = s.replace(/,/g, "");
      const n = parseFloat(cleaned || "0");
      if (!Number.isFinite(n)) return "0";
      return n.toLocaleString(undefined, { maximumFractionDigits: 3 });
    }
    return "—";
  }

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
        fromToken.symbol
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
    if (amount && fromToken) {
      const parsedAmount = parseFloat(amount.replace(/,/g, ""));
      if (isNaN(parsedAmount)) return;

      // Simple preview calculation: just for display, not for real swapping
      const priceImpact = 0.2 + Math.random() * 0.3;
      const fee = parsedAmount * 0.001;
      let estOut = 0;
      if (fromToken && toToken) {
        if (fromToken.symbol === "ETH" && toToken.symbol === "USDC") {
          estOut = parsedAmount * 2000;
        } else if (fromToken.symbol === "USDC" && toToken.symbol === "ETH") {
          estOut = parsedAmount / 2000;
        } else if (fromToken.symbol === "ETH" && toToken.symbol === "DAI") {
          estOut = parsedAmount * 2000;
        } else if (fromToken.symbol === "DAI" && toToken.symbol === "ETH") {
          estOut = parsedAmount / 2000;
        } else {
          estOut = parsedAmount;
        }
      }
      const minReceived = estOut * (1 - slippage / 100);
      setPreview({ estOut, priceImpact, fee, minReceived });
    }
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
        <div className="flex items-center justify-between mb-2 ">
          <label
            htmlFor="sell-amount"
            className="text-xs font-semibold text-gray-600 font-[audiowide]"
          >
            Sell
          </label>
          <div className="flex gap-2">
            <button
              className="text-xs px-2 py-1 bg-gray-100 rounded-full font-medium hover:bg-gray-200 text-black hover:cursor-pointer font-[audiowide]"
              onClick={() => handleQuick(1)}
              aria-label="Set max amount"
            >
              Max
            </button>
            <button
              className="text-xs px-2 py-1 bg-gray-100 rounded-full font-medium hover:bg-gray-200 text-black hover:cursor-pointer font-[audiowide]"
              onClick={() => handleQuick(0.5)}
              aria-label="Set 50 percent amount"
            >
              50%
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-2">
          <button
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 focus:outline-none text-black font-[audiowide]"
            onClick={() => setShowFromModal(true)}
            aria-label="Select sell token"
          >
            <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs overflow-hidden">
              {fromToken?.icon ? (
                <Image
                  src={fromToken.icon}
                  alt={fromToken.symbol}
                  width={24}
                  height={24}
                  className="rounded-full"
                  unoptimized
                />
              ) : fromToken?.logo ? (
                <div className="relative">
                  <Image
                    src={fromToken.logo}
                    alt={fromToken.symbol}
                    width={24}
                    height={24}
                    className="rounded-full"
                    unoptimized
                  />
                  <div className="absolute bottom-0 right-0">
                    {fromToken?.chain && CHAIN_LOGOS[fromToken.chain] ? (
                      <Image
                        src={CHAIN_LOGOS[fromToken.chain]!}
                        alt={`${fromToken?.chain ?? ""} logo`}
                        width={12}
                        height={12}
                        className="rounded-full border border-white"
                        unoptimized
                      />
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                  {fromToken?.symbol?.[0] ?? "—"}
                </div>
              )}
            </div>
            <span className="font-semibold font-[audiowide]">
              {fromToken?.symbol ?? "Select"}
            </span>
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
              onFocus={() => setAmountTouched(true)}
              onBlur={() => setAmountTouched(true)}
              className="text-2xl text-right outline-none bg-transparent w-full text-black font-[audiowide]"
              placeholder="0"
              aria-label="Sell amount"
            />
            <span className="text-xs font-[audiowide] text-gray-400">
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
          <span className="text-xs font-[audiowide] text-gray-500">
            Bal: {getDisplayedBalance(fromToken)}
          </span>
        </div>
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

        {/* Buy row */}
        <div>
          <label className="text-xs font-semibold text-gray-600 font-[audiowide]">
            Buy
          </label>
          <div className="flex items-center gap-3 mb-2">
            <button
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 focus:outline-none font-[audiowide]"
              onClick={() => setShowToModal(true)}
              aria-label="Select buy token"
            >
              <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs overflow-hidden">
                {toToken?.icon ? (
                  <Image
                    src={toToken.icon}
                    alt={toToken.symbol}
                    width={24}
                    height={24}
                    className="rounded-full"
                    unoptimized
                  />
                ) : toToken?.logo ? (
                  <div className="relative">
                    <Image
                      src={toToken.logo}
                      alt={toToken.symbol}
                      width={24}
                      height={24}
                      className="rounded-full"
                      unoptimized
                    />
                    <div className="absolute -bottom-px right-0">
                      {toToken?.chain && CHAIN_LOGOS[toToken.chain] ? (
                        <Image
                          src={CHAIN_LOGOS[toToken.chain]!}
                          alt={`${fromToken?.chain ?? ""} logo`}
                          width={12}
                          height={12}
                          className="rounded-full border border-white"
                          unoptimized
                        />
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                    {toToken?.symbol?.[0] ?? "—"}
                  </div>
                )}
              </div>
              <span className="font-semibold text-black font-[audiowide]">
                {toToken?.symbol ?? "Select"}
              </span>
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
              <span className="text-2xl text-right text-gray-700 font-[audiowide]">
                {preview ? preview.estOut.toFixed(0) : "0"}
              </span>
              <span className="text-xs font-[audiowide] text-gray-400">
                $
                {getUsdValue(
                  toToken,
                  preview ? preview.estOut : 0
                ).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <label
            htmlFor="slippage"
            className="text-xs text-gray-500 font-[audiowide]"
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
            className="border-[#6b63633f] border rounded px-2 py-1 w-20 text-xs text-black no-spinner outline-none mt-3 font-[audiowide]"
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
            className="p-1 rounded-full hover:bg-gray-100 focus:outline-none cursor-pointer"
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
        {amountTouched && error && (
          <div className="text-red-500 text-xs mb-2 font-[audiowide]">
            {error}
          </div>
        )}

        {/* Preview info */}
        {preview && showPreview && (
          <div
            className={`transition-opacity duration-300 ${
              showAnim ? "opacity-0" : "opacity-100"
            } bg-gray-50 rounded-lg p-4 mb-2 border border-gray-100`}
            aria-live="polite"
          >
            <div className="mb-2 text-black font-[audiowide]">
              Estimated Output:{" "}
              <b>
                {preview.estOut.toFixed(1)} {toToken?.symbol ?? ""}
              </b>
            </div>
            <div className="mb-2 text-black font-[audiowide]">
              Price Impact: <b>{preview.priceImpact.toFixed(2)}%</b>
            </div>
            <div className="mb-2 text-black font-[audiowide]">
              Fee:{" "}
              <b>
                {preview.fee.toFixed(4)} {fromToken?.symbol ?? ""}
              </b>
            </div>
            <div className="text-black font-[audiowide]">
              Minimum Received:{" "}
              <b>
                {preview.minReceived.toFixed(1)} {toToken?.symbol ?? ""}
              </b>
            </div>
          </div>
        )}

        {/* CTA button */}
        <button
          className={`w-full mt-2 py-3 rounded-md font-bold text-lg uppercase tracking-wide shadow-inner font-[audiowide] ${
            isWalletConnected
              ? "bg-green-500 text-white hover:bg-green-600"
              : "bg-gray-700 text-white"
          } transition-colors cursor-pointer`}
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
              <div className="text-green-600 text-2xl mb-2 font-[audiowide]">
                Swap Successful!
              </div>
              <div className="mb-2 font-[audiowide]">
                Tx Hash:{" "}
                <span className="font-mono text-xs">{success.txHash}</span>
              </div>
              <button
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded font-[audiowide]"
                onClick={() => setSuccess(null)}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Token modals */}
        <ChainTokenModal
          open={showFromModal}
          singleSelect
          initialSelected={fromToken ? [fromToken] : []}
          allowedTokens={adaptToTokenInfo(
            TOKENS.filter((t) => t.symbol !== toToken?.symbol)
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
            TOKENS.filter((t) => t.symbol !== fromToken?.symbol)
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

  // Add missing validate function
  function validate() {
    if (!fromToken || !toToken) return "Select tokens.";
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0)
      return "Enter a valid amount.";
    const balStr = getDisplayedBalance(fromToken);
    const balance = parseFloat(String(balStr).replace(/,/g, "")) || 0;
    if (parseFloat(amount) > balance)
      return `Amount exceeds wallet balance (${balance} ${fromToken.symbol})`;
    if (fromToken.symbol === toToken.symbol) return "Select different tokens.";
    return "";
  }
};

export default SwapCard;
