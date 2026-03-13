import { NextRequest, NextResponse } from "next/server";
import { stat, readFile } from "fs/promises";
import path from "path";

type LogoEntry = { type: "url"; value: string };

const CHAIN_META: {
  key: string;
  coinGeckoId?: string;
  localPath?: string;
  label?: string;
}[] = [
  { key: "eth", localPath: "/logos/ethereum-icon.png", label: "Ethereum" },
  { key: "base", localPath: "/logos/base-icon.svg", label: "Base" },
  { key: "solana", localPath: "/logos/solana-icon.png", label: "Solana" },
  { key: "arbitrum", localPath: "/logos/arbitrum-icon.png", label: "Arbitrum" },
  { key: "bsc", localPath: "/logos/bnb-icon.png", label: "BSC" },
];

let cache: { logos: Record<string, LogoEntry>; expires: number } | null = null;
const TTL_MS = 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8_000;

function synthesizeSvgForKey(key: string, label?: string): string {
  const letter = (label && label[0]) || (key && key[0]) || "?";
  const color =
    (
      {
        base: "#1a01fe",
        eth: "#627eea",
        solana: "#00ffa3",
        bsc: "#f3ba2f",
        arbitrum: "#28a0f0",
        polygon: "#8247e5",
      } as Record<string, string>
    )[key] ?? "#0ea5e9";
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'><rect width='100%' height='100%' rx='20' fill='${color}'/><text x='50%' y='54%' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='64' font-weight='700' fill='white'>${letter}</text></svg>`;
  return svgToDataUrl(svg);
}

function svgToDataUrl(svgText: string) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgText)}`;
}

function normalizeSvg(svgText: string): string {
  try {
    const out = svgText.replace(/<\?xml[^>]*\?>/g, "");
    const svgOpenMatch = out.match(/<svg\b([^>]*)>/i);
    if (!svgOpenMatch) return out;

    let attrs = svgOpenMatch[1];
    const widthMatch = attrs.match(/\bwidth\s*=\s*["']?([\d.]+)(px)?["']?/i);
    const heightMatch = attrs.match(/\bheight\s*=\s*["']?([\d.]+)(px)?["']?/i);
    const viewBoxMatch = attrs.match(/\bviewBox\s*=\s*["']([^"']+)["']/i);

    attrs = attrs.replace(/\s(width|height)\s*=\s*["']?[^"'>\s]+["']?/gi, "");

    if (!viewBoxMatch && widthMatch && heightMatch) {
      const w = Number(widthMatch[1]);
      const h = Number(heightMatch[1]);
      if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
        attrs += ` viewBox="0 0 ${w} ${h}"`;
      }
    }

    const styleMatch = attrs.match(/\sstyle\s*=\s*["']([^"']*)["']/i);
    if (styleMatch) {
      attrs = attrs.replace(
        /\sstyle\s*=\s*["'][^"']*["']/i,
        ` style="${styleMatch[1]};width:100%;height:100%;display:block"`,
      );
    } else {
      attrs += ` style="width:100%;height:100%;display:block"`;
    }

    return out.replace(/<svg\b([^>]*)>/i, `<svg${attrs}>`);
  } catch {
    return svgText;
  }
}

async function fetchWithTimeout(input: string, timeout = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(input, { signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

async function responseToDataUrl(res: Response): Promise<LogoEntry | null> {
  if (!res.ok) return null;
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("svg")) {
    const text = await res.text();
    return { type: "url", value: svgToDataUrl(normalizeSvg(text)) };
  }
  const buf = await res.arrayBuffer();
  const b64 = Buffer.from(new Uint8Array(buf)).toString("base64");
  const mime = ct.split(";")[0] || "application/octet-stream";
  return { type: "url", value: `data:${mime};base64,${b64}` };
}

export async function GET(_req: NextRequest): Promise<NextResponse> {
  try {
    if (cache && Date.now() < cache.expires) {
      return NextResponse.json(
        { logos: cache.logos, cached: true },
        {
          headers: {
            "Cache-Control": `public, s-maxage=${Math.floor(TTL_MS / 1000)}, stale-while-revalidate=60`,
          },
        },
      );
    }

    const logos: Record<string, LogoEntry> = {};

    for (const m of CHAIN_META) {
      let entry: LogoEntry | null = null;

      if (m.localPath) {
        try {
          const fsPath = path.join(
            process.cwd(),
            "public",
            m.localPath.replace(/^\//, ""),
          );
          await stat(fsPath);
          if (m.localPath.toLowerCase().endsWith(".svg")) {
            const svgText = await readFile(fsPath, "utf8");
            entry = { type: "url", value: svgToDataUrl(normalizeSvg(svgText)) };
          } else {
            const buf = await readFile(fsPath);
            const ext = path.extname(fsPath).slice(1);
            const mime =
              ext === "png"
                ? "image/png"
                : ext === "jpg" || ext === "jpeg"
                  ? "image/jpeg"
                  : "application/octet-stream";
            entry = {
              type: "url",
              value: `data:${mime};base64,${Buffer.from(buf).toString("base64")}`,
            };
          }
        } catch {
          console.warn(`Local logo missing for ${m.key}`);
        }
      }

      if (!entry && m.coinGeckoId) {
        try {
          const mdRes = await fetchWithTimeout(
            `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(m.coinGeckoId)}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false&sparkline=false`,
            4000,
          );
          if (mdRes.ok) {
            const md = await mdRes.json();
            const imageUrl = md?.image?.small ?? md?.image?.thumb ?? null;
            if (typeof imageUrl === "string") {
              const imgRes = await fetchWithTimeout(imageUrl, 6000);
              entry = await responseToDataUrl(imgRes);
            }
          }
        } catch {
          console.warn(`CoinGecko error for ${m.coinGeckoId}`);
        }
      }

      if (!entry) {
        entry = { type: "url", value: synthesizeSvgForKey(m.key, m.label) };
      }

      logos[m.key] = entry;
    }

    cache = { logos, expires: Date.now() + TTL_MS };

    return NextResponse.json(
      { logos, cached: false },
      {
        headers: {
          "Cache-Control": `public, s-maxage=${Math.floor(TTL_MS / 1000)}, stale-while-revalidate=60`,
        },
      },
    );
  } catch (err) {
    console.error("chain-logos error", err);
    return NextResponse.json(
      { error: "Failed to fetch chain logos" },
      { status: 500 },
    );
  }
}
