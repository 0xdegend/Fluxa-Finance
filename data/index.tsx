import { Token } from "@/types";
import { NetworkOption } from "@/types";

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

export const tokens = [
  {
    token: "ETH",
    price: 2012.34,
    change: 2.13,
    priceSeries: [2000, 2005, 2010, 2008, 2012, 2011, 2012.34],
  },
  {
    token: "USDC",
    price: 1.0,
    change: 0.01,
    priceSeries: [1, 1, 1, 1, 1, 1, 1],
  },
];

export const DEFAULT_NETWORKS: NetworkOption[] = [
  { key: "base", label: "Base", moralisKey: "base", chainId: 8453 },
  { key: "eth", label: "Ethereum", moralisKey: "eth", chainId: 1 },
  { key: "polygon", label: "Polygon", moralisKey: "polygon", chainId: 137 },
  { key: "bsc", label: "BSC", moralisKey: "bsc", chainId: 56 },
  {
    key: "avalanche",
    label: "Avalanche",
    moralisKey: "avalanche",
    chainId: 43114,
  },
  { key: "optimism", label: "Optimism", moralisKey: "optimism", chainId: 10 },
  {
    key: "arbitrum",
    label: "Arbitrum",
    moralisKey: "arbitrum",
    chainId: 42161,
  },
  { key: "fantom", label: "Fantom", moralisKey: "fantom", chainId: 250 },
];
