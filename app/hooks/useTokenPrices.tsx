// hooks/useTokenPrices.ts
"use client";
import { useEffect, useRef, useState } from "react";

export type TokenPriceItem = {
  token: string; // "ETH"
  coingeckoId: string; // "ethereum"
  price: number; // current USD price
  change: number; // 24h change in percent (e.g. 2.13)
  priceSeries: number[]; // historical points, oldest -> newest
  lastUpdate: number | null; // epoch ms of last update
};

type TokenConfig = { token: string; coingeckoId: string };

export function useTokenPrices(
  configs: TokenConfig[],
  opts?: {
    pollIntervalMs?: number;
    historyDays?: number;
    maxSeriesLength?: number;
  }
) {
  const pollIntervalMs = opts?.pollIntervalMs ?? 60_000; // default 1 minute
  const historyDays = opts?.historyDays ?? 7;
  const maxSeriesLength = opts?.maxSeriesLength ?? 100;

  const [tokens, setTokens] = useState<TokenPriceItem[]>(
    configs.map((c) => ({
      token: c.token,
      coingeckoId: c.coingeckoId,
      price: 0,
      change: 0,
      priceSeries: [],
      lastUpdate: null,
    }))
  );
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  useEffect(() => {
    let cancelled = false;
    async function fetchHistoryForAll() {
      setLoading(true);
      try {
        const results = await Promise.all(
          configs.map(async (cfg) => {
            try {
              const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(
                cfg.coingeckoId
              )}/market_chart?vs_currency=usd&days=${historyDays}&interval=daily&precision=full`;
              const r = await fetch(url);
              if (!r.ok) throw new Error(`CG error ${r.status}`);
              const json = await r.json();
              // json.prices is array of [timestamp, price]
              const prices: number[] =
                Array.isArray(json?.prices) && json.prices.length > 0
                  ? json.prices.map((p: number[]) => Number(p[1]))
                  : [];
              return { cfg, prices };
            } catch (err) {
              console.error("History fetch error for", cfg.coingeckoId, err);
              return { cfg, prices: [] as number[] };
            }
          })
        );

        if (cancelled || !mountedRef.current) return;

        // Merge into tokens
        setTokens((prev) =>
          configs.map((c) => {
            const hit = results.find(
              (r) => r.cfg.coingeckoId === c.coingeckoId
            );
            const initialSeries = hit?.prices ?? [];
            const lastPrice =
              initialSeries.length > 0
                ? initialSeries[initialSeries.length - 1]
                : 0;
            // initial change: difference between last two points if available
            let change = 0;
            if (initialSeries.length >= 2) {
              const a = initialSeries[initialSeries.length - 2];
              const b = initialSeries[initialSeries.length - 1];
              change = a ? ((b - a) / Math.abs(a)) * 100 : 0;
            }
            return {
              token: c.token,
              coingeckoId: c.coingeckoId,
              price: lastPrice,
              change: Number(change.toFixed(2)),
              priceSeries: initialSeries.slice(-maxSeriesLength),
              lastUpdate: Date.now(),
            } as TokenPriceItem;
          })
        );
      } catch (err) {
        console.error("Failed fetching histories", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchHistoryForAll();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(configs), historyDays]);
  useEffect(() => {
    let cancelled = false;

    async function pollOnce() {
      if (configs.length === 0) return;
      const ids = configs.map((c) => c.coingeckoId).join(",");
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(
        ids
      )}&vs_currencies=usd&include_24hr_change=true`;
      try {
        const r = await fetch(url);
        if (!r.ok) throw new Error(`CoinGecko simple price ${r.status}`);
        const json = await r.json();
        if (cancelled || !mountedRef.current) return;

        setTokens((prev) =>
          prev.map((t) => {
            const priceObj = json?.[t.coingeckoId];
            if (!priceObj) return t;
            const newPrice = Number(priceObj.usd ?? t.price ?? 0);
            const changePct = Number(priceObj.usd_24h_change ?? t.change ?? 0);
            // push into priceSeries (sliding window)
            const newSeries = [...t.priceSeries, newPrice].slice(
              -maxSeriesLength
            );
            return {
              ...t,
              price: newPrice,
              change: Number(changePct.toFixed(2)),
              priceSeries: newSeries,
              lastUpdate: Date.now(),
            };
          })
        );
      } catch (err) {
        console.error("Poll price error", err);
      }
    }
    pollOnce();
    pollRef.current = window.setInterval(() => {
      pollOnce();
    }, opts?.pollIntervalMs ?? pollIntervalMs) as unknown as number;

    return () => {
      cancelled = true;
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(configs), pollIntervalMs, maxSeriesLength]);

  return { tokens, loading };
}
