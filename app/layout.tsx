import type { Metadata } from "next";
import { Audiowide } from "next/font/google";
import "./globals.css";

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
      <body className={`${audioWide.variable}  antialiased`}>{children}</body>
    </html>
  );
}
