// pages/api/chain-logos.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { stat, readFile } from "fs/promises";
import path from "path";

type LogoEntry = { type: "url"; value: string };

const CHAIN_META: {
  key: string;
  coinGeckoId?: string;
  localPath?: string;
  label?: string;
}[] = [
  {
    key: "eth",
    coinGeckoId: undefined,
    localPath: "/logos/ethereum-icon.png",
    label: "Ethereum",
  },
  {
    key: "base",
    coinGeckoId: undefined,
    localPath: "/logos/base-icon.svg",
    label: "Base",
  },
  {
    key: "solana",
    coinGeckoId: undefined,
    localPath: "/logos/solana-icon.png",
    label: "Solana",
  },
  {
    key: "arbitrum",
    coinGeckoId: undefined,
    localPath: "/logos/arbitrum-icon.png",
    label: "Arbitrum",
  },
  {
    key: "bsc",
    coinGeckoId: undefined,
    localPath: "/logos/bnb-icon.png",
    label: "BSC",
  },
];

let cache: { logos: Record<string, LogoEntry>; expires: number } | null = null;
const TTL_MS = 24 * 60 * 60 * 1000; // 24h
const FETCH_TIMEOUT_MS = 8_000;

function synthesizeSvgForKey(key: string, label?: string): string {
  const letter = (label && label[0]) || (key && key[0]) || "?";
  const color =
    {
      base: "#1a01fe",
      eth: "#627eea",
      solana: "#00ffa3",
      bsc: "#f3ba2f",
      arbitrum: "#28a0f0",
      polygon: "#8247e5",
    }[key] ?? "#0ea5e9";

  // return data URL directly
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128' role='img' aria-label='${
    label ?? key
  }'>
    <rect width='100%' height='100%' rx='20' fill='${color}'/>
    <text x='50%' y='54%' dominant-baseline='middle' text-anchor='middle' font-family='Inter, Arial, Helvetica, sans-serif' font-size='64' font-weight='700' fill='white'>${letter}</text>
  </svg>`;
  return svgToDataUrl(svg);
}

function svgToDataUrl(svgText: string) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgText)}`;
}

/**
 * Normalize raw SVG string so it scales inside a small container:
 * - remove width/height attributes (allow CSS sizing)
 * - ensure viewBox present (if width/height present, derive viewBox)
 * - add style="width:100%;height:100%;display:block"
 */
function normalizeSvg(svgText: string): string {
  try {
    let out = svgText;

    // remove xml declarations
    out = out.replace(/<\?xml[^>]*\?>/g, "");

    // extract <svg ...> opening tag
    const svgOpenMatch = out.match(/<svg\b([^>]*)>/i);
    if (!svgOpenMatch) return out;

    let attrs = svgOpenMatch[1];

    // capture width/height if present
    const widthMatch = attrs.match(/\bwidth\s*=\s*["']?([\d.]+)(px)?["']?/i);
    const heightMatch = attrs.match(/\bheight\s*=\s*["']?([\d.]+)(px)?["']?/i);
    const viewBoxMatch = attrs.match(/\bviewBox\s*=\s*["']([^"']+)["']/i);

    // remove width/height attributes
    attrs = attrs.replace(/\s(width|height)\s*=\s*["']?[^"'>\s]+["']?/gi, "");

    // ensure viewBox exists: if not, derive from width/height if available
    if (!viewBoxMatch && widthMatch && heightMatch) {
      const w = Number(widthMatch[1]);
      const h = Number(heightMatch[1]);
      if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
        attrs = attrs + ` viewBox="0 0 ${w} ${h}"`;
      }
    }

    // ensure style to make svg fill container
    if (!/style\s*=\s*["'][^"']*width:100%/i.test(attrs)) {
      // preserve existing style but append sizing
      const styleMatch = attrs.match(/\sstyle\s*=\s*["']([^"']*)["']/i);
      if (styleMatch) {
        const existing = styleMatch[1];
        const newStyle = `${existing};width:100%;height:100%;display:block`;
        attrs = attrs.replace(
          /\sstyle\s*=\s*["'][^"']*["']/i,
          ` style="${newStyle}"`
        );
      } else {
        attrs = attrs + ` style="width:100%;height:100%;display:block"`;
      }
    }

    // rebuild svg string
    out = out.replace(/<svg\b([^>]*)>/i, `<svg${attrs}>`);

    return out;
  } catch (err) {
    // fallback to original
    return svgText;
  }
}

async function fetchWithTimeout(input: string, timeout = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(input, { signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

/** Convert a Response (possibly svg) into a LogoEntry (data URL) */
async function responseToDataUrl(res: Response): Promise<LogoEntry | null> {
  if (!res.ok) return null;
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("svg") || ct.includes("image/svg+xml")) {
    const text = await res.text();
    const norm = normalizeSvg(text);
    return { type: "url", value: svgToDataUrl(norm) };
  } else {
    const buf = await res.arrayBuffer();
    const arr = new Uint8Array(buf);
    // server-side conversion to base64
    const b64 = Buffer.from(arr).toString("base64");
    const mime = ct.split(";")[0] || "application/octet-stream";
    return { type: "url", value: `data:${mime};base64,${b64}` };
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // in-memory cache
    if (cache && Date.now() < cache.expires) {
      res.setHeader(
        "Cache-Control",
        `public, s-maxage=${Math.floor(
          TTL_MS / 1000
        )}, stale-while-revalidate=60`
      );
      return res.status(200).json({ logos: cache.logos, cached: true });
    }

    const logos: Record<string, LogoEntry> = {};

    for (const m of CHAIN_META) {
      let entry: LogoEntry | null = null;
      if (m.localPath) {
        try {
          const fsPath = path.join(
            process.cwd(),
            "public",
            m.localPath.replace(/^\//, "")
          );
          await stat(fsPath); // throws if missing
          if (m.localPath.toLowerCase().endsWith(".svg")) {
            // read, normalize and return as data URL for consistent sizing
            const svgText = await readFile(fsPath, "utf8");
            const norm = normalizeSvg(svgText);
            entry = { type: "url", value: svgToDataUrl(norm) };
          } else {
            // non svg (png/jpg) -> read & base64 -> data URL
            const buf = await readFile(fsPath);
            const ext = path.extname(fsPath).slice(1);
            const mime =
              ext === "png"
                ? "image/png"
                : ext === "jpg" || ext === "jpeg"
                ? "image/jpeg"
                : "application/octet-stream";
            const b64 = Buffer.from(buf).toString("base64");
            entry = { type: "url", value: `data:${mime};base64,${b64}` };
          }
        } catch (err) {
          console.warn(`Local logo missing or unreadable for ${m.key}:`, err);
        }
      }

      // 2) CoinGecko: fetch coin metadata and then fetch the image and convert
      if (!entry && m.coinGeckoId) {
        try {
          const mdUrl = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(
            m.coinGeckoId
          )}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false&sparkline=false`;
          const mdRes = await fetchWithTimeout(mdUrl, 4000);
          if (mdRes.ok) {
            const md = await mdRes.json();
            const imageUrl =
              md?.image?.small ?? md?.image?.thumb ?? md?.image?.large ?? null;
            if (typeof imageUrl === "string" && imageUrl) {
              try {
                const imgRes = await fetchWithTimeout(imageUrl, 6000);
                const logoEntry = await responseToDataUrl(imgRes);
                if (logoEntry) entry = logoEntry;
              } catch (imgErr) {
                console.warn(
                  `Failed to fetch/convert image for ${m.coinGeckoId}`,
                  imgErr
                );
              }
            } else {
              console.warn(`CoinGecko returned no image for ${m.coinGeckoId}`);
            }
          } else {
            console.warn(
              `CoinGecko metadata fetch failed for ${m.coinGeckoId}: ${mdRes.status}`
            );
          }
        } catch (cgErr) {
          console.warn("CoinGecko error for", m.coinGeckoId, cgErr);
        }
      }

      // 3) fallback: synthesize svg data URL
      if (!entry) {
        const svg = synthesizeSvgForKey(m.key, m.label);
        entry = { type: "url", value: svgToDataUrl(svg) };
      }

      logos[m.key] = entry;
    }

    cache = { logos, expires: Date.now() + TTL_MS };

    // set caching headers for CDN / browser
    res.setHeader(
      "Cache-Control",
      `public, s-maxage=${Math.floor(TTL_MS / 1000)}, stale-while-revalidate=60`
    );
    return res.status(200).json({ logos, cached: false });
  } catch (err) {
    console.error("chain-logos error", err);
    return res.status(500).json({ error: "Failed to fetch chain logos" });
  }
}
