import type { Metadata } from "next";
import { Rajdhani, Funnel_Sans } from "next/font/google";
import "./globals.css";
import { ClientProviders } from "./Wrapper/ClientProvider";

const funnel = Funnel_Sans({
  variable: "--font-funnel",
  weight: ["300", "400", "500", "600", "700", "800"],
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
      <body className={`${funnel.variable} ${rajdhani.variable} antialiased`}>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
