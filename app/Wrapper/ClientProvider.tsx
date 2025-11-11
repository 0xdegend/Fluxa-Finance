// ClientProviders.tsx
"use client";
import React from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider } from "wagmi";
import { config } from "./wagmiClient";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <PrivyProvider appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ""}>
        {children}
      </PrivyProvider>
    </WagmiProvider>
  );
}
