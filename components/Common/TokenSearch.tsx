// components/TokenSearch.tsx
"use client";
import React, { useEffect, useState } from "react";
import { debounce } from "lodash";
import { TokenInfo } from "@/types";
import Image from "next/image";

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

  useEffect(() => {
    const fn = debounce(async (value: string) => {
      if (!value) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const url = `/api/relay/token-search?chain=${encodeURIComponent(
          chain
        )}&q=${encodeURIComponent(value)}`;
        const r = await fetch(url);
        const json = await r.json();
        setResults(json || []);
      } catch (err) {
        console.error("search error", err);
      } finally {
        setLoading(false);
      }
    }, 300);

    fn(q);
    return () => fn.cancel();
  }, [q, chain]);

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
          <div>Searching…</div>
        ) : results.length === 0 ? (
          <div>No results</div>
        ) : (
          results?.map((r) => (
            <div
              key={`${r.logo}-${r.symbol}`}
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
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center">
                  {r.symbol?.[0]}
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
          ))
        )}
      </div>
    </div>
  );
}
