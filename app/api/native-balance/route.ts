import type { NextApiRequest, NextApiResponse } from "next";

const MORALIS_BASE = "https://deep-index.moralis.io/api/v2";

type SuccessResponse = {
  balance: string; // wei as string
  eth: string; // converted ETH string (decimal, trimmed)
};

type ErrorResponse = {
  error: string | Record<string, unknown>;
};

type MoralisBalanceResponse = {
  balance: string;
};
function formatWeiToEth(weiStr: string): string | null {
  if (typeof weiStr !== "string" || !/^\d+$/.test(weiStr)) return null;
  try {
    const wei = BigInt(weiStr);
    const WEI_PER_ETH = BigInt("1000000000000000000"); // 1e18 as bigint

    const whole = wei / WEI_PER_ETH;
    const remainder = wei % WEI_PER_ETH;

    if (remainder === BigInt(0)) {
      return whole.toString();
    }
    let frac = remainder.toString().padStart(18, "0");
    frac = frac.replace(/0+$/g, ""); // remove trailing zeros

    return `${whole.toString()}.${frac}`;
  } catch {
    return null;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed. Use GET." });
  }
  const walletParam: string | string[] | undefined =
    req.query.wallet ?? req.query.address ?? req.query.account;
  const chainParam: string =
    typeof req.query.chain === "string"
      ? req.query.chain
      : Array.isArray(req.query.chain) && req.query.chain.length > 0
        ? req.query.chain[0]
        : "base";

  if (!walletParam) {
    return res
      .status(400)
      .json({ error: "Missing query param: wallet (or address/account)" });
  }
  const wallet: string =
    Array.isArray(walletParam) && walletParam.length > 0
      ? walletParam[0]
      : String(walletParam);

  const apiKey = process.env.MORALIS_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "Server misconfigured: missing MORALIS_API_KEY in environment",
    });
  }

  const url = `${MORALIS_BASE}/${encodeURIComponent(
    wallet,
  )}/balance?chain=${encodeURIComponent(chainParam)}`;

  try {
    const fetchRes = await fetch(url, {
      method: "GET",
      headers: {
        accept: "application/json",
        "X-API-Key": apiKey,
      },
    });

    const status = fetchRes.status;
    const json: unknown = await fetchRes.json();

    if (!fetchRes.ok) {
      let errorPayload: string | Record<string, unknown> = "Provider error";
      if (typeof json === "string") errorPayload = json;
      else if (typeof json === "object" && json !== null)
        errorPayload = json as Record<string, unknown>;
      return res.status(status).json({ error: errorPayload });
    }
    function isMoralisBalanceResponse(
      obj: unknown,
    ): obj is MoralisBalanceResponse {
      return (
        typeof obj === "object" &&
        obj !== null &&
        "balance" in obj &&
        typeof (obj as { balance?: unknown }).balance === "string"
      );
    }

    if (!isMoralisBalanceResponse(json)) {
      return res.status(500).json({ error: "Invalid response from provider." });
    }
    const wei = json.balance;
    const eth = formatWeiToEth(wei);
    if (eth === null) {
      return res.status(500).json({
        error: "Failed to parse balance from provider. Unexpected format.",
      });
    }

    return res.status(200).json({ balance: wei, eth });
  } catch (err: unknown) {
    console.error("balance api error:", err);
    let errorMsg = "Internal server error";
    if (err instanceof Error) errorMsg = err.message;
    return res.status(500).json({ error: errorMsg });
  }
}
