// hooks/useTokenPrices.ts
"use client";
import { useEffect, useRef, useState } from "react";

export type TokenPriceItem = {
  token: string;
  coingeckoId: string;
  price: number;
  change: number;
  priceSeries: number[]; // one value per day, oldest -> newest (length === historyDays)
  lastUpdate: number | null;
};

type TokenConfig = { token: string; coingeckoId: string };

function toDayKey(tsMs: number) {
  // YYYY-MM-DD
  return new Date(tsMs).toISOString().slice(0, 10);
}

export function useTokenPrices(
  configs: TokenConfig[],
  opts?: {
    pollIntervalMs?: number;
    historyDays?: number;
    maxSeriesLength?: number;
  }
) {
  const pollIntervalMs = opts?.pollIntervalMs ?? 60_000;
  const historyDays = opts?.historyDays ?? 7;
  const maxSeriesLength = opts?.maxSeriesLength ?? historyDays; // we want daily series

  const [tokens, setTokens] = useState<TokenPriceItem[]>(
    configs.map((c) => ({
      token: c.token,
      coingeckoId: c.coingeckoId,
      price: 0,
      change: 0,
      priceSeries: Array(historyDays).fill(0),
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

  // fetch HISTORICAL range (explicit from -> to) and build one price per day
  useEffect(() => {
    let cancelled = false;

    async function fetchHistoryForAll() {
      setLoading(true);
      try {
        const nowSec = Math.floor(Date.now() / 1000);
        const fromSec = nowSec - historyDays * 24 * 60 * 60;

        const results = await Promise.all(
          configs.map(async (cfg) => {
            try {
              const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(
                cfg.coingeckoId
              )}/market_chart/range?vs_currency=usd&from=${fromSec}&to=${nowSec}`;
              const r = await fetch(url);
              if (!r.ok) throw new Error(`CG range error ${r.status}`);
              const json = await r.json();
              // json.prices = [[timestamp, price], ...] where timestamp is ms (usually)
              const rawPrices: [number, number][] = Array.isArray(json?.prices)
                ? json.prices.map((p: number[]) => [Number(p[0]), Number(p[1])])
                : [];

              // Normalize timestamps to ms (sometimes they're in seconds)
              const normalized = rawPrices.map(([ts, price]) => {
                const tsMs = ts < 1_000_000_000_000 ? ts * 1000 : ts;
                return [tsMs, price] as [number, number];
              });

              // group by day and pick the last price for each day
              const byDay = new Map<string, { ts: number; price: number }[]>();
              for (const [tsMs, price] of normalized) {
                const key = toDayKey(tsMs);
                const arr = byDay.get(key) ?? [];
                arr.push({ ts: tsMs, price });
                byDay.set(key, arr);
              }

              // build the list for the requested days (oldest -> newest)
              const series: number[] = [];
              for (let i = historyDays - 1; i >= 0; i--) {
                const dayStartSec = nowSec - i * 24 * 60 * 60;
                const key = toDayKey(dayStartSec * 1000);
                const dayArr = byDay.get(key) ?? [];
                if (dayArr.length === 0) {
                  // no data for the day — we will fill with null placeholder and fix later
                  series.push(NaN);
                } else {
                  // pick the entry with greatest timestamp (last price of that day)
                  dayArr.sort((a, b) => a.ts - b.ts);
                  series.push(dayArr[dayArr.length - 1].price);
                }
              }

              // fill missing spots (NaN) by carrying forward previous known value (left->right)
              for (let i = 0; i < series.length; i++) {
                if (!Number.isFinite(series[i])) {
                  // find nearest previous finite
                  let prev = i - 1;
                  while (prev >= 0 && !Number.isFinite(series[prev])) prev--;
                  if (prev >= 0) series[i] = series[prev];
                  else {
                    // no previous, find next finite
                    let next = i + 1;
                    while (
                      next < series.length &&
                      !Number.isFinite(series[next])
                    )
                      next++;
                    series[i] =
                      next < series.length && Number.isFinite(series[next])
                        ? series[next]
                        : 0;
                  }
                }
              }

              // ensure length == historyDays; trim if necessary
              const finalSeries = series.slice(-maxSeriesLength);

              // set lastPrice (today) to last value (if available)
              const lastPrice = finalSeries.length
                ? finalSeries[finalSeries.length - 1]
                : 0;

              return { cfg, series: finalSeries, lastPrice };
            } catch (err) {
              console.error("History fetch error for", cfg.coingeckoId, err);
              return { cfg, series: Array(historyDays).fill(0), lastPrice: 0 };
            }
          })
        );

        if (cancelled || !mountedRef.current) return;

        setTokens(
          configs.map((c) => {
            const hit = results.find(
              (r) => r.cfg.coingeckoId === c.coingeckoId
            );
            const s = hit?.series ?? Array(historyDays).fill(0);
            const lastPrice =
              hit?.lastPrice ?? (s.length ? s[s.length - 1] : 0);

            // compute change using last two days if available
            let change = 0;
            if (s.length >= 2) {
              const a = s[s.length - 2];
              const b = s[s.length - 1];
              change = a ? ((b - a) / Math.abs(a)) * 100 : 0;
            }

            return {
              token: c.token,
              coingeckoId: c.coingeckoId,
              price: lastPrice,
              change: Number(change.toFixed(2)),
              priceSeries: s,
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

  // Polling: update realtime price and REPLACE last day's value with live price
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

            // Replace the last day's value (today) with the live price
            const prevSeries = Array.isArray(t.priceSeries)
              ? [...t.priceSeries]
              : Array(historyDays).fill(0);
            if (prevSeries.length === 0) {
              prevSeries.push(newPrice);
            } else {
              // ensure length matches historyDays (pad left if shorter)
              while (prevSeries.length < historyDays)
                prevSeries.unshift(prevSeries[0] ?? 0);
              prevSeries[prevSeries.length - 1] = newPrice;
            }

            const newSeries = prevSeries.slice(-maxSeriesLength);

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

    // initial immediate poll
    pollOnce();
    pollRef.current = window.setInterval(() => {
      pollOnce();
    }, opts?.pollIntervalMs ?? pollIntervalMs) as unknown as number;

    return () => {
      cancelled = true;
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(configs), pollIntervalMs, maxSeriesLength, historyDays]);

  return { tokens, loading };
}
