import type { NextApiRequest, NextApiResponse } from "next";

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

  const MORALIS_API_KEY = process.env.MORALIS_API_KEY;
  if (!MORALIS_API_KEY) {
    return res.status(500).json({ error: "Moralis API key not configured" });
  }

  const url = `https://deep-index.moralis.io/api/v2.2/wallets/${address}/tokens?chain=eth&limit=25`;
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        accept: "application/json",
        "X-API-Key": MORALIS_API_KEY,
      },
    });
    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: "Failed to fetch token balances" });
    }
    const data = await response.json();
    // Map Moralis response to expected format
    const balances = (data.result || []).map(
      (token: {
        symbol: string;
        balance: string;
        decimals: number;
        usdPrice?: number;
      }) => ({
        symbol: token.symbol,
        balance: Number(token.balance) / Math.pow(10, token.decimals),
        usd: token.usdPrice
          ? (Number(token.balance) / Math.pow(10, token.decimals)) *
            token.usdPrice
          : 0,
      })
    );
    return res.status(200).json(balances);
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
}
