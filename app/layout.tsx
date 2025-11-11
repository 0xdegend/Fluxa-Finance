import type { Metadata } from "next";
import { Audiowide } from "next/font/google";
import { PrivyProvider } from "@privy-io/react-auth";
import "./globals.css";
import { ClientProviders } from "./Wrapper/ClientProvider";

const audioWide = Audiowide({
  variable: "--font-audiowide",
  weight: ["400"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fluxa Finance",
  description: "Liquidity in motion",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${audioWide.variable}  antialiased`}>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
