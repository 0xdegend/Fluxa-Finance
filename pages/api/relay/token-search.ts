// pages/api/relay/token-search.ts
import type { NextApiRequest, NextApiResponse } from "next";
import fetch from "node-fetch";
import type { TokenSearchResult } from "@/types";

const MORALIS_API_KEY = process.env.MORALIS_API_KEY;

/** Narrowing / parsing helpers */
function isObject(x: unknown): x is Record<string, unknown> {
  return !!x && typeof x === "object" && !Array.isArray(x);
}

function parseMoralisTokenRaw(
  raw: unknown,
  fallbackAddress: string,
  chain: string
): TokenSearchResult | null {
  if (!isObject(raw)) return null;
  const r = raw as Record<string, unknown>;

  const addr =
    (typeof r.address === "string" && r.address) ||
    (typeof r.token_address === "string" && r.token_address) ||
    fallbackAddress;

  const symbol =
    (typeof r.symbol === "string" && r.symbol) ||
    (typeof r.contract_ticker_symbol === "string" &&
      r.contract_ticker_symbol) ||
    "UNKNOWN";

  const name =
    (typeof r.name === "string" && r.name) ||
    (typeof r.contract_name === "string" && r.contract_name) ||
    undefined;

  const decimalsCandidate =
    r.decimals ?? r.token_decimals ?? r.contract_decimals ?? undefined;
  let decimals = 18;
  if (
    typeof decimalsCandidate === "number" &&
    Number.isFinite(decimalsCandidate)
  )
    decimals = decimalsCandidate;
  else if (
    typeof decimalsCandidate === "string" &&
    /^\d+$/.test(decimalsCandidate)
  )
    decimals = parseInt(decimalsCandidate, 10);

  const logo =
    (typeof r.logo === "string" && r.logo) ||
    (typeof r.logo_url === "string" && r.logo_url) ||
    null;

  return {
    chain,
    address: String(addr).toLowerCase(),
    symbol,
    name,
    decimals,
    logo,
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const chain =
    typeof req.query.chain === "string" ? req.query.chain.trim() : "eth";

  if (!q) return res.status(400).json({ error: "Missing query `q`" });

  const isAddress = /^0x[0-9a-fA-F]{40}$/.test(q);

  // ---------- Exact address lookup (Moralis ERC20 metadata) ----------
  if (isAddress) {
    if (!MORALIS_API_KEY) {
      console.error("Moralis API key missing");
      return res.status(500).json({ error: "Moralis API key not configured" });
    }

    try {
      const url = `https://deep-index.moralis.io/api/v2.2/erc20/metadata?chain=${encodeURIComponent(
        chain
      )}&addresses[]=${encodeURIComponent(q)}`;

      const r = await fetch(url, {
        headers: { "X-API-Key": MORALIS_API_KEY, accept: "application/json" },
      });
      if (!r.ok) {
        const text = await r.text().catch(() => "");
        console.error("Moralis metadata lookup failed", r.status, text);
        return res
          .status(r.status)
          .json({ error: "Moralis metadata lookup failed", details: text });
      }

      const rawJson: unknown = await r.json();

      // normalize potential shapes: array, { result: [...] }, single object
      let candidates: unknown[] = [];
      if (Array.isArray(rawJson)) candidates = rawJson;
      else if (
        isObject(rawJson) &&
        Array.isArray((rawJson as Record<string, unknown>).result)
      )
        candidates = (rawJson as Record<string, unknown>).result as unknown[];
      else if (isObject(rawJson)) candidates = [rawJson];
      else candidates = [];

      const tokens: TokenSearchResult[] = candidates
        .map((c) => parseMoralisTokenRaw(c, q, chain))
        .filter((t): t is TokenSearchResult => t !== null);

      return res.status(200).json(tokens);
    } catch (err) {
      console.error("token address lookup error", err);
      return res.status(500).json({ error: "token address lookup failed" });
    }
  }
  try {
    const cgUrl = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(
      q
    )}`;
    const r = await fetch(cgUrl, { headers: { accept: "application/json" } });
    if (!r.ok) {
      const text = await r.text().catch(() => "");
      console.error("CoinGecko search failed", r.status, text);
      return res
        .status(r.status)
        .json({ error: "CoinGecko search failed", details: text });
    }

    const rawJson: unknown = await r.json();
    const coins =
      isObject(rawJson) && Array.isArray(rawJson.coins) ? rawJson.coins : [];

    // map into TokenSearchResult[] conservatively (address unknown)
    const results: TokenSearchResult[] = (coins as unknown[])
      .slice(0, 12)
      .map((c) => {
        if (!isObject(c)) {
          return {
            chain,
            address: "",
            symbol: String(c ?? "").toUpperCase(),
            name: undefined,
            decimals: 18,
            logo: null,
          } as TokenSearchResult;
        }
        const coin = c as Record<string, unknown>;
        const id = typeof coin.id === "string" ? coin.id : "";
        const symbol =
          typeof coin.symbol === "string"
            ? coin.symbol.toUpperCase()
            : id.toUpperCase();
        const name = typeof coin.name === "string" ? coin.name : undefined;
        const image =
          typeof coin.large === "string"
            ? `${coin.large}`
            : typeof coin.thumb === "string"
            ? coin.thumb
            : typeof coin.small === "string"
            ? coin.small
            : null;
        return {
          chain,
          address: "",
          symbol,
          name,
          decimals: 18,
          logo: image,
        } as TokenSearchResult;
      });

    return res.status(200).json(results);
  } catch (err) {
    console.error("fuzzy search error", err);
    return res.status(500).json({ error: "search failed" });
  }
}
