"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { debounce } from "lodash";
import { TokenInfo } from "@/app/types";
import Image from "next/image";
import Lottie from "lottie-react";
import loadingAnimation from "../../../public/lottie/loading.json";

export default function TokenSearch({
  chain,
  onSelect,
}: {
  chain: string;
  onSelect: (t: TokenInfo) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<TokenInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setQ("");
    setResults([]);
    setRateLimited(false);
    setErrMsg(null);
  }, [chain]);

  const makeCompositeKey = (t: TokenInfo) => {
    const chainPart = String(t.chain ?? chain ?? "unknown")
      .toLowerCase()
      .trim();
    const symbolPart = String(t.symbol ?? "")
      .toLowerCase()
      .trim();
    const namePart = String(t.name ?? "")
      .toLowerCase()
      .trim();
    const logoPart = String(t.logo ?? "").trim();
    return `${chainPart}:${symbolPart}:${namePart}:${logoPart}`;
  };

  const search = useCallback(
    debounce(async (value: string, currentChain: string) => {
      setErrMsg(null);
      setRateLimited(false);

      if (!value || value.trim().length < 2) {
        setResults([]);
        setLoading(false);
        return;
      }
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();
      const signal = abortRef.current.signal;

      setLoading(true);
      try {
        const url = `/api/relay/token-search?chain=${encodeURIComponent(
          currentChain,
        )}&q=${encodeURIComponent(value)}`;
        const res = await fetch(url, { signal });

        if (!res.ok) {
          if (res.status === 429) {
            setRateLimited(true);
            setResults([]);
            return;
          }
          let text: string | null = null;
          try {
            const j = await res.json();
            text = j?.message ?? JSON.stringify(j);
          } catch {
            try {
              text = await res.text();
            } catch {
              text = `HTTP ${res.status}`;
            }
          }
          setErrMsg(`Search failed: ${text}`);
          setResults([]);
          return;
        }

        const json = await res.json();

        let arr: TokenInfo[] = [];
        if (Array.isArray(json)) arr = json;
        else if (Array.isArray(json.tokens)) arr = json.tokens;
        else if (Array.isArray(json.results)) arr = json.results;
        else if (Array.isArray(json.data)) arr = json.data;
        else if (json && typeof json === "object") {
          const maybeArray = Object.values(json).filter(
            (v) => v && typeof v === "object",
          );
          if (maybeArray.length > 0) arr = maybeArray as TokenInfo[];
        }

        const dedupeMap = new Map<string, TokenInfo>();
        for (const t of arr) {
          const key = makeCompositeKey(t);
          if (!dedupeMap.has(key)) dedupeMap.set(key, t);
        }
        setResults(Array.from(dedupeMap.values()));
      } catch (err: unknown) {
        // @ts-expect-error simple check
        if (err?.name === "AbortError") return;
        console.error("search error", err);
        setErrMsg("Network error");
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 600),
    [],
  );
  useEffect(() => {
    search(q, chain);
    return () => search.cancel();
  }, [q, chain, search]);

  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  return (
    <div>
      <input
        placeholder="Search token name, symbol or paste contract"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="w-full p-2 border rounded"
      />

      <div className="mt-2 max-h-56 overflow-auto">
        {loading ? (
          <div role="status" aria-live="polite">
            <div className="w-[40%] h-60">
              <Lottie animationData={loadingAnimation} loop autoplay />
            </div>
          </div>
        ) : rateLimited ? (
          <div className="p-2 text-sm text-yellow-600">
            Rate limited. Please wait a moment and try again.
          </div>
        ) : errMsg ? (
          <div className="p-2 text-sm text-red-600">Error: {errMsg}</div>
        ) : results.length === 0 && q.trim().length >= 2 ? (
          <div className="p-2 text-sm text-gray-500">No results</div>
        ) : null}

        {!loading &&
          results.map((r) => {
            const key = makeCompositeKey(r);
            return (
              <div
                key={key}
                className="flex items-center gap-3 p-2 cursor-pointer hover:bg-slate-50"
                onClick={() => onSelect(r)}
              >
                {r.logo ? (
                  <Image
                    src={r.logo}
                    width={28}
                    height={28}
                    className="rounded-full"
                    alt={r.symbol}
                    unoptimized
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center">
                    {r.symbol?.[0] ?? "—"}
                  </div>
                )}
                <div>
                  <div className="font-medium">{r.symbol}</div>
                  <div className="text-xs text-gray-500">
                    {r.name || r.address}
                  </div>
                </div>
                <div className="ml-auto text-xs text-gray-400">{r.chain}</div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
