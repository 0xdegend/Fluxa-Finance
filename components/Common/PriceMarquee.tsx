"use client";
import React, { useEffect, useRef, useState } from "react";
import { DEFAULT_ASSETS } from "@/data";
import Image from "next/image";

function formatPrice(n?: number) {
  if (n === undefined || n === null) return "—";
  if (n >= 1) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return n.toPrecision(4);
}

type Asset = { id: string; symbol: string };

export default function PriceMarquee({
  assets = DEFAULT_ASSETS,
}: {
  assets?: Asset[];
}) {
  const [tickers, setTickers] = useState<
    Record<
      string,
      {
        id: string;
        symbol: string;
        price?: number;
        change24h?: number;
        logo?: string;
      }
    >
  >(() =>
    Object.fromEntries(
      assets.map((a) => [
        a.id,
        {
          id: a.id,
          symbol: a.symbol,
          price: undefined,
          change24h: undefined,
          logo: undefined,
        },
      ])
    )
  );

  const wsRef = useRef<WebSocket | null>(null);
  const pendingRef = useRef<Record<string, number>>({});
  const rafRef = useRef<number | null>(null);

  const flushPending = () => {
    const pending = pendingRef.current;
    if (Object.keys(pending).length === 0) return;
    setTickers((prev) => {
      const copy = { ...prev };
      for (const id in pending) {
        copy[id] = {
          ...(copy[id] || { id, symbol: id.toUpperCase() }),
          price: pending[id],
          logo: copy[id]?.logo,
          change24h: copy[id]?.change24h,
        };
      }
      return copy;
    });
    pendingRef.current = {};
  };

  useEffect(() => {
    const assetStr = assets.map((a) => a.id).join(",");
    const url = `wss://ws.coincap.io/prices?assets=${assetStr}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("CoinCap WS open", url);
    };

    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);

        for (const [key, val] of Object.entries<number>(
          data as Record<string, number>
        )) {
          pendingRef.current[key] = Number(val);
        }

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
      setTimeout(() => {
        if (wsRef.current === ws) {
          wsRef.current = null;
        }
      }, 2000);
    };

    ws.onerror = (err) => {
      console.error("CoinCap WS error", err);
      try {
        ws.close();
      } catch {}
    };

    return () => {
      try {
        ws.close();
      } catch {}
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [assets]);

  useEffect(() => {
    let active = true;
    async function fetchMarketMeta() {
      try {
        const ids = assets.map((a) => a.id).join(",");
        if (!ids) return;
        const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${encodeURIComponent(
          ids
        )}&order=market_cap_desc&per_page=${
          assets.length
        }&page=1&sparkline=false&price_change_percentage=24h`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`CoinGecko metadata ${res.status}`);
        const arr = (await res.json()) as Array<{
          id: string;
          image?: string;
          current_price?: number;
          price_change_percentage_24h?: number;
        }>;
        if (!active) return;
        setTickers((prev) => {
          const copy = { ...prev };
          for (const entry of arr) {
            const id = entry.id;
            copy[id] = {
              ...(copy[id] || { id, symbol: id.toUpperCase() }),
              logo: entry.image ?? copy[id]?.logo,
              price:
                typeof entry.current_price === "number"
                  ? entry.current_price
                  : copy[id]?.price,
              change24h:
                typeof entry.price_change_percentage_24h === "number"
                  ? entry.price_change_percentage_24h
                  : copy[id]?.change24h,
            };
          }
          return copy;
        });
      } catch (err) {
        console.warn("CoinGecko metadata error", err);
      }
    }

    fetchMarketMeta();
    const id = setInterval(fetchMarketMeta, 60_000);
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
      logo: t.logo,
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
          gap: 12,
          padding: "12px 16px",
          animation: "marquee 60s linear infinite",
          alignItems: "center",
        }}
        className="text-sm font-medium"
        onMouseDown={(e) => e.preventDefault()}
      >
        {items.concat(items).map((it, i) => (
          <div
            key={`${it.id}-${i}`}
            className="flex items-center gap-3 min-w-60"
          >
            {it.logo ? (
              <Image
                src={it.logo}
                alt={`${it.symbol} logo`}
                width={20}
                height={20}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 6,
                  objectFit: "cover",
                }}
              />
            ) : (
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 6,
                  display: "grid",
                  placeItems: "center",
                  background: "#111827",
                  color: "white",
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                {it.symbol?.slice(0, 2).toUpperCase()}
              </div>
            )}

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
              className={`ml-2 text-xs font-semibold font-[audiowide]`}
              style={{
                color:
                  it.change == null
                    ? undefined
                    : it.change >= 0
                    ? "#00c7ff"
                    : "var(--fluxa-danger)",
              }}
            >
              {it.change == null
                ? "—"
                : `${it.change >= 0 ? "+" : ""}${it.change.toFixed(2)}%`}
            </div>
          </div>
        ))}
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
        /* pause on hover for the marquee container */
        div:hover > div {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
