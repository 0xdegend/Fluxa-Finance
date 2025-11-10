"use client";
import React from "react";
import TokenSummaryCard from "../Swap/TokenSummaryCard";
import SwapCard from "../Swap/SwapCard";
import GridBg from "../Common/GridBg";
import PriceMarquee from "../Common/PriceMarquee";

// Placeholder token data and price series
const tokens = [
  {
    token: "ETH",
    price: 2012.34,
    change: 2.13,
    priceSeries: [2000, 2005, 2010, 2008, 2012, 2011, 2012.34],
  },
  {
    token: "USDC",
    price: 1.0,
    change: 0.01,
    priceSeries: [1, 1, 1, 1, 1, 1, 1],
  },
];

// Async Next.js page component
const Landing: React.FC = () => {
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
          <button
            className="px-4 py-2 rounded-md bg-(--fluxa-accent) hover:bg-(--fluxa-accent-600) hover:text-white cursor-pointer text-white font-[audiowide] "
            aria-label="Connect wallet "
          >
            Connect Wallet
          </button>
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

      <main className="flex flex-col items-center justify-center w-full flex-1 pt-24 pb-8 relative">
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
          {/* TokenSummaryCards: replace placeholder data with real web3 data */}
          {tokens.map((t) => (
            <TokenSummaryCard key={t.token} {...t} />
          ))}
        </section>
        <PriceMarquee />
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
