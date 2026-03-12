"use client";
import React from "react";
import Image from "next/image";
import { IoCopy, IoRefresh } from "react-icons/io5";
import { formatSignificant, formatUsd } from "@/app/utils/numberFormat";
import NetworkDropdown from "./NetworkDropdown";
import Lottie from "lottie-react";
import loadingAnimation from "../../public/lottie/fingers-loading.json";
import { CHAIN_META } from "@/data";
import { WalletSidebarProps } from "@/types";
import { usePrivy } from "@privy-io/react-auth";
import Web3LoginButton from "./Web3LoginButton";

const DEFAULT_TRUNCATE = (a: string) =>
  a && a.length > 12 ? `${a.slice(0, 6)}...${a.slice(-6)}` : a;

function getInitial(symbol?: string) {
  if (!symbol || symbol.length === 0) return "?";
  return symbol.charAt(0).toUpperCase();
}

export default function WalletSidebar({
  address,
  network = "eth",
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
  networks,
  onRefreshBalances,
}: WalletSidebarProps) {
  const displayTotal =
    walletBalance == null
      ? "—"
      : typeof walletBalance === "number"
        ? walletBalance.toFixed(2)
        : String(walletBalance);

  const [activeTab, setActiveTab] = React.useState<"tokens" | "activity">(
    "tokens",
  );

  function getChainIcon(chainKey?: string) {
    const key = chainKey ?? network;
    const meta = CHAIN_META.find((c) => c.key === key);
    return meta?.icon ?? null;
  }

  function getChainColor(chainKey?: string) {
    const key = chainKey ?? network;
    return (
      {
        base: "#1a01fe",
        eth: "#627eea",
        solana: "#00ffa3",
        bsc: "#f3ba2f",
        arbitrum: "#28a0f0",
        polygon: "#8247e5",
      }[key] ?? "#94a3b8"
    );
  }
  const { authenticated } = usePrivy();

  const updatedAddress = address ?? "";

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
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <NetworkDropdown
            current={network}
            networks={networks}
            onChange={(k) => {
              setNetwork?.(k);
            }}
            size="sm"
          />

          {authenticated && (
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full cursor-pointer">
              <span className="text-sm font-mono">
                {truncate(`${updatedAddress}`)}
              </span>
              <button
                onClick={copyAddress}
                aria-label="Copy address"
                className="p-1 rounded hover:bg-slate-200 "
              >
                <IoCopy className="text-sm cursor-pointer" />
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center justify-center gap-2 ml-2 ">
          <button
            aria-label="Close sidebar"
            onClick={() => setSidebarOpen(false)}
            className="w-7 h-7 rounded-full hover:bg-slate-100 focus:outline-none cursor-pointer"
          >
            ×
          </button>
        </div>
      </div>
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
            onClick={() => onRefreshBalances?.()}
          >
            <IoRefresh />
          </button>
        </div>

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
      <div className="flex-1 overflow-auto px-2">
        {activeTab === "tokens" ? (
          <>
            {balances === null ? (
              <div className="p-4">
                <div className="w-full h-60">
                  <Lottie
                    animationData={loadingAnimation}
                    loop={true}
                    autoplay={true}
                  />
                </div>
              </div>
            ) : balances.length === 0 ? (
              <div className="p-4 text-sm text-gray-500">No tokens found.</div>
            ) : (
              <ul className="space-y-4">
                {balances.map((t, idx) => (
                  <li
                    key={`${t.symbol ?? "token"}-${
                      t.chain ?? "unknown"
                    }-${idx}`}
                    className="flex items-center gap-3 justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-10 shrink-0">
                        {t.logo ? (
                          <Image
                            src={t.logo as string}
                            alt={`${t.symbol} logo`}
                            width={40}
                            height={40}
                            className="rounded-full object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-sm font-semibold text-slate-700">
                            {getInitial(t.symbol)}
                          </div>
                        )}
                        {(() => {
                          const chainKey = t.chain ?? network;
                          const icon = getChainIcon(chainKey);

                          return icon ? (
                            <Image
                              src={icon}
                              alt={`${chainKey} logo`}
                              width={18}
                              height={18}
                              style={{
                                position: "absolute",
                                left: -6,
                                bottom: -3,
                                width: 18,
                                height: 18,
                                borderRadius: 6,
                                border: "2px solid white",
                                objectFit: "cover",
                                background: "transparent",
                              }}
                            />
                          ) : (
                            <span
                              style={{
                                position: "absolute",
                                left: -6,
                                bottom: -3,
                                width: 18,
                                height: 18,
                                borderRadius: 4,
                                border: "2px solid white",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 10,
                                fontWeight: 700,
                                color: "white",
                                background: getChainColor(chainKey),
                              }}
                              aria-hidden
                              title={chainKey}
                            >
                              {(chainKey && chainKey[0]?.toUpperCase()) ?? "?"}
                            </span>
                          );
                        })()}
                      </div>

                      <div>
                        <div className="font-semibold text-sm text-slate-900">
                          {t.symbol}
                        </div>
                        <div className="text-xs text-slate-400 capitalize">
                          {t.name ?? t.chain ?? network}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-semibold text-sm text-slate-900">
                        {t.usd ? formatUsd(t.usd) : "—"}
                      </div>
                      <div className="text-xs text-slate-400">
                        {t.balance != null
                          ? formatSignificant(t.balance, 6) + ` ${t.symbol}`
                          : ""}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <div className="p-4 text-sm text-gray-600">
            Recent activity not implemented — placeholder
          </div>
        )}
      </div>
      <div className="mt-4">
        <div className="flex flex-col gap-2">
          {authenticated ? (
            <button
              onClick={handleLogout}
              className="w-full py-2 cursor-pointer rounded-md bg-indigo-600 text-white font-semibold"
            >
              Disconnect
            </button>
          ) : (
            <Web3LoginButton />
          )}
          <button
            onClick={onClaimRewards}
            className="w-full py-2 rounded-md border border-slate-200 bg-white text-slate-700"
          >
            Claim rewards
          </button>
          {address && (
            <a
              href={`${explorerBase}/address/${address}`}
              target="_blank"
              rel="noreferrer"
              className="w-full text-center block mt-2 py-2 rounded-md text-xs text-indigo-600 underline"
            >
              View on explorer
            </a>
          )}
        </div>
      </div>
    </aside>
  );
}
