// ClientProviders.tsx
"use client";
import React from "react";
import { PrivyProvider } from "@privy-io/react-auth";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ""}>
      {children}
    </PrivyProvider>
  );
}
