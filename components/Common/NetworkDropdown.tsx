"use client";
import React, { useEffect, useRef, useState } from "react";
import { NetworkOption } from "@/types";
import { DEFAULT_NETWORKS } from "@/data";
import { NetworkDropdownProps } from "@/types";

export default function NetworkDropdown({
  current,
  onChange,
  networks = DEFAULT_NETWORKS,
  size = "sm",
  className = "",
}: NetworkDropdownProps) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLUListElement | null>(null);
  const [networkName, setNetworkName] = useState<string>(current);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!menuRef.current || !btnRef.current) return;
      if (
        e.target instanceof Node &&
        !menuRef.current.contains(e.target) &&
        !btnRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const currentOption = networks.find((n) => n.key === current) ?? networks[0];

  const sizeClasses =
    size === "sm"
      ? "text-xs px-2 py-0.5 rounded"
      : size === "lg"
      ? "text-sm px-3 py-1 rounded-md"
      : "text-xs px-2 py-0.5 rounded";

  async function handleSelect(opt: NetworkOption) {
    setOpen(false);
    onChange(opt.key);
    setNetworkName(opt?.label);
  }

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        ref={btnRef}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((s) => !s);
        }}
        className={`flex items-center gap-2 ${sizeClasses} bg-(--fluxa-glass-light) border border-(--fluxa-glass-light-border) text-(--fluxa-text) hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-(--fluxa-accent)`}
        title={`Network: ${currentOption.label}`}
      >
        <span className="text-(--fluxa-muted) font-[audiowide]">Connected</span>
        <span className="inline-flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-[var(--fluxa-accent)/20] text-(--fluxa-accent) text-[0.8rem] font-[audiowide] capitalize">
            {networkName}
          </span>
          <svg
            className="w-3 h-3 text-(--fluxa-muted)"
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
        </span>
      </button>

      {open && (
        <ul
          ref={menuRef}
          role="menu"
          aria-label="Select network"
          className="absolute right-0 mt-2 w-48 z-50 bg-(--fluxa-glass-light) border border-[--fluxa-glass-light-border) backdrop-blur-md rounded-lg shadow-sm p-2"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {networks.map((opt) => {
            const active = opt.key === current;
            return (
              <li
                key={opt.key}
                role="menuitem"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSelect(opt);
                  }
                }}
                onClick={() => handleSelect(opt)}
                className={`flex items-center justify-between gap-3 px-3 py-2 rounded hover:bg-(--fluxa-glass-frost) cursor-pointer ${
                  active
                    ? "bg-[var(--fluxa-accent)/10] font-semibold"
                    : "text-(--fluxa-text)"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-3 h-3 rounded-full bg-(--fluxa-accent)/70"
                    aria-hidden
                  />
                  <span className="text-sm font-[audiowide]">{opt.label}</span>
                </div>
                {active && (
                  <span className="text-xs text-(--fluxa-accent)] font-[audiowide]">
                    Active
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
