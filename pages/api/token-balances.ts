// pages/api/getTokenBalances.ts
import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";

const SUPPORTED_CHAINS = [
  "eth",
  "base",
  "polygon",
  "bsc",
  "avalanche",
  "fantom",
  "optimism",
  "arbitrum",
];

function getFirstQueryValue(
  q: string | string[] | undefined
): string | undefined {
  if (!q) return undefined;
  return Array.isArray(q) ? q[0] : q;
}
type MoralisTokenRaw = {
  symbol?: string | null;
  token_symbol?: string | null;
  contract_ticker_symbol?: string | null;

  balance_formatted?: string | number | null;
  balanceFormatted?: string | number | null;
  balance?: string | number | null;

  usd_value?: number | null;
  quote?: number | null;
  usdPrice?: number | null;

  logo?: string | null;
  logo_url?: string | null;
  token_logo?: string | null;

  [k: string]: unknown;
};

type TokenBalance = {
  symbol: string;
  balance: number | null;
  usd: number | null;
  logo: string | null;
  _raw?: MoralisTokenRaw;
};
function parseMoralisToken(input: unknown): TokenBalance {
  const token = (input as MoralisTokenRaw) ?? {};

  const symbol =
    (typeof token.symbol === "string" && token.symbol) ||
    (typeof token.token_symbol === "string" && token.token_symbol) ||
    (typeof token.contract_ticker_symbol === "string" &&
      token.contract_ticker_symbol) ||
    "UNKNOWN";
  const rawBalance =
    token.balance_formatted ?? token.balanceFormatted ?? token.balance ?? null;

  let balanceNum: number | null = null;
  if (typeof rawBalance === "number" && Number.isFinite(rawBalance)) {
    balanceNum = rawBalance;
  } else if (typeof rawBalance === "string") {
    const cleaned = rawBalance.replace?.(/,/g, "") ?? rawBalance;
    const parsed = Number(cleaned);
    balanceNum = Number.isFinite(parsed) ? parsed : null;
  }

  const usdCandidate = token.usd_value ?? token.quote ?? token.usdPrice ?? null;
  const usd =
    typeof usdCandidate === "number" && Number.isFinite(usdCandidate)
      ? usdCandidate
      : null;

  const logo =
    (typeof token.logo === "string" && token.logo) ||
    (typeof token.logo_url === "string" && token.logo_url) ||
    (typeof token.token_logo === "string" && token.token_logo) ||
    null;

  return {
    symbol,
    balance: balanceNum,
    usd,
    logo,
    _raw: token,
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // prefer query params, fall back to body (for POST)
  const rawAddress =
    getFirstQueryValue(req.query.address) ?? (req.body && req.body.address);
  const rawchain =
    getFirstQueryValue(req.query.chain) ?? (req.body && req.body.chain);
  const rawLimit =
    getFirstQueryValue(req.query.limit) ?? (req.body && req.body.limit);

  if (!rawAddress || typeof rawAddress !== "string") {
    return res
      .status(400)
      .json({ error: "Missing or invalid 'address' parameter" });
  }

  // normalize
  const address = rawAddress.trim().toLowerCase();

  // chain validation and default
  const chain =
    (typeof rawchain === "string" && rawchain.trim().toLowerCase()) || "eth";
  if (!SUPPORTED_CHAINS.includes(chain)) {
    return res.status(400).json({
      error: `Unsupported chain '${chain}'. Supported: ${SUPPORTED_CHAINS.join(
        ", "
      )}`,
    });
  }

  const limit = Math.min(Math.max(Number(rawLimit ?? 25), 1), 100); // between 1 and 100

  const MORALIS_API_KEY = process.env.MORALIS_API_KEY;
  if (!MORALIS_API_KEY) {
    console.error("Moralis API key not configured");
    return res.status(500).json({ error: "Moralis API key not configured" });
  }

  const url = `https://deep-index.moralis.io/api/v2.2/wallets/${encodeURIComponent(
    address
  )}/tokens?chain=${encodeURIComponent(chain)}&limit=${limit}`;

  try {
    const response = await axios.get(url, {
      headers: {
        accept: "application/json",
        "X-API-Key": MORALIS_API_KEY,
      },
      timeout: 10000,
    });

    const data = response.data;
    // Normalize response to an array of unknown items
    const resultsArray: unknown[] = Array.isArray(data?.result)
      ? data.result
      : Array.isArray(data)
      ? data
      : Array.isArray(data?.result)
      ? data.result
      : [];

    // parse with typed parser (no `any`)
    const balances: TokenBalance[] = resultsArray.map(parseMoralisToken);

    return res
      .status(200)
      .json({ address, chain, limit, count: balances.length, balances });
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.error(
        "Moralis API error:",
        error.response?.status,
        error.response?.data ?? error.message
      );
      const status = error.response?.status ?? 500;
      const message = error.response?.data ?? error.message;
      return res
        .status(status)
        .json({ error: "Moralis API error", details: message });
    }
    console.error(
      "Unknown error calling Moralis:",
      (error as Error).message ?? error
    );
    return res.status(500).json({ error: "Internal server error" });
  }
}
