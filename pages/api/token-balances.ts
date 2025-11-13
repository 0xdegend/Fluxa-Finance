import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";

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
    const response = await axios.get(url, {
      headers: {
        accept: "application/json",
        "X-API-Key": MORALIS_API_KEY,
      },
    });
    const data = response.data;
    // Map Moralis response to expected format
    const balances = (data.result || []).map(
      (token: {
        symbol: string;
        balance_formatted: string;
        usd_value: number;
        logo: string;
      }) => ({
        symbol: token.symbol,
        balance: Number(token.balance_formatted),
        usd: token.usd_value,
        logo: token.logo,
      })
    );
    return res.status(200).json(balances);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(
        "Moralis API error:",
        error.response?.data || error.message
      );
    } else if (error instanceof Error) {
      console.error("Moralis API error:", error.message);
    } else {
      console.error("Moralis API error:", error);
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}
