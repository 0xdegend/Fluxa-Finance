// components/NetworkDropdown.tsx
"use client";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import type { NetworkOption } from "@/types";
import { DEFAULT_NETWORKS } from "@/data";
import type { NetworkDropdownProps } from "@/types";
import Image from "next/image";
import { CHAIN_META } from "@/data";

type LogoEntry =
  | { type: "url"; value: string }
  | { type: "svg"; value: string };

export default function NetworkDropdown({
  current,
  onChange,
  networks = DEFAULT_NETWORKS,
  size = "sm",
  className = "",
}: NetworkDropdownProps) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [portalEl, setPortalEl] = useState<HTMLElement | null>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const allowedKeys = new Set(networks.map((n) => n.key));

  // index CHAIN_META by key
  const metaByKey = Object.fromEntries(CHAIN_META.map((m) => [m.key, m]));

  const allowedFromMeta = CHAIN_META.filter((m) => allowedKeys.has(m.key)).map(
    (m) => ({
      key: m.key,
      label: m.label,
    })
  ) as NetworkOption[];

  const extras = networks
    .filter((n) => !metaByKey[n.key])
    .map((n) => ({ key: n.key, label: n.label })) as NetworkOption[];

  let shownNetworks = allowedFromMeta.concat(extras);

  if (shownNetworks.length === 0) {
    shownNetworks = CHAIN_META.map((m) => ({
      key: m.key,
      label: m.label,
    })) as NetworkOption[];
  }

  if (!shownNetworks.some((n) => n.key === current)) {
    shownNetworks = [{ key: current, label: current }, ...shownNetworks];
  }

  const currentOption =
    shownNetworks.find((n) => n.key === current) ?? shownNetworks[0];

  const logos = Object.fromEntries(
    CHAIN_META.map((m) => [
      m.key,
      m.icon ? { type: "url", value: m.icon } : undefined,
    ])
  ) as Record<string, LogoEntry | undefined>;

  const sizeClasses =
    size === "sm"
      ? "text-xs px-2 py-0.5 rounded"
      : size === "lg"
      ? "text-sm px-3 py-1 rounded-md"
      : "text-xs px-2 py-0.5 rounded";

  // portal creation
  useEffect(() => {
    const el = document.createElement("div");
    el.style.position = "absolute";
    el.style.top = "0";
    el.style.left = "0";
    el.style.zIndex = "9999";
    document.body.appendChild(el);
    Promise.resolve().then(() => setPortalEl(el));
    return () => {
      if (el.parentElement) el.parentElement.removeChild(el);
      setPortalEl(null);
    };
  }, []);

  // outside click closes
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const target = e.target as Node | null;
      if (!target) return;
      if (btnRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function handleSelect(opt: NetworkOption) {
    try {
      onChange(opt.key);
    } catch (err) {
      console.warn("NetworkDropdown onChange error:", err);
    }
    setOpen(false);
    setFocusedIndex(null);
    btnRef.current?.focus();
  }
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return;
      const len = shownNetworks.length;
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((p) => (p == null || p >= len - 1 ? 0 : p + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((p) => (p == null || p <= 0 ? len - 1 : p - 1));
      } else if (e.key === "Enter" && focusedIndex != null) {
        const opt = shownNetworks[focusedIndex];
        opt && handleSelect(opt);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, focusedIndex, shownNetworks]);

  // position menu
  useLayoutEffect(() => {
    if (!open || !btnRef.current || !portalEl) {
      Promise.resolve().then(() => setMenuStyle({}));
      return;
    }
    let cancelled = false;
    function computeAndSet() {
      const btn = btnRef.current!;
      const rect = btn.getBoundingClientRect();
      const viewportW = window.innerWidth;
      const viewportH = window.innerHeight;
      const desiredWidth = Math.min(340, Math.max(240, rect.width * 1.6));
      const margin = 8;
      let left = rect.right - desiredWidth;
      if (left < margin) left = margin;
      if (left + desiredWidth > viewportW - margin)
        left = viewportW - desiredWidth - margin;
      let top = rect.bottom + 6;
      const maxHeight = Math.min(420, viewportH - top - margin);
      if (top + 120 > viewportH - margin) {
        top = rect.top - 6 - 160;
        if (top < margin) top = margin;
      }
      const styleObj: React.CSSProperties = {
        position: "absolute",
        left: `${Math.round(left)}px`,
        top: `${Math.round(top)}px`,
        width: `${Math.round(desiredWidth)}px`,
        maxHeight: `${Math.round(maxHeight)}px`,
        overflow: "auto",
        boxShadow: "0 10px 30px rgba(2,6,23,0.12)",
        borderRadius: 12,
        background: "white",
        padding: 8,
      };
      Promise.resolve().then(() => {
        if (cancelled) return;
        setMenuStyle(styleObj);
      });
    }
    computeAndSet();
    const onResize = () => computeAndSet();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [open, portalEl, shownNetworks.length]);

  function renderLogo(key: string, alt = "", sizePx = 18) {
    const e = logos[key];
    if (!e) {
      return (
        <span
          className="inline-flex items-center justify-center rounded-full bg-slate-200"
          style={{ width: sizePx, height: sizePx }}
        />
      );
    }
    return (
      <Image
        src={e.value}
        alt={alt}
        width={sizePx}
        height={sizePx}
        className="inline-block rounded-full object-cover"
        style={{ display: "inline-block" }}
      />
    );
  }

  const menuNode =
    open && portalEl
      ? ReactDOM.createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label="Select network"
            style={menuStyle}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div style={{ padding: 8 }}>
              <div
                style={{ marginBottom: 8 }}
                className="text-xs text-slate-500"
              >
                Choose network
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                {shownNetworks.map((opt, i) => {
                  const active = opt.key === currentOption.key;
                  const focused = focusedIndex === i;
                  return (
                    <li
                      key={opt.key}
                      role="menuitem"
                      tabIndex={-1}
                      onMouseEnter={() => setFocusedIndex(i)}
                      onMouseLeave={() => setFocusedIndex(null)}
                      onClick={() => handleSelect(opt)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 12px",
                        borderRadius: 8,
                        cursor: "pointer",
                        background: active
                          ? "rgba(59,130,246,0.06)"
                          : focused
                          ? "rgba(59,130,246,0.04)"
                          : "transparent",
                        marginBottom: 6,
                      }}
                      aria-current={active ? "true" : undefined}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: 12,
                          alignItems: "center",
                        }}
                      >
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {renderLogo(opt.key, opt.label, 32)}
                        </div>
                        <div
                          style={{ display: "flex", flexDirection: "column" }}
                        >
                          <span
                            style={{
                              fontSize: 14,
                              lineHeight: "18px",
                              fontFamily: "audiowide, system-ui, sans-serif",
                            }}
                            className="cursor-pointer"
                          >
                            {opt.label}
                          </span>
                          <span
                            style={{
                              fontSize: 12,
                              color: "#94a3b8",
                              textTransform: "capitalize",
                            }}
                          >
                            {opt.key}
                          </span>
                        </div>
                      </div>
                      {active && (
                        <span
                          style={{
                            marginLeft: "auto",
                            fontSize: 12,
                            color: "#2563eb",
                            fontFamily: "audiowide",
                          }}
                        >
                          Active
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
            <div style={{ padding: "6px 8px", fontSize: 12, color: "#94a3b8" }}>
              Tip: switching networks updates balances and data.
            </div>
          </div>,
          portalEl
        )
      : null;

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        ref={btnRef}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((s) => !s);
          if (!open) setFocusedIndex(null);
        }}
        className={`flex items-center gap-2 ${sizeClasses} bg-white border border-slate-200 shadow-sm hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-indigo-400 px-3 cursor-pointer`}
        title={`Network: ${currentOption.label}`}
        type="button"
      >
        <span className="sr-only">Connected network</span>
        <span className="inline-flex items-center gap-2">
          {renderLogo(currentOption.key, currentOption.label, 18)}
          <span className="text-sm font-[audiowide]">
            {currentOption.label}
          </span>
        </span>
        <svg
          className="w-3 h-3 text-slate-500"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {menuNode}
    </div>
  );
}
