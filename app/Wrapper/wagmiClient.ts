import { createConfig } from "wagmi";
import {
  mainnet,
  polygon,
  optimism,
  arbitrum,
  sepolia,
  base,
} from "wagmi/chains";
import { http } from "wagmi";

export const config = createConfig({
  chains: [mainnet, polygon, optimism, arbitrum, sepolia, base],
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [optimism.id]: http(),
    [arbitrum.id]: http(),
    [sepolia.id]: http(),
    [base.id]: http(),
  },
});
