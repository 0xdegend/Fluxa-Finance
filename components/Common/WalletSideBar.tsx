import React from "react";
import Image, { StaticImageData } from "next/image";
import { FaEthereum } from "react-icons/fa";
import { IoCopy } from "react-icons/io5";
import { formatSignificant, formatUsd } from "@/app/utils/numberFormat";
import NetworkDropdown from "./NetworkDropdown";

export type Token = {
  symbol: string;
  balance?: number | string | null;
  usd?: number | string | null;
  logo?: string | StaticImageData | null;
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
  return symbol.charAt(0); // preserves original casing (use .toUpperCase() if you want uppercase)
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

  return (
    <aside
      aria-hidden={!sidebarOpen}
      className={`fixed right-5 top-4  h-[96vh] overflow-scroll w-[400px] bg-white shadow-xl p-6 flex flex-col focus:outline-none transform transition-transform duration-300 ease-in-out pointer-events-auto rounded-xl
        ${sidebarOpen ? "translate-x-0" : "translate-x-full"}`}
      tabIndex={0}
      style={{ willChange: "transform" }}
    >
      <header className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <NetworkDropdown
            current={network}
            onChange={(k) => setNetwork?.(k)}
            size="sm"
          />
        </div>

        <button
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
          className="p-1 h-8 w-8 hover:bg-(--fluxa-accent) cursor-pointer rounded-full hover:text-white"
        >
          ×
        </button>
      </header>

      <div className="mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg font-[audiowide]">
            {truncate(`${address}`)}
          </span>

          <button
            aria-label="Copy address"
            onClick={copyAddress}
            className="p-1 rounded hover:bg-(--fluxa-accent/10) cursor-pointer"
          >
            <IoCopy />
          </button>

          <a
            href={`${explorerBase}/address/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-(--fluxa-accent) underline text-xs font-[audiowide]"
          >
            Explorer
          </a>
        </div>

        <div className="mt-2 flex items-center text-sm text-(--fluxa-muted) font-[audiowide]">
          <FaEthereum />

          {/* balance display: null = not fetched, [] = fetched but empty */}
          <span className="ml-2">
            {balances === null
              ? "--"
              : firstBalance
              ? formatSignificant(firstBalance.balance, 5)
              : "—"}
          </span>

          <span className="ml-2">
            {walletBalance != null ? ` $${walletBalance}` : " $—"}
          </span>
        </div>
      </div>

      <div className="mb-4 mt-5">
        <div className="font-semibold mb-2 font-[audiowide]">Tokens</div>
        <ul className="space-y-1">
          {balances && balances.length > 0 ? (
            balances.map((t) => (
              <li
                key={t.symbol}
                className="flex gap-3 items-start justify-between font-[audiowide] mb-5"
              >
                {t.logo ? (
                  <Image
                    src={t.logo as string}
                    width={30}
                    height={30}
                    alt={`${t.symbol} logo`}
                    className="rounded-full"
                  />
                ) : (
                  <div
                    className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 font-[audiowide]"
                    aria-hidden="true"
                    title={t.symbol}
                  >
                    <span className="select-none text-sm capitalize font-semibold">
                      {getInitial(t.symbol)}
                    </span>
                  </div>
                )}

                <span>{t.symbol}</span>

                <div className="flex flex-col items-end">
                  <span className="text-[17px] text-fluxa-muted">
                    {formatUsd(t.usd)}
                  </span>
                  <span className="text-xs">
                    {formatSignificant(t.balance, 5)}
                  </span>
                </div>
              </li>
            ))
          ) : (
            <div className="px-2 py-3 text-(--fluxa-muted) font-[audiowide]">
              {balances === null ? (
                <span>Loading tokens…</span>
              ) : (
                <span>No tokens found.</span>
              )}
            </div>
          )}
        </ul>
      </div>

      <div className="mt-auto flex flex-col gap-2">
        <button
          onClick={handleLogout}
          className="w-full bg-(--fluxa-violet) text-white py-2 rounded cursor-pointer font-[audiowide]"
        >
          Disconnect
        </button>

        <button
          onClick={onClaimRewards}
          className="w-full bg-(--fluxa-glass) py-2 rounded font-[audiowide] text-(--fluxa-text) cursor-pointer"
        >
          Claim Rewards
        </button>

        <a
          href={`${explorerBase}/address/${address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full text-center bg-fluxa-glass py-2 rounded font-[audiowide] text-(--fluxa-accent) underline"
        >
          View on Explorer
        </a>
      </div>
    </aside>
  );
}
