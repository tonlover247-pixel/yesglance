export type GlanceMarket = {
  id: string;
  slug: string;
  question: string;
  lines: [string, string];
  side: string;
  other: string;
  yes: number;
  dayMove: number | null;
  volume24hr: number;
};

export function glanceLines(question: string): [string, string] {
  const clean = question
    .replace(/^will\s+/i, "")
    .replace(/\?+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const words = clean.split(" ").filter(Boolean);
  const lines: [string, string] = ["", ""];
  let row = 0;
  for (const word of words) {
    const next = lines[row] ? `${lines[row]} ${word}` : word;
    if (next.length <= 18) {
      lines[row] = next;
      continue;
    }
    if (row === 0) {
      row = 1;
      lines[1] = word.length > 18 ? word.slice(0, 18) : word;
      continue;
    }
    break;
  }
  return [
    (lines[0] || "MARKET").toUpperCase(),
    lines[1].toUpperCase(),
  ];
}

export function cents(price: number): string {
  const value = price * 100;
  if (!Number.isFinite(value)) return "—";
  if (value >= 10) return `${Math.round(value)}¢`;
  return `${value.toFixed(1)}¢`;
}

export function formatMove(delta: number | null): string {
  if (delta === null || !Number.isFinite(delta) || Math.abs(delta) < 0.0005) {
    return "FLAT";
  }
  const points = delta * 100;
  const sign = points > 0 ? "+" : "−";
  const body =
    Math.abs(points) >= 10
      ? Math.abs(points).toFixed(0)
      : Math.abs(points).toFixed(1);
  return `${sign}${body}¢`;
}

export function compactUsd(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return "$0";
  if (amount >= 1_000_000) {
    const millions = amount / 1_000_000;
    return `$${millions >= 10 ? millions.toFixed(0) : millions.toFixed(1)}M`;
  }
  if (amount >= 1_000) return `$${Math.round(amount / 1_000)}K`;
  return `$${Math.round(amount)}`;
}

export function sharesLabel(shares: number): string {
  if (!Number.isFinite(shares)) return "0";
  if (shares >= 100) return Math.round(shares).toString();
  return shares.toFixed(1);
}

type RawMarket = {
  id?: string | number;
  question?: string;
  slug?: string;
  outcomes?: string;
  outcomePrices?: string;
  volume24hr?: number;
  oneDayPriceChange?: number | string | null;
  acceptingOrders?: boolean;
  closed?: boolean;
  active?: boolean;
};

function clipOutcome(name: string, fallback: string): string {
  const upper = name.trim().toUpperCase();
  if (!upper) return fallback;
  return upper.length > 10 ? upper.slice(0, 10) : upper;
}

function outcomeNames(outcomes: string | undefined): [string, string] {
  try {
    const parsed = JSON.parse(outcomes ?? "[]") as unknown;
    if (Array.isArray(parsed)) {
      const first = typeof parsed[0] === "string" ? parsed[0] : "Yes";
      const second = typeof parsed[1] === "string" ? parsed[1] : "No";
      return [clipOutcome(first, "YES"), clipOutcome(second, "NO")];
    }
  } catch {
    /* fall through */
  }
  return ["YES", "NO"];
}

function yesPrice(outcomePrices: string | undefined): number | null {
  try {
    const parsed = JSON.parse(outcomePrices ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return null;
    const price = Number(parsed[0]);
    if (!Number.isFinite(price) || price <= 0.02 || price >= 0.98) return null;
    return price;
  } catch {
    return null;
  }
}

export function normalizeMarket(raw: RawMarket): GlanceMarket | null {
  if (raw.closed || raw.active === false || raw.acceptingOrders === false) {
    return null;
  }
  const question = raw.question?.trim();
  if (!question || raw.id == null) return null;
  const yes = yesPrice(raw.outcomePrices);
  if (yes === null) return null;
  const move = Number(raw.oneDayPriceChange);
  const [side, other] = outcomeNames(raw.outcomes);
  return {
    id: String(raw.id),
    slug: raw.slug ?? String(raw.id),
    question,
    lines: glanceLines(question),
    side,
    other,
    yes,
    dayMove: Number.isFinite(move) ? move : null,
    volume24hr: Number(raw.volume24hr) || 0,
  };
}

export function money(amount: number): string {
  const sign = amount > 0.004 ? "+" : amount < -0.004 ? "−" : "";
  return `${sign}$${Math.abs(amount).toFixed(2)}`;
}
