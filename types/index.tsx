export type Ticker = {
  id: string;
  symbol: string;
  price?: number;
  change24h?: number;
  updatedAt?: number;
};

export interface Token {
  symbol: string;
  name: string;
  balance: number;
  icon?: string;
}

export interface Preview {
  estOut: number;
  priceImpact: number;
  fee: number;
  minReceived: number;
}

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
  key: string; // internal key you use in your app (e.g. 'base', 'polygon')
  label: string; // human label (e.g. 'Base', 'Polygon')
  moralisKey?: string; // string to pass to Moralis / API (if different), fallback to key
  chainId?: number; // optional numeric chainId used to trigger provider switch
};

export type NetworkDropdownProps = {
  current: string; // current network key
  onChange: (networkKey: string) => void;
  networks?: NetworkOption[];
  size?: "sm" | "md" | "lg";
  switchOnSelect?: boolean; // if true will attempt to call wallet_switchEthereumChain
  className?: string;
};
