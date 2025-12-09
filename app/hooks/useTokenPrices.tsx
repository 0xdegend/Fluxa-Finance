"use client";
import { useEffect, useRef, useState } from "react";

export type TokenPriceItem = {
  token: string;
  coingeckoId: string;
  price: number;
  change: number;
  priceSeries: number[];
};

type TokenConfig = { token: string; coingeckoId: string };

function toHourKey(tsMs: number) {
  return new Date(tsMs).toISOString().slice(0, 13);
}

export function useTokenPrices(
  configs: TokenConfig[],
  opts?: {
    pollIntervalMs?: number;
    historyHours?: number; // number of hourly points to fetch (default 24)
    maxSeriesLength?: number;
  }
) {
  const pollIntervalMs = opts?.pollIntervalMs ?? 60_000;
  const historyHours = opts?.historyHours ?? 24;
  const maxSeriesLength = opts?.maxSeriesLength ?? historyHours;

  const [tokens, setTokens] = useState<TokenPriceItem[]>(
    configs.map((c) => ({
      token: c.token,
      coingeckoId: c.coingeckoId,
      price: 0,
      change: 0,
      priceSeries: Array(historyHours).fill(0),
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
        const nowSec = Math.floor(Date.now() / 1000);
        const fromSec = nowSec - historyHours * 60 * 60;

        const results = await Promise.all(
          configs.map(async (cfg) => {
            try {
              const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(
                cfg.coingeckoId
              )}/market_chart/range?vs_currency=usd&from=${fromSec}&to=${nowSec}`;
              const r = await fetch(url);
              if (!r.ok) throw new Error(`CG range error ${r.status}`);
              const json = await r.json();
              const rawPrices: [number, number][] = Array.isArray(json?.prices)
                ? json.prices.map((p: number[]) => [Number(p[0]), Number(p[1])])
                : [];
              const normalized = rawPrices?.map(([ts, price]) => {
                const tsMs = ts < 1_000_000_000_000 ? ts * 1000 : ts;
                return [tsMs, price] as [number, number];
              });

              // group by hour key and keep entries (we'll pick last entry per hour)
              const byHour = new Map<string, { ts: number; price: number }[]>();
              for (const [tsMs, price] of normalized) {
                const key = toHourKey(tsMs);
                const arr = byHour.get(key) ?? [];
                arr.push({ ts: tsMs, price });
                byHour.set(key, arr);
              }

              // build the series for the requested hours (oldest -> newest)
              const series: number[] = [];
              for (let i = historyHours - 1; i >= 0; i--) {
                const hourStartSec = nowSec - i * 60 * 60;
                const key = toHourKey(hourStartSec * 1000);
                const hourArr = byHour.get(key) ?? [];
                if (hourArr.length === 0) {
                  series.push(NaN);
                } else {
                  hourArr.sort((a, b) => a.ts - b.ts);
                  series.push(hourArr[hourArr.length - 1].price);
                }
              }

              // fill missing with carry-forward (left->right)
              for (let i = 0; i < series.length; i++) {
                if (!Number.isFinite(series[i])) {
                  let prev = i - 1;
                  while (prev >= 0 && !Number.isFinite(series[prev])) prev--;
                  if (prev >= 0) series[i] = series[prev];
                  else {
                    // find next finite
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

              const finalSeries = series.slice(-maxSeriesLength);
              const lastPrice =
                finalSeries.length > 0
                  ? finalSeries[finalSeries.length - 1]
                  : 0;

              return { cfg, series: finalSeries, lastPrice };
            } catch (err) {
              console.error("History fetch error for", cfg.coingeckoId, err);
              return { cfg, series: Array(historyHours).fill(0), lastPrice: 0 };
            }
          })
        );

        if (cancelled || !mountedRef.current) return;

        setTokens(
          configs?.map((c) => {
            const hit = results.find(
              (r) => r.cfg.coingeckoId === c.coingeckoId
            );
            const s = hit?.series ?? Array(historyHours).fill(0);
            const lastPrice =
              hit?.lastPrice ?? (s.length ? s[s.length - 1] : 0);

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
  }, [JSON.stringify(configs), historyHours]);

  // Polling: update realtime price and REPLACE last hour's value with live price
  useEffect(() => {
    let cancelled = false;

    async function pollOnce() {
      if (configs.length === 0) return;
      const ids = configs?.map((c) => c.coingeckoId).join(",");
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(
        ids
      )}&vs_currencies=usd&include_24hr_change=true`;
      try {
        const r = await fetch(url);
        if (!r.ok) throw new Error(`CoinGecko simple price ${r.status}`);
        const json = await r.json();
        if (cancelled || !mountedRef.current) return;

        setTokens((prev) =>
          prev?.map((t) => {
            const priceObj = json?.[t.coingeckoId];
            if (!priceObj) return t;
            const newPrice = Number(priceObj.usd ?? t.price ?? 0);
            const changePct = Number(priceObj.usd_24h_change ?? t.change ?? 0);

            // Replace the last hour's value with live price
            const prevSeries = Array.isArray(t.priceSeries)
              ? [...t.priceSeries]
              : Array(historyHours).fill(0);
            if (prevSeries.length === 0) {
              prevSeries.push(newPrice);
            } else {
              while (prevSeries.length < historyHours)
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

    pollOnce();
    pollRef.current = window.setInterval(() => {
      pollOnce();
    }, opts?.pollIntervalMs ?? pollIntervalMs) as unknown as number;

    return () => {
      cancelled = true;
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(configs), pollIntervalMs, maxSeriesLength, historyHours]);

  return { tokens, loading };
}
