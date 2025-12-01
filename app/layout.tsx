import type { Metadata } from "next";
import { Audiowide, Rajdhani } from "next/font/google";
import { PrivyProvider } from "@privy-io/react-auth";
import "./globals.css";
import { ClientProviders } from "./Wrapper/ClientProvider";

const audioWide = Audiowide({
  variable: "--font-audiowide",
  weight: ["400"],
  subsets: ["latin"],
});

const rajdhani = Rajdhani({
  variable: "--font-rajdhani",
  weight: ["300", "400", "500", "600", "700"],
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
      <body
        className={`${audioWide.variable} ${rajdhani.variable} antialiased`}
      >
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
