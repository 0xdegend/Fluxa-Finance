"use client";
import React, { useState, useRef, useCallback, useEffect } from "react";
import TokenSummaryCard from "../Swap/TokenSummaryCard";
import SwapCard from "../Swap/SwapCard";
import GridBg from "../Common/GridBg";
import PriceMarquee from "../Common/PriceMarquee";
import WalletSideBar from "../Common/WalletSideBar";
import type { Token } from "@/types";
import { fetchTokenBalances, fetchWalletBalance } from "@/lib/web3Service";
import { useTokenPrices } from "@/app/hooks/useTokenPrices";
import { useWallets } from "@privy-io/react-auth";

const EXPLORER_BY_NETWORK: Record<string, string> = {
  eth: "https://etherscan.io",
  base: "https://explorer.base.org",
  polygon: "https://polygonscan.com",
  arbitrum: "https://arbiscan.io",
  bsc: "https://bscscan.com",
  solana: "https://solscan.io/",
  optimism: "https://optimistic.etherscan.io",
};

function isAbortError(err: unknown): err is DOMException {
  return (
    typeof err === "object" &&
    err !== null &&
    "name" in err &&
    (err as { name?: unknown }).name === "AbortError"
  );
}

const AVAILABLE_NETWORKS = [
  { key: "eth", label: "Ethereum" },
  { key: "base", label: "Base" },
  { key: "solana", label: "Solana" },
  { key: "arbitrum", label: "Arbitrum" },
  { key: "bsc", label: "BSC" },
];

const Landing: React.FC = () => {
  const { wallets } = useWallets();
  const tokenConfigs = [
    { token: "ETH", coingeckoId: "ethereum" },
    { token: "USDT", coingeckoId: "tether" },
  ];
  const [network, setNetwork] = useState<string>("base");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { tokens } = useTokenPrices(tokenConfigs, {
    pollIntervalMs: 60_000,
    historyHours: 24,
  });

  const address =
    wallets && wallets.length > 0 ? wallets[0].address : undefined;
  const walletAddress = `${address}`;
  const [balances, setBalances] = useState<Token[] | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | string | null>(
    null
  );

  const abortRef = useRef<{ controller: AbortController } | null>(null);

  const explorerBase =
    EXPLORER_BY_NETWORK[network] ?? EXPLORER_BY_NETWORK["eth"];

  const fetchBalances = useCallback(
    async (net: string, addr?: string | undefined) => {
      if (!addr) {
        setBalances([]);
        setWalletBalance(null);
        return;
      }
      if (abortRef.current) {
        try {
          abortRef.current.controller.abort();
        } catch {}
        abortRef.current = null;
      }

      const controller = new AbortController();
      abortRef.current = { controller };
      setBalances(null);
      setWalletBalance(null);

      try {
        const [tokens, walletSummary] = await Promise.all([
          fetchTokenBalances(addr, net, 10).catch((e) => {
            if (isAbortError(e)) throw e;
            console.error("fetchTokenBalances error:", e);
            return [] as Token[];
          }),
          fetchWalletBalance(addr, net).catch((e) => {
            if (isAbortError(e)) throw e;
            console.warn("fetchWalletBalance error:", e);
            return null;
          }),
        ]);
        if (abortRef.current?.controller.signal.aborted) {
          return;
        }
        const items: Token[] = Array.isArray(tokens)
          ? tokens
          : tokens?.balances ?? [];
        let tot = 0;
        if (walletSummary && typeof walletSummary === "object") {
          const maybe =
            walletSummary.total_networth_usd ??
            walletSummary.totalUsd ??
            walletSummary.total_usd;
          if (typeof maybe === "number") {
            tot = maybe;
          }
        }
        if (!tot) {
          tot = items.reduce((acc, t) => acc + (Number(t.usd) || 0), 0);
        }
        if (abortRef.current?.controller.signal.aborted) {
          return;
        }
        setBalances(items);
        setWalletBalance(tot);
      } catch (err: unknown) {
        if (isAbortError(err)) {
          return;
        }
        const message = err instanceof Error ? err.message : String(err);
        console.error("Error loading balances:", message);
        setBalances([]);
        setWalletBalance(0);
      } finally {
        if (abortRef.current?.controller === controller) {
          abortRef.current = null;
        }
      }
    },
    []
  );

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      fetchBalances(network, address);
    });

    return () => {
      cancelled = true;
      if (abortRef.current) {
        try {
          abortRef.current.controller.abort();
        } catch {}
        abortRef.current = null;
      }
    };
  }, [network, address, fetchBalances]);

  const refreshBalances = useCallback(() => {
    if (!address) return;
    fetchBalances(network, address);
  }, [network, address, fetchBalances]);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden">
      <button
        className="fixed hover:cursor-pointer top-6 right-6 z-50 p-2 rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 -mt-2"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open wallet sidebar"
      >
        <svg
          width="24"
          height="24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path d="M3 7h18M3 12h18M3 17h18" />
        </svg>
      </button>

      {/* Blur overlay and Wallet Sidebar */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-200"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar overlay"
          />
          <div className="fixed top-0 right-0 h-full z-50 flex flex-col">
            <button
              className="self-end m-4 p-2 rounded-full bg-gray-200 hover:cursor-pointer hover:bg-gray-300 text-gray-700"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close wallet sidebar"
            >
              <svg
                width="24"
                height="24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="6" y1="18" x2="18" y2="6" />
              </svg>
            </button>
            <WalletSideBar
              address={walletAddress}
              network={network}
              setNetwork={setNetwork}
              balances={balances}
              walletBalance={walletBalance}
              sidebarOpen={sidebarOpen}
              setSidebarOpen={setSidebarOpen}
              copyAddress={() => navigator.clipboard.writeText(walletAddress)}
              handleLogout={() => {}}
              truncate={(s) => (s ? `${s.slice(0, 6)}...${s.slice(-6)}` : "")}
              explorerBase={explorerBase}
              networks={AVAILABLE_NETWORKS}
              onRefreshBalances={() => refreshBalances()}
            />
          </div>
        </>
      )}

      <div className="absolute inset-0 w-full h-full flex items-center justify-center z-0 pointer-events-none">
        <div className="w-[900px] h-[900px] opacity-60">
          <GridBg />
        </div>
      </div>

      <nav className="top-0 left-0 w-full flex items-center justify-between px-6 py-4 relative">
        <div className="flex items-center gap-6">
          <span className="font-bold text-lg text-indigo-700 font-[audiowide]">
            Fluxa
          </span>
          <ul
            className="flex gap-4 text-sm text-gray-700"
            aria-label="Main navigation"
          >
            <li>
              <a
                href="#"
                className="hover:text-indigo-600 font-medium font-[audiowide]"
              >
                Swap
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-indigo-600 font-[audiowide]">
                Liquidity
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-indigo-600 font-[audiowide]">
                Portfolio
              </a>
            </li>
          </ul>
        </div>
        {/* <div className="flex items-center gap-3">
          <Web3LoginButton
            variant="navbar"
            size="md"
            network={network}
            setNetwork={setNetwork}
          />
          <button
            className="p-2 rounded hover:bg-gray-200 focus:outline-none cursor-pointer"
            aria-label="Open menu"
          >
            
            <svg
              width="22"
              height="22"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </svg>
          </button>
        </div> */}
      </nav>

      <main className="flex flex-col items-center justify-center w-full flex-1 pt-4 pb-4 relative">
        <h1 className="sr-only">Fluxa Finance - Swap</h1>
        <section
          className="w-full max-w-md bg-white/90 rounded-2xl shadow-xl p-6 flex flex-col items-center mb-6"
          aria-label="Swap section"
        >
          <SwapCard selectedChain={network} />
        </section>
        <section
          className="w-full max-w-md flex  justify-center items-stretch md:flex-row flex-col md:gap-4 gap-2"
          aria-label="Token summaries"
        >
          {tokens.map((t) => (
            <TokenSummaryCard
              key={t.token}
              token={t.token}
              price={t.price}
              change={t.change}
              priceSeries={t.priceSeries}
            />
          ))}
        </section>
        <div className="mt-10">
          <PriceMarquee />
        </div>
      </main>
    </div>
  );
};

export default Landing;
