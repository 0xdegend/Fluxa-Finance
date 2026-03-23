import Image from "next/image";
import React from "react";
import { Token } from "@/app/types";

// TODO: Replace with real modal and token icon logic
const TokenListModal = ({
  open,
  onSelect,
  onClose,
  tokens,
}: {
  open: boolean;
  onSelect: (t: Token) => void;
  onClose: () => void;
  tokens: Token[];
}) => {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 bg-[#cdcdcd87] bg-opacity-30 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div className="bg-white rounded-xl shadow-lg p-4 min-w-[380px]">
        <h3 className="font-bold mb-2 font-[funnel]">Select a token</h3>
        <ul>
          {tokens.map((t) => (
            <li key={t.symbol}>
              <button
                className="w-full text-left py-2 px-2 hover:bg-gray-100 rounded flex items-center gap-2 cursor-pointer"
                onClick={() => {
                  onSelect(t);
                  onClose();
                }}
              >
                {/* TODO: Token icon */}
                <div className="w-7 h-7 rounded-full  flex items-center justify-center font-bold text-xs">
                  <Image
                    src={t.icon || ""}
                    alt={t.symbol}
                    width={24}
                    height={24}
                    className="rounded-full"
                    unoptimized
                  />
                </div>
                <span className="text-black font-[funnel]">
                  {t.symbol} - {t.name}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default TokenListModal;
