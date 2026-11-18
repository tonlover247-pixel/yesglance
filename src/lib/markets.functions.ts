import { createServerFn } from "@tanstack/react-start";
import { normalizeMarket, type GlanceMarket } from "./markets";

const FEED =
  "https://gamma-api.polymarket.com/markets?closed=false&active=true&limit=30&order=volume24hr&ascending=false";

export const listMarkets = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ markets: GlanceMarket[] }> => {
    const res = await fetch(FEED, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`Odds feed failed (${res.status})`);
    const raw = (await res.json()) as unknown;
    if (!Array.isArray(raw)) throw new Error("Odds feed returned nothing");
    const markets: GlanceMarket[] = [];
    for (const item of raw) {
      if (!item || typeof item !== "object") continue;
      const market = normalizeMarket(item);
      if (!market) continue;
      markets.push(market);
      if (markets.length === 12) break;
    }
    if (markets.length === 0) throw new Error("No open markets in the feed");
    return { markets };
  },
);
