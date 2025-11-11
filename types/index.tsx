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
