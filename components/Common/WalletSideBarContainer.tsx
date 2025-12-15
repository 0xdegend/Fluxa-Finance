"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import WalletSidebar from "./WalletSideBar";
import { fetchTokenBalances, fetchWalletBalance } from "@/lib/web3Service"; // adjust path if needed
import type { Token } from "@/types";
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

export default function WalletSidebarContainer({
  rawAddress,
  initialNetwork = "eth",
  sidebarOpen,
  setSidebarOpen,
  copyAddress,
  handleLogout,
  onClaimRewards,
}: {
  rawAddress?: string | null;
  initialNetwork?: string;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  copyAddress: () => void;
  handleLogout: () => void;
  onClaimRewards?: () => void;
}) {
  const address = rawAddress ?? undefined;
  const [network, setNetwork] = useState<string>(initialNetwork);

  // balances: null = loading, [] = no tokens, Token[] loaded
  const [balances, setBalances] = useState<Token[] | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | string | null>(
    null
  );

  // abort marker for in-flight request (so we can ignore stale results)
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

      // reset previous controller (mark previous request as "aborted" by aborting controller)
      if (abortRef.current) {
        try {
          abortRef.current.controller.abort();
        } catch {}
        abortRef.current = null;
      }

      const controller = new AbortController();
      abortRef.current = { controller };

      // show loading UI
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
          // just ignore aborted requests
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
    <WalletSidebar
      address={address}
      network={network}
      setNetwork={(k) => {
        setNetwork(k);
      }}
      balances={balances}
      walletBalance={walletBalance}
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
      copyAddress={copyAddress}
      handleLogout={handleLogout}
      truncate={(s) => (s ? `${s.slice(0, 6)}...${s.slice(-6)}` : "")}
      onClaimRewards={onClaimRewards}
      explorerBase={explorerBase}
      networks={AVAILABLE_NETWORKS}
      onRefreshBalances={() => refreshBalances()}
    />
  );
}
