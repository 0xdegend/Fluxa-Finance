import type { NextApiRequest, NextApiResponse } from "next";
import fetch from "node-fetch";

const MORALIS_API_KEY = process.env.MORALIS_API_KEY;

function isAddress(x: string) {
  return /^0x[0-9a-fA-F]{40}$/.test(x);
}

function isObject(x: unknown): x is Record<string, unknown> {
  return !!x && typeof x === "object" && !Array.isArray(x);
}

function formatWithDecimals(balanceStr: string, decimals: number) {
  const digits = (balanceStr || "").replace(/^0+/, ""); // trim leading zeros
  const dec = Math.max(0, Math.floor(Number(decimals) || 0));

  if (digits.length === 0) {
    return "0";
  }

  if (dec === 0) return digits;

  if (digits.length <= dec) {
    // number < 1
    const frac = digits.padStart(dec, "0").replace(/0+$/, "");
    return frac === "" ? "0" : `0.${frac}`;
  }

  const intPart = digits.slice(0, digits.length - dec);
  const fracPart = digits.slice(digits.length - dec).replace(/0+$/, "");
  return fracPart === "" ? intPart : `${intPart}.${fracPart}`;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const wallet =
    typeof req.query.wallet === "string" ? req.query.wallet.trim() : "";
  const token =
    typeof req.query.token === "string" ? req.query.token.trim() : "";
  const chain =
    typeof req.query.chain === "string" ? req.query.chain.trim() : "eth";

  if (!wallet) return res.status(400).json({ error: "Missing query `wallet`" });
  if (!isAddress(wallet))
    return res.status(400).json({ error: "Invalid wallet address" });
  if (!token)
    return res
      .status(400)
      .json({ error: "Missing query `token` (contract address)" });
  if (!isAddress(token))
    return res.status(400).json({ error: "Invalid token contract address" });

  if (!MORALIS_API_KEY) {
    console.error("Moralis API key missing");
    return res.status(500).json({ error: "Moralis API key not configured" });
  }

  try {
    // fetch all ERC20 balances for the wallet
    const url = `https://deep-index.moralis.io/api/v2.2/${encodeURIComponent(
      wallet,
    )}/erc20?chain=${encodeURIComponent(chain)}`;
    const r = await fetch(url, {
      headers: { "X-API-Key": MORALIS_API_KEY, accept: "application/json" },
    });

    if (!r.ok) {
      const text = await r.text().catch(() => "");
      console.error("Moralis erc20 lookup failed", r.status, text);
      return res
        .status(r.status)
        .json({ error: "Moralis erc20 lookup failed", details: text });
    }

    const rawJson: unknown = await r.json();
    const arr = Array.isArray(rawJson) ? (rawJson as unknown[]) : [];

    // try to find the token (match contract keys used by Moralis)
    const lcToken = token.toLowerCase();

    const found = (arr as unknown[]).find(
      (it: unknown): it is Record<string, unknown> => {
        if (!isObject(it)) return false;
        const candidate =
          (typeof it.token_address === "string" && it.token_address) ||
          (typeof it.contract_address === "string" && it.contract_address) ||
          (typeof it.address === "string" && it.address) ||
          "";
        return (
          typeof candidate === "string" && candidate.toLowerCase() === lcToken
        );
      },
    );

    if (!found) {
      // not present in wallet's ERC20 list → treat as zero balance and return useful metadata if possible
      return res.status(200).json({
        found: false,
        balance: "0",
        decimals: 18,
        formatted: "0",
        symbol: null,
        name: null,
      });
    }

    // Moralis usually returns `balance` as string (raw smallest unit)
    const rawBalance =
      typeof found.balance === "string"
        ? found.balance
        : typeof found.balance === "number"
          ? String(found.balance)
          : "0";

    const decimals =
      typeof found.decimals === "number"
        ? found.decimals
        : typeof found.decimals === "string" && /^\d+$/.test(found.decimals)
          ? parseInt(found.decimals as string, 10)
          : 18;

    const symbol =
      (typeof found.symbol === "string" && found.symbol) ||
      (typeof found.contract_ticker_symbol === "string" &&
        found.contract_ticker_symbol) ||
      null;

    const name =
      (typeof found.name === "string" && found.name) ||
      (typeof found.contract_name === "string" && found.contract_name) ||
      null;

    const formatted = formatWithDecimals(rawBalance, decimals);

    return res.status(200).json({
      found: true,
      balance: rawBalance, // raw integer string
      decimals,
      formatted,
      symbol,
      name,
    });
  } catch (err) {
    console.error("erc20 balance lookup error", err);
    return res.status(500).json({ error: "erc20 balance lookup failed" });
  }
}
