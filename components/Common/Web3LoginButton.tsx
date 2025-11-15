import React, { useState, useRef, useEffect } from "react";
import { usePrivy, useWallets, useLogout } from "@privy-io/react-auth";
import { useAccount } from "wagmi";
import {
  fetchTokenBalances,
  fetchWalletBalance,
  truncate,
  getUsd,
} from "../../lib/web3Service";
import { IoCopy } from "react-icons/io5";
import type { TokenBalance } from "@/types";
import { Web3LoginButtonProps } from "@/types";
import { FaEthereum } from "react-icons/fa6";
import Image from "next/image";
import { formatSignificant, formatUsd } from "@/app/utils/numberFormat";
export const Web3LoginButton: React.FC<Web3LoginButtonProps> = ({
  variant = "navbar",
  size = "md",
  onAction,
  showSmallWhenConnected = false,
  label,
  className = "",
}) => {
  const { ready, authenticated, login, user } = usePrivy();
  const { wallets } = useWallets();
  const { isConnected } = useAccount();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const sidebarRef = useRef<HTMLDivElement>(null);
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const address =
    wallets && wallets.length > 0 ? wallets[0].address : undefined;

  const network = wallets && wallets.length > 0 ? wallets[0]?.type : undefined;
  const { logout } = useLogout({
    onSuccess: () => {
      console.log("User successfully logged out");
    },
  });

  const handleLogout = () => {
    logout();
    setSidebarOpen(false);
  };

  // Fetch token balances when sidebar opens
  React.useEffect(() => {
    async function loadBalances() {
      setLoading(true);
      try {
        if (address) {
          const data = await fetchTokenBalances(address as string);

          setBalances(data);
          console.log("Fetched balances:", data);
        }
      } catch (err) {
        console.error("Error fetching balances:", err);
        setBalances([]);
      }
      setLoading(false);
    }
    if (sidebarOpen && address) {
      loadBalances();
    }
  }, [sidebarOpen, address]);

  useEffect(() => {
    if (!address && !sidebarOpen) {
      return;
    }
    async function loadWalletBalance() {
      try {
        const walletBalance = await fetchWalletBalance(address as string);
        setWalletBalance(walletBalance);
      } catch (err) {
        console.error("Error fetching wallet balance:", err);
        setWalletBalance(null);
      }
    }
    if (address) {
      loadWalletBalance();
    }
  }, [address, sidebarOpen]);

  // Copy address
  const copyAddress = () => {
    if (address) navigator.clipboard.writeText(address);
  };

  // Button classes
  const base =
    "rounded-md transition font-semibold flex items-center justify-center cursor-pointer font-[audiowide]";
  const sizeMap = {
    sm: "px-3 py-1 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };
  const variantMap = {
    primary:
      "rounded-md bg-(--fluxa-accent) hover:bg-(--fluxa-accent-600) text-white hover:bg-fluxa-accent-dark",
    outline:
      "border border-fluxa-accent text-fluxa-accent bg-transparent hover:bg-fluxa-accent/10",
    ghost: "bg-transparent text-fluxa-accent hover:bg-fluxa-accent/10",
  };
  const btnClass = `${base} ${sizeMap[size]} ${
    variantMap[variant === "navbar" ? "primary" : "outline"]
  } ${className}`;

  // Navbar variant: sidebar logic
  if (variant === "navbar") {
    return (
      <>
        <button
          aria-pressed={sidebarOpen}
          aria-expanded={sidebarOpen}
          aria-label={user ? `Wallet: ${truncate(address)}` : "Connect Wallet"}
          className={btnClass}
          onClick={() => (user ? setSidebarOpen(true) : login())}
          type="button"
        >
          {user ? (
            <>
              <span className="font-mono">{truncate(address)}</span>
              <span className="ml-2 bg-fluxa-glass px-2 py-0.5 rounded text-xs flex gap-1">
                <FaEthereum />
                {walletBalance !== null ? walletBalance : "—"}
              </span>
            </>
          ) : (
            <span>Connect Wallet</span>
          )}
        </button>
        {/* Sidebar */}
        <div
          className={`fixed inset-0 z-50 flex justify-end pointer-events-none`}
          aria-modal="true"
          role="dialog"
        >
          {sidebarOpen && (
            <div
              className="absolute inset-0 transition-opacity duration-300 pointer-events-auto"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
          )}
          <aside
            ref={sidebarRef}
            className={`relative w-[350px] h-full bg-white shadow-xl p-6 flex flex-col focus:outline-none transform transition-transform duration-300 ease-in-out pointer-events-auto
              ${sidebarOpen ? "translate-x-0" : "translate-x-full"}`}
            tabIndex={0}
            style={{ willChange: "transform" }}
          >
            <header className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-(--fluxa-muted) font-[audiowide]">
                  Connected
                </span>
                <span className="bg-fluxa-accent/20 text-(--fluxa-accent) px-2 py-0.5 rounded text-xs font-[audiowide] capitalize">
                  {network}
                </span>
              </div>
              <button
                aria-label="Close sidebar"
                onClick={() => setSidebarOpen(false)}
                className="p-1 h-8 w-8 hover:bg-(--fluxa-accent) cursor-pointer rounded-full hover:text-white "
              >
                ×
              </button>
            </header>
            <div className="mb-4">
              <div className="flex items-center gap-2">
                <span className="text-lg font-[audiowide]">
                  {truncate(address)}
                </span>
                <button
                  aria-label="Copy address"
                  onClick={copyAddress}
                  className="p-1 rounded hover:bg-(--fluxa-accent/10) cursor-pointer"
                >
                  <IoCopy />
                </button>
                <a
                  href={`https://etherscan.io/address/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-(--fluxa-accent) underline text-xs font-[audiowide]"
                >
                  Explorer
                </a>
              </div>
              <div className="mt-2 text-sm text-(--fluxa-muted) font-[audiowide]">
                Ξ 0.00 <span className="ml-2">{`$ ${walletBalance}`}</span>
              </div>
            </div>
            <div className="mb-4 mt-5">
              <div className="font-semibold mb-2 font-[audiowide]">Tokens</div>
              <ul className="space-y-1">
                {balances.map((t) => (
                  <div key={t.symbol}>
                    <li
                      key={t.symbol}
                      className="flex gap-3 items-center justify-between font-[audiowide] mb-5"
                    >
                      {t.logo ? (
                        <Image
                          src={t.logo}
                          width={30}
                          height={30}
                          alt="Image Logo"
                          className="rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-200" /> // placeholder
                      )}
                      <span>{t.symbol}</span>
                      <div className="flex flex-col items-end">
                        <span className="text-[17px] text-fluxa-muted">
                          {formatUsd(t.usd)}
                        </span>
                        <span className="text-xs">
                          {formatSignificant(t.balance)}
                        </span>
                      </div>
                    </li>
                  </div>
                ))}
              </ul>
            </div>
            <div className="mt-auto flex flex-col gap-2">
              <button
                onClick={handleLogout}
                className="w-full bg-(--fluxa-violet) text-white py-2 rounded cursor-pointer font-[audiowide]"
              >
                Disconnect
              </button>
              <button className="w-full bg-(--fluxa-glass) py-2 rounded font-[audiowide] text-(--fluxa-text) cursor-pointer">
                Claim Rewards
              </button>
              <a
                href={`https://etherscan.io/address/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-center bg-fluxa-glass py-2 rounded font-[audiowide] text-(--fluxa-accent) underline"
              >
                View on Explorer
              </a>
            </div>
          </aside>
        </div>
      </>
    );
  }

  // Inline variant
  return (
    <button
      aria-pressed={isConnected}
      aria-label={
        isConnected ? `Wallet: ${truncate(address)}` : label || "Connect Wallet"
      }
      className={btnClass}
      onClick={async () => {
        if (!isConnected) return login();
        if (onAction) await onAction();
      }}
      type="button"
    >
      {isConnected && showSmallWhenConnected ? (
        <span className="font-mono text-xs">
          {truncate(address)}{" "}
          <span className="ml-1 bg-fluxa-glass px-1 rounded">Ξ 0.00</span>
        </span>
      ) : (
        <span>{label || "Connect Wallet"}</span>
      )}
    </button>
  );
};

export default Web3LoginButton;
