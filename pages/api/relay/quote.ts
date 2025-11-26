// pages/api/relay/quote.ts
import type { NextApiRequest, NextApiResponse } from "next";
import fetch from "node-fetch";

const RELAY_API_KEY = process.env.RELAY_API_KEY;
const RELAY_BASE = process.env.RELAY_BASE ?? "https://api.relay.link"; // replace with actual

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") return res.status(405).end();
  const body = req.body;
  // Validate required fields: fromChain, toChain, fromToken, toToken, amount
  if (
    !body?.fromChain ||
    !body?.toChain ||
    !body?.fromToken ||
    !body?.toToken ||
    !body?.amount
  ) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // Replace the path & payload with Relay's quote endpoint payload
    const url = `${RELAY_BASE}/quote`; // placeholder
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RELAY_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    const json = await r.json();
    if (!r.ok) {
      console.error("Relay quote error", { status: r.status, json });
      return res.status(r.status).json(json);
    }
    return res.status(200).json(json);
  } catch (err) {
    console.error("relay quote proxy error", err);
    return res.status(500).json({ error: "relay proxy failed" });
  }
}
