export async function swap({
  fromToken,
  toToken,
  amount,
  slippage,
}: {
  fromToken: string;
  toToken: string;
  amount: number;
  slippage: number;
}) {
  // Simulate network delay
  await new Promise((res) => setTimeout(res, 1500));
  // Return a fake transaction hash
  return {
    txHash: "0x" + Math.random().toString(16).slice(2, 18),
    status: "success",
  };
}

export async function fetchTokenBalances(address: string) {
  const res = await fetch(`/api/token-balances?address=${address}`);
  if (!res.ok) throw new Error("Failed to fetch token balances");
  return await res.json();
}
