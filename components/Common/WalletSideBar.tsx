"use client";
import React from "react";
import Image, { StaticImageData } from "next/image";
import { IoCopy, IoRefresh } from "react-icons/io5";
import { formatSignificant, formatUsd } from "@/app/utils/numberFormat";
import NetworkDropdown from "./NetworkDropdown";

export type Token = {
  symbol: string;
  balance?: number | string | null;
  usd?: number | string | null;
  logo?: string | StaticImageData | null;
  // optional: chain if your token entries include it
  chain?: string;
  name?: string;
};

export interface WalletSidebarProps {
  address: string | undefined;
  network?: string;
  setNetwork?: (k: string) => void;
  balances?: Token[] | null;
  walletBalance?: number | string | null;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  copyAddress: () => void;
  handleLogout: () => void;
  truncate?: (a: string) => string;
  onClaimRewards?: () => void;
  explorerBase?: string;
}

const DEFAULT_TRUNCATE = (a: string) =>
  a && a.length > 12 ? `${a.slice(0, 6)}...${a.slice(-6)}` : a;

function getInitial(symbol?: string) {
  if (!symbol || symbol.length === 0) return "?";
  return symbol.charAt(0).toUpperCase();
}

export default function WalletSidebar({
  address,
  network = "unknown",
  setNetwork,
  balances = null,
  walletBalance = null,
  sidebarOpen,
  setSidebarOpen,
  copyAddress,
  handleLogout,
  truncate = DEFAULT_TRUNCATE,
  onClaimRewards,
  explorerBase = "https://etherscan.io",
}: WalletSidebarProps) {
  const firstBalance =
    balances && balances.length > 0 ? balances[0] : undefined;

  // local UI state: tab
  const [activeTab, setActiveTab] = React.useState<"tokens" | "activity">(
    "tokens"
  );

  const displayTotal =
    walletBalance == null
      ? "—"
      : typeof walletBalance === "number"
      ? walletBalance.toFixed(2)
      : String(walletBalance);

  return (
    <aside
      aria-hidden={!sidebarOpen}
      className={`fixed right-5 top-4 h-[92vh] overflow-hidden w-[420px] bg-white shadow-2xl p-4 flex flex-col transform transition-transform duration-300 ease-in-out rounded-2xl z-50
        ${sidebarOpen ? "translate-x-0" : "translate-x-full"}`}
      role="dialog"
      aria-modal="true"
      tabIndex={0}
      style={{ willChange: "transform" }}
    >
      {/* header row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <NetworkDropdown
            current={network}
            onChange={(k) => setNetwork?.(k)}
            size="sm"
          />
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full">
            <span className="text-sm font-mono">{truncate(`${address}`)}</span>
            <button
              onClick={copyAddress}
              aria-label="Copy address"
              className="p-1 rounded hover:bg-slate-200"
            >
              <IoCopy className="text-sm" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 ">
          <button
            aria-label="Close sidebar"
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-full hover:bg-slate-100 focus:outline-none cursor-pointer"
          >
            ×
          </button>
        </div>
      </div>

      {/* Net worth / refresh */}
      <div className="mb-4 px-2">
        <div className="flex items-center gap-3">
          <div>
            <div className="text-3xl font-extrabold text-black">
              ${displayTotal}
            </div>
            <div className="text-xs text-gray-500 mt-1">Total balance</div>
          </div>

          <button
            aria-label="Refresh balances"
            className="ml-auto p-2 rounded-full bg-slate-50 hover:bg-slate-100 cursor-pointer"
            // You can hook this up to a passed prop refresh handler if you want:
            onClick={() => {
              // no-op refresh placeholder — parent should provide actual fetch if desired
              // optional: setNetwork?.(network) to trigger fetch in parent
            }}
          >
            <IoRefresh />
          </button>
        </div>

        {/* small tab nav */}
        <div className="mt-4 border-b border-slate-100">
          <nav
            className="-mb-px flex gap-4"
            role="tablist"
            aria-label="Sidebar tabs"
          >
            <button
              role="tab"
              aria-selected={activeTab === "tokens"}
              onClick={() => setActiveTab("tokens")}
              className={`py-2 px-1 text-sm font-semibold ${
                activeTab === "tokens"
                  ? "text-slate-900 border-b-2 border-indigo-600"
                  : "text-slate-500"
              }`}
            >
              Tokens
            </button>
            <button
              role="tab"
              aria-selected={activeTab === "activity"}
              onClick={() => setActiveTab("activity")}
              className={`py-2 px-1 text-sm font-semibold ${
                activeTab === "activity"
                  ? "text-slate-900 border-b-2 border-indigo-600"
                  : "text-slate-500"
              }`}
            >
              Activity
            </button>
          </nav>
        </div>
      </div>

      {/* content area */}
      <div className="flex-1 overflow-auto px-2">
        {activeTab === "tokens" ? (
          <>
            {balances === null ? (
              <div className="p-4 text-sm text-gray-500">Loading tokens…</div>
            ) : balances.length === 0 ? (
              <div className="p-4 text-sm text-gray-500">No tokens found.</div>
            ) : (
              <ul className="space-y-4">
                {balances.map((t) => {
                  const usdDisplay = t.usd ?? null;
                  const balDisplay = t.balance ?? null;
                  return (
                    <li
                      key={`${t.symbol}-${t.logo ?? ""}`}
                      className="flex items-center gap-3 justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 shrink-0">
                          {t.logo ? (
                            <Image
                              src={t.logo}
                              alt={`${t.symbol} logo`}
                              width={40}
                              height={40}
                              className="rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-sm font-semibold text-slate-700">
                              {getInitial(t.symbol)}
                            </div>
                          )}

                          {/* small blue square badge bottom-left to indicate chain (like screenshot) */}
                          <span
                            className="absolute -bottom-0.5 -left-0.5 w-3 h-3 rounded-sm border-2 border-white"
                            style={{ backgroundColor: "#2563EB" }}
                            aria-hidden
                          />
                        </div>

                        <div>
                          <div className="font-semibold text-sm text-slate-900">
                            {t.symbol}
                          </div>
                          <div className="text-xs text-slate-400">
                            {t.name ?? t.chain ?? network}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-semibold text-sm text-slate-900">
                          {usdDisplay ? formatUsd(usdDisplay) : "—"}
                        </div>
                        <div className="text-xs text-slate-400">
                          {balDisplay != null
                            ? formatSignificant(balDisplay, 6) + ` ${t.symbol}`
                            : ""}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        ) : (
          <div className="p-4 text-sm text-gray-600">
            Recent activity not implemented — placeholder
          </div>
        )}
      </div>

      {/* footer */}
      <div className="mt-4">
        <div className="flex flex-col gap-2">
          <button
            onClick={handleLogout}
            className="w-full py-2 rounded-md bg-indigo-600 text-white font-semibold"
          >
            Disconnect
          </button>
          <button
            onClick={onClaimRewards}
            className="w-full py-2 rounded-md border border-slate-200 bg-white text-slate-700"
          >
            Claim rewards
          </button>
          <a
            href={`${explorerBase}/address/${address}`}
            target="_blank"
            rel="noreferrer"
            className="w-full text-center block mt-2 py-2 rounded-md text-xs text-indigo-600 underline"
          >
            View on explorer
          </a>
        </div>
      </div>
    </aside>
  );
}
