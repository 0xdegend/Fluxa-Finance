import { StaticImageData } from "next/image";

export type Ticker = {
  id: string;
  symbol: string;
  price?: number;
  change24h?: number;
  updatedAt?: number;
};

export interface Token {
  symbol: string;
  balance?: number | string | null;
  usd?: number | string | null;
  logo?: string | StaticImageData | null;
  chain?: string;
  name?: string;
  icon?: string | null;
}

export type Preview = {
  estOut: number;
  estOutUsd: string;
  estInUsd: string;
  priceImpact: number;
  fee: number;
  minReceived: number;
  gasFeeUsd?: string;
  timeEstimate?: number;
  rate?: string;
};

export interface SwapParams {
  fromToken: Token;
  toToken: Token;
  amount: number;
  slippage: number;
}

export interface SwapResult {
  txHash: string;
  status: "success" | "error";
}

export interface TokenSummaryCardProps {
  token: string;
  price: number;
  change: number;
  priceSeries: number[];
}

export type Web3LoginButtonVariant = "navbar" | "inline";

export type Web3LoginButtonSize = "sm" | "md" | "lg";

export type TokenBalance = {
  symbol: string;
  balance: number;
  usd: number;
  logo?: string;
};

export interface Web3LoginButtonProps {
  variant?: Web3LoginButtonVariant;
  size?: Web3LoginButtonSize;
  onAction?: () => Promise<void> | void;
  showSmallWhenConnected?: boolean;
  label?: string;
  className?: string;
}

export type NetworkOption = {
  key: string;
  label: string;
  moralisKey?: string;
  chainId?: number;
};

export type NetworkDropdownProps = {
  current: string;
  onChange: (networkKey: string) => void;
  networks?: NetworkOption[];
  size?: "sm" | "md" | "lg";
  switchOnSelect?: boolean;
  className?: string;
};

// Testing Network Switch and Token Search

export type ChainKey =
  | "eth"
  | "polygon"
  | "base"
  | "arbitrum"
  | "bsc"
  | "optimism"
  | string;

export type TokenInfo = {
  chain?: string;
  address?: string;
  symbol: string;
  name?: string;
  decimals?: number;
  logo?: string | null;
  balance?: number;
  icon?: string | null;
};

export type TokenSearchResult = TokenInfo & {
  score?: number;
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
  networks?: { key: string; label: string }[];
  onRefreshBalances?: () => void;
}

export type BalanceEntry = {
  loading: boolean;
  found: boolean;
  balanceRaw: string;
  formatted: string;
  decimals: number;
  symbol: string | null;
  name: string | null;
};

export type RelayQuote = {
  estOut: string;
  estOutUsd: string;
  gasFee: string;
  gasFeeUsd: string;
  relayerFee: string;
  relayerFeeUsd: string;
  timeEstimate: number;
  rate: string;
  priceImpact: string;
  minReceived: string;
  estInUsd: string;
};
