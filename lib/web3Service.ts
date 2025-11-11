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
