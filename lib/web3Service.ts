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

// Returns a mocked list of token balances for a given wallet address
export async function getTokenBalances(address: string): Promise<
  Array<{
    symbol: string;
    balance: number;
    usd: number;
  }>
> {
  // Simulate network delay
  await new Promise((res) => setTimeout(res, 800));
  // Return a fake token list
  return [
    { symbol: "ETH", balance: 0.234, usd: 800 },
    { symbol: "USDC", balance: 1200, usd: 1200 },
    { symbol: "DAI", balance: 500, usd: 500 },
    { symbol: "WETH", balance: 0.05, usd: 170 },
  ];
}
