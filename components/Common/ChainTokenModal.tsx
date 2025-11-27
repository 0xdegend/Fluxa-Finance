"use client";
import React, { useEffect, useState } from "react";
import TokenSearch from "./TokenSearch";
import { TokenInfo, ChainKey } from "@/types";
import Image from "next/image";

const CHAIN_META: { key: ChainKey; label: string }[] = [
  { key: "eth", label: "Ethereum" },
  { key: "base", label: "Base" },
  { key: "solana", label: "Solana" },
  { key: "arbitrum", label: "Arbitrum" },
  { key: "bsc", label: "BSC" },
  { key: "optimism", label: "Optimism" },
];

type LogoEntry =
  | { type: "url"; value: string }
  | { type: "svg"; value: string };

function tokensEqual(a: TokenInfo[] | undefined, b: TokenInfo[] | undefined) {
  if (a === b) return true;
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const aa = a[i];
    const bb = b[i];
    const aAddr = (aa?.address ?? "").toLowerCase();
    const bAddr = (bb?.address ?? "").toLowerCase();
    if (aa.chain !== bb.chain || aAddr !== bAddr) return false;
  }
  return true;
}

function normalizeRawLogo(raw?: unknown): LogoEntry | undefined {
  if (!raw) return undefined;
  if (typeof raw === "string") {
    const s = raw.trim();
    if (s.startsWith("<svg")) return { type: "svg", value: s };
    return { type: "url", value: s };
  }
  if (typeof raw === "object" && raw !== null) {
    const r = raw as Record<string, unknown>;
    if (typeof r.type === "string" && typeof r.value === "string") {
      const t = r.type === "svg" ? "svg" : "url";
      const v = String(r.value);
      if (t === "svg") return { type: "svg", value: v };
      return { type: "url", value: v };
    }

    if (typeof r.value === "string") {
      const s = r.value.trim();
      if (s.startsWith("<svg")) return { type: "svg", value: s };
      return { type: "url", value: s };
    }
  }
  return undefined;
}

function normalizeSvgForSizing(svg: string): string {
  try {
    const replaced = svg.replace(/<svg([^>]*)>/i, (match, attrs) => {
      let cleaned = String(attrs)
        .replace(/\s(width|height)=['"][^'"]*['"]/gi, "")

        .replace(/\s+xmlns(:[a-z]+)?=['"][^'"]*['"]/gi, (m) => m);

      if (!/preserveAspectRatio=/i.test(cleaned)) {
        cleaned += ` preserveAspectRatio="xMidYMid meet"`;
      }
      return `<svg${cleaned} width="100%" height="100%">`;
    });
    return replaced;
  } catch (e) {
    return svg;
  }
}

function renderLogoEntry(entryRaw: unknown, size = 18, alt = "") {
  const entry = normalizeRawLogo(entryRaw);
  const commonStyle: React.CSSProperties = {
    width: size,
    height: size,
    minWidth: size,
    minHeight: size,
    display: "inline-block",
    borderRadius: 999,
    overflow: "hidden",
  };

  if (!entry) {
    return (
      <span
        style={commonStyle}
        className="inline-block bg-slate-200"
        aria-hidden
      />
    );
  }

  if (entry.type === "url") {
    return (
      <Image
        src={entry.value}
        alt={alt}
        width={size}
        height={size}
        style={{ ...commonStyle, objectFit: "cover" as const }}
        className="inline-block"
      />
    );
  }
  const safeSvg = normalizeSvgForSizing(entry.value);
  return (
    <span
      style={commonStyle}
      className="inline-block"
      aria-hidden
      dangerouslySetInnerHTML={{ __html: safeSvg }}
    />
  );
}

function renderTokenLogo(logo?: string | null, symbol?: string, size = 28) {
  const entry = normalizeRawLogo(logo ?? undefined);
  const style: React.CSSProperties = {
    width: size,
    height: size,
    minWidth: size,
    minHeight: size,
    borderRadius: 999,
    overflow: "hidden",
    display: "inline-block",
  };

  if (!entry) {
    return (
      <div
        style={style}
        className="rounded-full bg-gray-200 flex items-center justify-center"
      >
        <span className="font-semibold text-sm">{symbol?.[0] ?? "—"}</span>
      </div>
    );
  }

  if (entry.type === "url") {
    return (
      <Image
        src={entry.value}
        alt={symbol ?? "token"}
        width={size}
        height={size}
        style={{ ...style, objectFit: "cover" as const }}
        className="rounded-full"
      />
    );
  }
  const safeSvg = normalizeSvgForSizing(entry.value);
  return (
    <span
      style={style}
      className="inline-block"
      aria-hidden
      dangerouslySetInnerHTML={{ __html: safeSvg }}
    />
  );
}
export default function ChainTokenModal({
  open,
  onClose,
  onConfirm,
  initialSelected = [],
  singleSelect = false,
  allowedTokens,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (tokens: TokenInfo[]) => void;
  initialSelected?: TokenInfo[];
  singleSelect?: boolean;
  allowedTokens?: TokenInfo[];
}) {
  const [activeChain, setActiveChain] = useState<ChainKey>(
    (initialSelected && initialSelected[0]?.chain) ?? "eth"
  );
  const [selectedTokens, setSelectedTokens] = useState<TokenInfo[]>(
    initialSelected ?? []
  );
  const [logos, setLogos] = useState<Record<string, LogoEntry | undefined>>({});
  const [loadingLogos, setLoadingLogos] = useState(false);

  // fetch logos from server-side cached endpoint
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      try {
        if (!cancelled) setLoadingLogos(true);

        const r = await fetch("/api/chain-logos", {
          signal: controller.signal,
        });
        if (!r.ok) {
          console.warn(
            "Failed to fetch /api/chain-logos",
            await r.text().catch(() => "")
          );
          return;
        }

        const json = await r.json();
        // json.logos might be:
        // { key: "url string" } or { key: { type:'url'|'svg', value: '...' } }
        // normalize into LogoEntry typed form
        const mapped: Record<string, LogoEntry | undefined> = {};
        for (const k of Object.keys(json.logos ?? {})) {
          const raw = json.logos[k];
          mapped[k] = normalizeRawLogo(raw);
        }
        if (!cancelled) setLogos(mapped);
      } catch (err: unknown) {
        if ((err as DOMException)?.name === "AbortError") {
          /* aborted */
        } else {
          console.warn("chain-logos fetch error", err);
        }
      } finally {
        if (!cancelled) setLoadingLogos(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const init = initialSelected ?? [];
    const newActive = (init[0]?.chain ?? "eth") as ChainKey;
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setSelectedTokens((prev) => (tokensEqual(prev, init) ? prev : init));
      setActiveChain((prev) => (prev === newActive ? prev : newActive));
    });
    return () => {
      cancelled = true;
    };
  }, [open, initialSelected]);

  function chooseChain(key: ChainKey) {
    setActiveChain(key);
  }

  function handleSelectToken(t: TokenInfo) {
    const tokenWithChain: TokenInfo = { ...t, chain: activeChain };
    const tAddr = (tokenWithChain.address ?? "").toLowerCase();
    const exists = selectedTokens.some(
      (st) =>
        st.chain === tokenWithChain.chain &&
        (st.address ?? "").toLowerCase() === tAddr
    );

    if (singleSelect) {
      onConfirm([tokenWithChain]);
      onClose();
      return;
    }

    if (!exists) setSelectedTokens((s) => [...s, tokenWithChain]);
  }

  function removeToken(t: TokenInfo) {
    const addr = (t.address ?? "").toLowerCase();
    setSelectedTokens((s) =>
      s.filter(
        (x) =>
          !(x.chain === t.chain && (x.address ?? "").toLowerCase() === addr)
      )
    );
  }

  const allowedForActive = allowedTokens
    ? allowedTokens.filter((a) => a.chain === activeChain)
    : undefined;

  function renderChainButton(c: { key: ChainKey; label: string }) {
    const entry = logos[c.key];
    const isActive = activeChain === c.key;
    return (
      <button
        key={c.key}
        onClick={() => chooseChain(c.key)}
        className={`px-3 py-2  cursor-pointer rounded flex items-center gap-2 focus:outline-none ${
          isActive ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-800"
        }`}
        aria-pressed={isActive}
        aria-label={c.label}
      >
        {loadingLogos ? (
          <span className="w-5 h-5 rounded-full inline-block bg-slate-200 animate-pulse" />
        ) : (
          <>
            {renderLogoEntry(entry, 18, c.label)}
            <span className="text-xs">{c.label}</span>
          </>
        )}
      </button>
    );
  }

  return open ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative bg-white rounded-lg shadow max-w-2xl w-full p-6 font-[audiowide] z-10">
        <h3 className="text-lg font-semibold mb-3">Select Chains & Tokens</h3>

        <div className="mb-3">
          <div className="flex flex-wrap gap-2 ">
            {CHAIN_META.map((c) => renderChainButton(c))}
          </div>
        </div>

        <div className={singleSelect ? "mb-8" : "grid grid-cols-2 gap-4"}>
          <div>
            <div className="text-sm text-gray-600 mb-2 mt-5">Search tokens</div>
            <div className="mb-4">
              <TokenSearch
                chain={activeChain}
                onSelect={(t) => handleSelectToken(t)}
                // @ts-expect-error allowedTokens typing may differ
                allowedTokens={allowedForActive}
              />
            </div>
          </div>

          {!singleSelect && (
            <div>
              <div className="text-sm text-gray-600 mb-2">Selected tokens</div>
              <ul className="space-y-2">
                {selectedTokens.map((t, idx) => {
                  const key = `${t.chain}-${t.address ?? t.symbol ?? idx}`;
                  return (
                    <li
                      key={key}
                      className="flex items-center gap-3 p-2 border rounded"
                    >
                      {renderTokenLogo(t.logo ?? null, t.symbol)}
                      <div>
                        <div className="font-medium">{t.symbol}</div>
                        <div className="text-xs text-gray-500">
                          {t.name || t.address}
                        </div>
                      </div>

                      <div className="ml-auto text-xs text-gray-400">
                        {t.chain}
                      </div>
                      <button
                        onClick={() => removeToken(t)}
                        className="ml-2 text-xs text-red-500"
                      >
                        Remove
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="cursor-pointer px-4 py-2 rounded bg-slate-100"
          >
            Cancel
          </button>
          {!singleSelect && (
            <button
              onClick={() => onConfirm(selectedTokens)}
              className="px-4 py-2 rounded bg-indigo-600 text-white"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  ) : null;
}
