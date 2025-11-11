import { Token } from "@/types";

export const DEFAULT_ASSETS = [
  { id: "bitcoin", symbol: "BTC" },
  { id: "ethereum", symbol: "ETH" },
  { id: "tether", symbol: "USDT" },
  { id: "binancecoin", symbol: "BNB" },
  { id: "solana", symbol: "SOL" },
  { id: "cardano", symbol: "ADA" },
  { id: "pudgy-penguins", symbol: "PENGU" },
  { id: "hyperliquid", symbol: "HYPE" },
  { id: "aster-2", symbol: "ASTER" },
  { id: "ripple", symbol: "XRP" },
  { id: "dogecoin", symbol: "DOGE" },
];

export const TOKENS: Token[] = [
  {
    symbol: "ETH",
    name: "Ethereum",
    balance: 5.123,
    icon: "/logos/eth-logo.png",
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    balance: 2500,
    icon: "/logos/usdc-logo.png",
  },
  {
    symbol: "DAI",
    name: "Dai",
    balance: 1800,
    icon: "/logos/dai-logo.png",
  },
];
