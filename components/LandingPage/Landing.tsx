"use client";
import React, { useState } from "react";
import TokenSummaryCard from "../Swap/TokenSummaryCard";
import SwapCard from "../Swap/SwapCard";
import GridBg from "../Common/GridBg";
import PriceMarquee from "../Common/PriceMarquee";
import Web3LoginButton from "../Common/Web3LoginButton";
import { useTokenPrices } from "@/app/hooks/useTokenPrices";
const Landing: React.FC = () => {
  const tokenConfigs = [
    { token: "ETH", coingeckoId: "ethereum" },
    { token: "USDT", coingeckoId: "tether" },
  ];
  const [network, setNetwork] = useState<string>("base");
  const { tokens, loading } = useTokenPrices(tokenConfigs, {
    pollIntervalMs: 60_000,
    historyDays: 7,
  });

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden">
      {/* Full-page SVG grid background, pointer-events-none on the absolute container */}
      <div className="absolute inset-0 w-full h-full flex items-center justify-center z-0 pointer-events-none">
        <div className="w-[900px] h-[900px] opacity-60">
          <GridBg />
        </div>
      </div>

      <nav className="top-0 left-0 w-full flex items-center justify-between px-6 py-4 relative">
        <div className="flex items-center gap-6">
          <span className="font-bold text-lg text-indigo-700 font-[audiowide]">
            Fluxa
          </span>
          <ul
            className="flex gap-4 text-sm text-gray-700"
            aria-label="Main navigation"
          >
            <li>
              <a
                href="#"
                className="hover:text-indigo-600 font-medium font-[audiowide]"
              >
                Swap
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-indigo-600 font-[audiowide]">
                Liquidity
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-indigo-600 font-[audiowide]">
                Portfolio
              </a>
            </li>
          </ul>
        </div>
        <div className="flex items-center gap-3">
          <Web3LoginButton
            variant="navbar"
            size="md"
            network={network}
            setNetwork={setNetwork}
          />
          <button
            className="p-2 rounded hover:bg-gray-200 focus:outline-none cursor-pointer"
            aria-label="Open menu"
          >
            {/* Hamburger icon */}
            <svg
              width="22"
              height="22"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </svg>
          </button>
        </div>
      </nav>

      <main className="flex flex-col items-center justify-center w-full flex-1 pt-7 pb-8 relative">
        <h1 className="sr-only">Fluxa Finance - Swap</h1>
        <section
          className="w-full max-w-md bg-white/90 rounded-2xl shadow-xl p-6 flex flex-col items-center mb-6"
          aria-label="Swap section"
        >
          <SwapCard />
        </section>
        <section
          className="w-full max-w-md flex  justify-center items-stretch md:flex-row flex-col md:gap-4 gap-2"
          aria-label="Token summaries"
        >
          {tokens.map((t) => (
            <TokenSummaryCard
              key={t.token}
              token={t.token}
              price={t.price}
              change={t.change}
              priceSeries={t.priceSeries}
            />
          ))}
        </section>
        <div className="mt-8">
          <PriceMarquee />
        </div>
      </main>
      {/* Responsive: stack TokenSummaryCards vertically on small screens */}
      <style jsx>{`
        @media (max-width: 640px) {
          section[aria-label="Token summaries"] {
            flex-direction: column !important;
            gap: 0.5rem !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Landing;
