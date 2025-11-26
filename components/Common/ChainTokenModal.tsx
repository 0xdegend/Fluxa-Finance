// components/ChainTokenModal.tsx
"use client";
import React, { useEffect, useState } from "react";
import TokenSearch from "./TokenSearch";
import { TokenInfo, ChainKey } from "@/types";
import Image from "next/image";

const ALL_CHAINS: { key: ChainKey; label: string }[] = [
  { key: "eth", label: "Ethereum" },
  { key: "polygon", label: "Polygon" },
  { key: "base", label: "Base" },
  { key: "arbitrum", label: "Arbitrum" },
  { key: "bsc", label: "BSC" },
  { key: "optimism", label: "Optimism" },
];

function tokensEqual(a: TokenInfo[], b: TokenInfo[]) {
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

  // keep internal selection in sync when modal opens/initialSelected changes (deferred)
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

  /**
   * Handle a token selection from TokenSearch.
   * - If singleSelect: immediately confirm and close the modal (auto-close behavior).
   * - Otherwise: add to selectedTokens (deduped).
   */
  function handleSelectToken(t: TokenInfo) {
    const tokenWithChain = { ...t, chain: activeChain };
    const tAddr = (tokenWithChain.address ?? "").toLowerCase();
    const exists = selectedTokens.some(
      (st) =>
        st.chain === tokenWithChain.chain &&
        (st.address ?? "").toLowerCase() === tAddr
    );

    if (singleSelect) {
      // Immediately confirm picked token and close the modal
      onConfirm([tokenWithChain]);
      onClose();
      return;
    }

    if (!exists) {
      setSelectedTokens((s) => [...s, tokenWithChain]);
    }
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

  return open ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow max-w-2xl w-full p-4">
        <h3 className="text-lg font-semibold mb-3">Select Chains & Tokens</h3>

        <div className="mb-3">
          <div className="flex flex-wrap gap-2">
            {ALL_CHAINS.map((c) => (
              <button
                key={c.key}
                onClick={() => chooseChain(c.key)}
                className={`px-3 py-1 rounded ${
                  activeChain === c.key
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100"
                }`}
                aria-pressed={activeChain === c.key}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* singleSelect => full-width search, hide selected tokens UI */}
        <div className={singleSelect ? "mb-4" : "grid grid-cols-2 gap-4"}>
          <div className={singleSelect ? "" : ""}>
            <div className="text-sm text-gray-600 mb-2">Search tokens</div>

            <div className="mb-4">
              <div className="font-semibold mb-2">{activeChain}</div>

              <TokenSearch
                chain={activeChain}
                onSelect={(t) => handleSelectToken(t)}
                //@ts-expect-error acceptable if TokenSearch typing differs
                allowedTokens={allowedForActive}
              />
            </div>
          </div>

          {/* show selected tokens only for multi-select flows */}
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
                      {t.logo ? (
                        <Image
                          src={t.logo}
                          alt={t.symbol}
                          width={28}
                          height={28}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center">
                          {t.symbol?.[0] ?? "—"}
                        </div>
                      )}
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

        {/* footer */}
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded bg-slate-100">
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
