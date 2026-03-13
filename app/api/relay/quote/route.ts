import { NextRequest, NextResponse } from "next/server";

const RELAY_API = "https://api.relay.link";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate required fields before hitting Relay
    const {
      user,
      originChainId,
      destinationChainId,
      originCurrency,
      destinationCurrency,
      amount,
      tradeType,
    } = body;

    if (
      !user ||
      !originChainId ||
      !destinationChainId ||
      !originCurrency ||
      !destinationCurrency ||
      !amount ||
      !tradeType
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const relayRes = await fetch(`${RELAY_API}/quote/v2`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await relayRes.json();

    if (!relayRes.ok) {
      return NextResponse.json(
        { error: data?.message ?? "Relay quote failed" },
        { status: relayRes.status },
      );
    }

    // Extract only what the frontend needs — don't expose full relay response
    const details = data?.details;
    const fees = data?.fees;

    return NextResponse.json({
      estOut: details?.currencyOut?.amountFormatted ?? "0",
      estOutUsd: details?.currencyOut?.amountUsd ?? "0",
      gasFee: fees?.gas?.amountFormatted ?? "0",
      gasFeeUsd: fees?.gas?.amountUsd ?? "0",
      relayerFee: fees?.relayer?.amountFormatted ?? "0",
      relayerFeeUsd: fees?.relayer?.amountUsd ?? "0",
      timeEstimate: details?.timeEstimate ?? 0,
      rate: details?.rate ?? "0",
      priceImpact: details?.totalImpact?.percent ?? "0",
      minReceived: details?.currencyOut?.minimumAmount ?? "0",
      // Keep steps for when we implement actual swap execution
      steps: data?.steps ?? [],
    });
  } catch (err) {
    console.error("Relay quote proxy error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
