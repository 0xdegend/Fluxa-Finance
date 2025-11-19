// pages/api/getWalletNetWorth.ts
import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";

const DEFAULT_CHAINS = ["eth", "base", "arbitrum"];
function parseChainsParam(raw: unknown): string[] {
  if (!raw) return DEFAULT_CHAINS;

  if (Array.isArray(raw)) {
    return raw.flatMap((r) =>
      String(r)
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    );
  }
  return String(raw)
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

type MoralisNetworthResponse = {
  total_networth_usd?: number;
  // Moralis may return other fields — we only care about total_networth_usd
  [k: string]: unknown;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { address } = req.query;

  // address validation
  if (!address || typeof address !== "string") {
    return res
      .status(400)
      .json({ error: "Missing or invalid address parameter" });
  }

  const chainsFromQuery = parseChainsParam(req.query.chain ?? req.query.chains);
  const bodyChains = req.body
    ? parseChainsParam((req.body.chain ?? req.body.chains) as unknown)
    : undefined;
  const chains =
    (bodyChains && bodyChains.length > 0 ? bodyChains : chainsFromQuery) ??
    DEFAULT_CHAINS;

  const MORALIS_API_KEY = process.env.MORALIS_API_KEY;
  if (!MORALIS_API_KEY) {
    console.error("Moralis API key not configured");
    return res.status(500).json({ error: "Moralis API key not configured" });
  }

  try {
    const base = "https://deep-index.moralis.io/api/v2.2/wallets/";
    // common params for net-worth endpoint
    const commonParams = {
      exclude_spam: "true",
      exclude_unverified_contracts: "true",
      max_token_inactivity: "1",
      min_pair_side_liquidity_usd: "1000",
    };

    // If single chain requested, single request; if multiple, request per chain and combine
    if (chains.length === 1) {
      const chain = chains[0];
      const url = new URL(`${encodeURIComponent(address)}/net-worth`, base);
      const params = new URLSearchParams({ ...commonParams, chain });
      url.search = params.toString();

      const response = await axios.get<MoralisNetworthResponse>(
        url.toString(),
        {
          headers: { accept: "application/json", "X-API-Key": MORALIS_API_KEY },
          timeout: 10000,
        }
      );

      const total = Number(response.data?.total_networth_usd ?? 0);
      return res.status(200).json({
        total_networth_usd: total,
        breakdown: { [chain]: total },
      });
    } else {
      // multiple chains: call per chain in parallel and sum results
      const calls = chains.map(async (chain) => {
        const url = new URL(`${encodeURIComponent(address)}/net-worth`, base);
        const params = new URLSearchParams({ ...commonParams, chain });
        url.search = params.toString();

        const response = await axios.get<MoralisNetworthResponse>(
          url.toString(),
          {
            headers: {
              accept: "application/json",
              "X-API-Key": MORALIS_API_KEY,
            },
            timeout: 10000,
          }
        );

        const value = Number(response.data?.total_networth_usd ?? 0);
        return { chain, value };
      });

      const results = await Promise.all(calls);
      const breakdown = results.reduce<Record<string, number>>((acc, r) => {
        acc[r.chain] = r.value;
        return acc;
      }, {});
      const total = results.reduce((s, r) => s + r.value, 0);
      return res.status(200).json({ total_networth_usd: total, breakdown });
    }
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
    } else if (error instanceof Error) {
      console.error("Moralis API error:", error.message);
      return res
        .status(500)
        .json({ error: "Internal server error", details: error.message });
    } else {
      console.error("Moralis API error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
}
