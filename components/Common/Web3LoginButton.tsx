import React, { useState, useRef } from "react";
import { usePrivy, useWallets, useLogout } from "@privy-io/react-auth";
import { useAccount } from "wagmi";
import { getTokenBalances } from "../../lib/web3Service";
import { IoCopy } from "react-icons/io5";
import type { TokenBalance } from "@/types";
import { Web3LoginButtonProps } from "@/types";
import { FaEthereum } from "react-icons/fa6";

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
  const { address, isConnected } = useAccount();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const sidebarRef = useRef<HTMLDivElement>(null);

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
    if (sidebarOpen && address) {
      getTokenBalances(address).then(setTokenBalances);
    }
  }, [sidebarOpen, address]);

  // Accessibility: focus trap
  React.useEffect(() => {
    if (!sidebarOpen) return;
    const focusable = sidebarRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable?.[0];
    const last = focusable?.[focusable.length - 1];
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSidebarOpen(false);
      if (e.key === "Tab" && focusable && focusable.length > 0) {
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [sidebarOpen]);

  // Truncate address
  const truncate = (addr?: string) =>
    addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "";

  // Copy address
  const copyAddress = () => {
    if (address) navigator.clipboard.writeText(address);
  };

  // USD estimate stub
  const getUsd = (amount: number) => `$${(amount * 2).toFixed(2)}`;

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
                <FaEthereum /> 0.00
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
                <span className="bg-fluxa-accent/20 text-(--fluxa-accent) px-2 py-0.5 rounded text-xs font-[audiowide]">
                  Ethereum
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
                Ξ 0.00 <span className="ml-2">{getUsd(0)}</span>
              </div>
            </div>
            <div className="mb-4 mt-5">
              <div className="font-semibold mb-2 font-[audiowide]">Tokens</div>
              <ul className="space-y-1">
                {tokenBalances.map((t) => (
                  <li
                    key={t.symbol}
                    className="flex items-center justify-between font-[audiowide] mb-5"
                  >
                    <span>{t.symbol}</span>
                    <span>{t.balance}</span>
                    <span className="text-xs text-fluxa-muted">
                      {getUsd(t.usd)}
                    </span>
                  </li>
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
