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

type ChainEntry = {
  chain: string;
  native_balance?: string;
  native_balance_formatted?: string;
  native_balance_usd?: string;
  token_balance_usd?: string;
  networth_usd?: string;
  [k: string]: unknown;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { address } = req.query;

  if (!address) {
    return res
      .status(400)
      .json({ error: "Missing or invalid address parameter" });
  }
  const addrStr = Array.isArray(address) ? address[0] : address;
  if (typeof addrStr !== "string") {
    return res.status(400).json({ error: "Address must be a string" });
  }
  const chainsFromQuery = parseChainsParam(
    req.query.chain ?? req.query.chains ?? req.query["chains[]"]
  );
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
    const commonParams: Record<string, string> = {
      exclude_spam: "true",
      exclude_unverified_contracts: "true",
      max_token_inactivity: "1",
      min_pair_side_liquidity_usd: "1000",
    };

    async function callMoralisWithChain(chainKey: string) {
      const url = new URL(`${encodeURIComponent(addrStr)}/net-worth`, base);
      const params = new URLSearchParams(commonParams);
      params.append("chains[0]", chainKey);
      url.search = params.toString();
      const response = await axios.get(url.toString(), {
        headers: { accept: "application/json", "X-API-Key": MORALIS_API_KEY },
        timeout: 10000,
      });

      const data = response.data ?? {};
      let entry: ChainEntry;
      if (Array.isArray(data.chains) && data.chains.length > 0) {
        const first = data.chains[0] as Record<string, unknown>;
        entry = {
          chain: chainKey,
          native_balance: String(
            first.native_balance ?? first.nativeBalance ?? ""
          ),
          native_balance_formatted: String(
            first.native_balance_formatted ?? first.nativeBalanceFormatted ?? ""
          ),
          native_balance_usd: String(
            first.native_balance_usd ?? first.nativeBalanceUsd ?? ""
          ),
          token_balance_usd: String(
            first.token_balance_usd ?? first.tokenBalanceUsd ?? ""
          ),
          networth_usd: String(
            first.networth_usd ?? first.networthUsd ?? first.networth ?? ""
          ),
          ...first,
        };
      } else {
        entry = {
          chain: chainKey,
          native_balance: String(data.native_balance ?? ""),
          native_balance_formatted: String(data.native_balance_formatted ?? ""),
          native_balance_usd: String(data.native_balance_usd ?? ""),
          token_balance_usd: String(data.token_balance_usd ?? ""),
          networth_usd: String(
            data.networth_usd ?? data.networth ?? data.total_networth_usd ?? "0"
          ),
          ...data,
        };
      }

      const parsed = parseFloat(String(entry.networth_usd ?? "0"));
      const totalNum = Number.isFinite(parsed) ? parsed : 0;
      return { chain: chainKey, entry, totalNum };
    }
    if (chains.length === 1) {
      const chainKey = chains[0];
      const { entry, totalNum } = await callMoralisWithChain(chainKey);
      const totalStr = totalNum.toFixed(2);
      const normalizedEntry: ChainEntry = {
        ...entry,
        networth_usd:
          entry.networth_usd && !Number.isNaN(Number(entry.networth_usd))
            ? Number(entry.networth_usd).toFixed(2)
            : totalStr,
      };

      return res.status(200).json({
        total_networth_usd: totalStr,
        chains: [normalizedEntry],
      });
    }
    const calls = chains.map((c) => callMoralisWithChain(c));
    const results = await Promise.all(calls);
    const chainsArray: ChainEntry[] = results.map((r) => ({
      ...r.entry,
      chain: r.chain,
      networth_usd: Number.isFinite(r.totalNum)
        ? r.totalNum.toFixed(2)
        : String(r.entry.networth_usd ?? "0"),
    }));
    const total = results.reduce((s, r) => s + r.totalNum, 0);
    const totalStr = total.toFixed(2);

    return res
      .status(200)
      .json({ total_networth_usd: totalStr, chains: chainsArray });
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
    console.error("Unknown error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
