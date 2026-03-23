import Image from "next/image";
import { TokenInfo } from "@/app/types";
import { CHAIN_LOGOS } from "@/app/data";

interface TokenRowProps {
  token: TokenInfo | undefined;
  amount?: string;
  usdValue?: number;
  onSelectToken: () => void;
  onAmountChange?: (val: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  readOnly?: boolean;
  label: string;
  inputId?: string;
}

export default function TokenRow({
  token,
  amount,
  usdValue = 0,
  onSelectToken,
  onAmountChange,
  onFocus,
  onBlur,
  readOnly = false,
  label,
  inputId,
}: TokenRowProps) {
  return (
    <div className="flex items-center gap-3 mb-2">
      <button
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 focus:outline-none text-black font-rajdhani"
        onClick={onSelectToken}
        aria-label={`Select ${label} token`}
      >
        <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs overflow-hidden">
          {token?.icon ? (
            <Image
              src={token.icon}
              alt={token.symbol}
              width={24}
              height={24}
              className="rounded-full"
              unoptimized
            />
          ) : token?.logo ? (
            <div className="relative">
              <Image
                src={token.logo}
                alt={token.symbol}
                width={24}
                height={24}
                className="rounded-full"
                unoptimized
              />
              <div className="absolute bottom-0 right-0">
                {token?.chain && CHAIN_LOGOS[token.chain] ? (
                  <Image
                    src={CHAIN_LOGOS[token.chain]!}
                    alt={`${token.chain} logo`}
                    width={12}
                    height={12}
                    className="rounded-full border border-white"
                    unoptimized
                  />
                ) : null}
              </div>
            </div>
          ) : (
            <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs">
              {token?.symbol?.[0] ?? "—"}
            </div>
          )}
        </div>
        <span className="font-semibold font-rajdhani">
          {token?.symbol ?? "Select"}
        </span>
        <svg
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <div className="flex-1 flex flex-col items-end">
        {readOnly ? (
          <span className="text-2xl text-right text-gray-700 font-rajdhani">
            {amount ?? "0"}
          </span>
        ) : (
          <input
            id={inputId}
            type="text"
            inputMode="decimal"
            pattern="[0-9]*[.,]?[0-9]*"
            step="any"
            value={amount}
            onChange={(e) => onAmountChange?.(e.target.value)}
            onFocus={onFocus}
            onBlur={onBlur}
            className="text-2xl text-right outline-none bg-transparent w-full text-black font-rajdhani"
            placeholder="0"
            aria-label={`${label} amount`}
          />
        )}
        <span className="text-xs font-rajdhani text-gray-400">
          ${usdValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </span>
      </div>
    </div>
  );
}
