import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";

const DEFAULT_CHAINS = ["eth", "base", "arbitrum"];

function parseChainsParam(raw: string | string[] | undefined): string[] {
  if (!raw) return DEFAULT_CHAINS;

  if (Array.isArray(raw)) {
    return raw.flatMap((r) =>
      r
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    );
  }
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { address } = req.query;
  if (!address || typeof address !== "string") {
    return res
      .status(400)
      .json({ error: "Missing or invalid address parameter" });
  }

  const chains = parseChainsParam(req.query.chains);

  const MORALIS_API_KEY = process.env.MORALIS_API_KEY;
  if (!MORALIS_API_KEY) {
    return res.status(500).json({ error: "Moralis API key not configured" });
  }

  try {
    const base = "https://deep-index.moralis.io/api/v2.2/wallets/";
    const url = new URL(`${encodeURIComponent(address)}/net-worth`, base);

    const params = new URLSearchParams({
      exclude_spam: "true",
      exclude_unverified_contracts: "true",
      max_token_inactivity: "1",
      min_pair_side_liquidity_usd: "1000",
      chain: chains.join(","),
    });

    // append to url
    url.search = params.toString();

    const response = await axios.get(url.toString(), {
      headers: {
        accept: "application/json",
        "X-API-Key": MORALIS_API_KEY,
      },
    });
    return res.status(200).json(response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(
        "Moralis API error:",
        error.response?.data || error.message
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
