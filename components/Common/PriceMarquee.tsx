"use client";
import React, { useEffect, useRef, useState } from "react";
import type { Ticker } from "@/types";
import { DEFAULT_ASSETS } from "@/data";

function formatPrice(n?: number) {
  if (n === undefined || n === null) return "—";
  if (n >= 1) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return n.toPrecision(4);
}

export default function PriceMarquee({
  assets = DEFAULT_ASSETS,
}: {
  assets?: { id: string; symbol: string }[];
}) {
  const [tickers, setTickers] = useState<Record<string, Ticker>>(() =>
    Object.fromEntries(
      assets.map((a) => [a.id, { id: a.id, symbol: a.symbol }])
    )
  );

  const wsRef = useRef<WebSocket | null>(null);
  const pendingRef = useRef<Record<string, number>>({});
  const rafRef = useRef<number | null>(null);

  // Tick: batch UI updates to once-per-animation-frame
  const flushPending = () => {
    const pending = pendingRef.current;
    if (Object.keys(pending).length === 0) return;
    setTickers((prev) => {
      const copy = { ...prev };
      const now = Date.now();
      for (const id in pending) {
        copy[id] = {
          ...(copy[id] || { id, symbol: id.toUpperCase() }),
          price: pending[id],
          updatedAt: now,
          change24h: copy[id]?.change24h,
        };
      }
      return copy;
    });
    pendingRef.current = {};
  };

  useEffect(() => {
    // Build CoinCap ws endpoint - assets comma separated by symbol name (coincap uses asset *names* e.g. bitcoin,ethereum)
    const assetStr = assets.map((a) => a.id).join(",");
    const url = `wss://ws.coincap.io/prices?assets=${assetStr}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      // nothing required for CoinCap, it sends on connect
      console.log("CoinCap WS open", url);
    };

    ws.onmessage = (ev) => {
      // CoinCap sends payload like: {"bitcoin":"61000.23"} or {"ethereum":"4200.1"}
      try {
        const data = JSON.parse(ev.data);
        // batch updates
        for (const [key, val] of Object.entries<number>(
          data as Record<string, number>
        )) {
          pendingRef.current[key] = Number(val);
        }
        // schedule flush
        if (rafRef.current == null) {
          rafRef.current = requestAnimationFrame(() => {
            flushPending();
            rafRef.current = null;
          });
        }
      } catch (err) {
        console.warn("WS parse error", err);
      }
    };

    ws.onclose = (e) => {
      console.warn("CoinCap WS closed", e);
      // try reconnect in 2s - simple retry (improve with backoff in prod)
      setTimeout(() => {
        if (wsRef.current === ws) {
          wsRef.current = null;
          // re-run effect by creating new WebSocket - easiest is to reload component or implement backoff loop
          // (here we'll just log; you can add a reconnect function)
        }
      }, 2000);
    };

    ws.onerror = (err) => {
      console.error("CoinCap WS error", err);
      ws.close();
    };

    return () => {
      ws.close();
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [assets]);

  // Periodically fetch metadata (24h change) via CoinGecko REST
  useEffect(() => {
    let active = true;
    const fetchMeta = async () => {
      try {
        const ids = assets.map((a) => a.id).join(",");
        const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("CoinGecko fetch failed");
        const json = await res.json();

        if (!active) return;
        setTickers((prev) => {
          const copy = { ...prev };
          for (const id of Object.keys(json)) {
            const entry = json[id];
            const change =
              entry?.usd_24h_change ?? entry?.usd_24h_change_percent ?? null;
            // Set price (usd) and change24h
            if (copy[id])
              copy[id] = {
                ...copy[id],
                price:
                  typeof entry?.usd === "number" ? entry.usd : copy[id].price,
                change24h:
                  typeof change === "number" ? change : copy[id].change24h,
              };
            else
              copy[id] = {
                id,
                symbol: id.toUpperCase(),
                price: typeof entry?.usd === "number" ? entry.usd : undefined,
                change24h: typeof change === "number" ? change : undefined,
              };
          }
          return copy;
        });
      } catch (e) {
        console.warn("CoinGecko metadata error", e);
      }
    };
    fetchMeta();
    // refresh every 30s (tune as appropriate)
    const id = setInterval(fetchMeta, 30_000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [assets]);

  const items = assets.map((a) => {
    const t = tickers[a.id] || { id: a.id, symbol: a.symbol };
    return {
      id: a.id,
      symbol: a.symbol,
      price: t.price,
      change: t.change24h,
    };
  });

  return (
    <div
      aria-live="polite"
      className="w-full overflow-hidden bg-[(--fluxa-glass-dark)]"
    >
      <div
        style={{
          display: "inline-flex",
          whiteSpace: "nowrap",
          gap: "10px",
          padding: "12px 16px",
          animation: "marquee 18s linear infinite",
        }}
        // pause on hover / focus using CSS :hover is more robust; you can add JS pause if you prefer
        className="text-sm font-medium"
      >
        {items.concat(items).map(
          (
            it,
            i // duplicate list so marquee loops
          ) => (
            <div
              key={`${it.id}-${i}`}
              className="flex items-center gap-3 min-w-[220px]"
            >
              <div className="font-semibold mr-1 font-[audiowide]">
                {it.symbol}
              </div>
              <div className="text-[(--fluxa-muted)] font-[audiowide]">
                {it.price === undefined ? (
                  <span className="animate-pulse">...</span>
                ) : (
                  formatPrice(it.price)
                )}
              </div>
              <div
                className={`ml-2 text-xs font-semibold font-[audiowide] ${
                  it.change && it.change >= 0
                    ? "text-[#00c7ff]"
                    : "text-[#ffd166]"
                }`}
              >
                {it.change == null
                  ? "—"
                  : `${it.change >= 0 ? "+" : ""}${it.change.toFixed(2)}%`}
              </div>
            </div>
          )
        )}
      </div>

      <style jsx>{`
        @keyframes marquee {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          } /* because items duplicated */
        }
        /* pause on hover */
        div:hover > div {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
