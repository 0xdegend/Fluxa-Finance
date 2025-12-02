import React, { useState, useRef, useEffect } from "react";
import { usePrivy, useWallets, useLogout } from "@privy-io/react-auth";
import { useAccount } from "wagmi";
import {
  fetchTokenBalances,
  fetchWalletBalance,
  truncate,
} from "../../lib/web3Service";
import type { TokenBalance } from "@/types";
import { Web3LoginButtonProps } from "@/types";
import { FaEthereum } from "react-icons/fa6";
import { formatSignificant } from "@/app/utils/numberFormat";
import WalletSidebarContainer from "./WalletSideBarContainer";

export const Web3LoginButton: React.FC<
  Web3LoginButtonProps & { network?: string; setNetwork?: (n: string) => void }
> = ({
  variant = "navbar",
  size = "md",
  onAction,
  showSmallWhenConnected = false,
  label,
  className = "",
  network = "base",
  setNetwork,
}) => {
  const { login, user } = usePrivy();
  const { wallets } = useWallets();
  const { isConnected } = useAccount();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [balances, setBalances] = useState<TokenBalance[] | null>([]);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const address =
    wallets && wallets.length > 0 ? wallets[0].address : undefined;

  const { logout } = useLogout({
    onSuccess: () => {
      console.log("User successfully logged out");
    },
  });
  const handleLogin = async () => {
    login();
  };

  const handleLogout = () => {
    logout();
    setSidebarOpen(false);
  };

  const NETWORK_KEY_TO_CHAIN: Record<string, string> = {
    base: "base",
    eth: "eth",
    polygon: "polygon",
    bsc: "bsc",
    avalanche: "avalanche",
    fantom: "fantom",
    optimism: "optimism",
    arbitrum: "arbitrum",
  };
  const apiChain = NETWORK_KEY_TO_CHAIN[network ?? "base"] ?? "eth";

  useEffect(() => {
    let mounted = true;
    async function loadBalances() {
      setLoading(true);
      try {
        if (!address) {
          setBalances(null);
          return;
        }
        const data = await fetchTokenBalances(address, apiChain, 10);
        if (!mounted) return;
        setBalances(Array.isArray(data) ? data : data?.balances ?? []);
      } catch (err) {
        console.error("Error fetching balances:", err);
        if (mounted) setBalances([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    if (address) {
      loadBalances();
    }
    return () => {
      mounted = false;
    };
  }, [sidebarOpen, address, apiChain]);

  useEffect(() => {
    if (!address && !sidebarOpen) {
      return;
    }
    async function loadWalletBalance() {
      try {
        const walletBalance = await fetchWalletBalance(
          address as string,
          apiChain
        );
        const value = Number(walletBalance?.total_networth_usd ?? 0);

        setWalletBalance(Number.isFinite(value) ? value : 0);
      } catch (err) {
        console.error("Error fetching wallet balance:", err);
        setWalletBalance(null);
      }
    }
    if (address) {
      loadWalletBalance();
    }
  }, [address, sidebarOpen, apiChain]);

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
  if (variant === "navbar") {
    return (
      <>
        <button
          aria-pressed={sidebarOpen}
          aria-expanded={sidebarOpen}
          aria-label={user ? `Wallet: ${truncate(address)}` : "Connect Wallet"}
          className={btnClass}
          onClick={() => (user ? setSidebarOpen(true) : handleLogin())}
          type="button"
        >
          {user ? (
            <>
              <span className="font-mono">{truncate(address)}</span>
              <span className="ml-2 bg-fluxa-glass px-2 py-0.5 rounded text-xs flex gap-1">
                <FaEthereum />
                {balances !== null
                  ? formatSignificant(balances[0]?.balance, 5)
                  : "—"}
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
            <>
              <div
                className="fixed inset-0 z-40 bg-white/80 transition-opacity pointer-events-auto"
                onClick={() => setSidebarOpen(false)}
                aria-hidden="true"
              />

              <div
                className="fixed inset-y-0 right-0 z-50 flex justify-end pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <WalletSidebarContainer
                  rawAddress={address}
                  initialNetwork="eth"
                  sidebarOpen={sidebarOpen}
                  setSidebarOpen={setSidebarOpen}
                  copyAddress={copyAddress}
                  handleLogout={handleLogout}
                  onClaimRewards={() => {
                    console.log("claim rewards");
                  }}
                />
              </div>
            </>
          )}
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
        if (!isConnected) return handleLogin();
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
