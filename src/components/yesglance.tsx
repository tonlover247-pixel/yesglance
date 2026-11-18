import { useEffect, useMemo, useState } from "react";
import { listMarkets } from "@/lib/markets.functions";
import {
  cents,
  compactUsd,
  formatMove,
  money,
  sharesLabel,
  type GlanceMarket,
} from "@/lib/markets";
import { markLeg, usePaper, type Side } from "@/lib/paper";

type Mode =
  | { kind: "glance" }
  | { kind: "confirm"; side: Side }
  | { kind: "filled"; side: Side; shares: number; price: number };

const STAKES = [5, 10, 25] as const;

export function Yesglance() {
  const stake = usePaper((s) => s.stake);
  const legs = usePaper((s) => s.legs);
  const setStake = usePaper((s) => s.setStake);
  const fill = usePaper((s) => s.fill);
  const clear = usePaper((s) => s.clear);
  const [ready, setReady] = useState(false);
  const [markets, setMarkets] = useState<GlanceMarket[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<Mode>({ kind: "glance" });

  useEffect(() => {
    void usePaper.persist.rehydrate();
    setReady(true);
  }, []);

  useEffect(() => {
    let cancel = false;
    async function load() {
      try {
        const next = await listMarkets();
        if (cancel) return;
        setMarkets(next.markets);
        setError(null);
        setStale(false);
      } catch (err) {
        if (cancel) return;
        const message = err instanceof Error ? err.message : "Odds feed failed";
        setError(message);
        setStale(true);
      }
    }
    void load();
    const timer = setInterval(() => void load(), 20_000);
    return () => {
      cancel = true;
      clearInterval(timer);
    };
  }, []);

  const market = markets?.[index] ?? null;

  useEffect(() => {
    if (!markets) return;
    if (index >= markets.length) setIndex(0);
  }, [markets, index]);

  useEffect(() => {
    setMode({ kind: "glance" });
  }, [market?.id]);

  useEffect(() => {
    if (mode.kind !== "filled") return;
    const timer = setTimeout(() => setMode({ kind: "glance" }), 1400);
    return () => clearTimeout(timer);
  }, [mode]);

  const prices = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of markets ?? []) map.set(item.id, item.yes);
    return map;
  }, [markets]);

  const book = ready ? legs : [];
  const pnl = book.reduce((sum, leg) => {
    const mark = markLeg(leg, prices.get(leg.marketId));
    return sum + (mark ?? 0);
  }, 0);

  function cycle() {
    if (!markets?.length) return;
    setIndex((current) => (current + 1) % markets.length);
    setMode({ kind: "glance" });
  }

  function choose(side: Side) {
    if (!market || mode.kind === "filled") return;
    setMode({ kind: "confirm", side });
  }

  function commit(side: Side) {
    if (!market) return;
    const price = side === "yes" ? market.yes : 1 - market.yes;
    if (price <= 0.02) return;
    const shares = stake / price;
    fill({
      marketId: market.id,
      title: market.lines.filter(Boolean).join(" "),
      side,
      label: side === "yes" ? market.side : market.other,
      shares,
      cost: stake,
      avg: price,
    });
    setMode({ kind: "filled", side, shares, price });
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target;
      if (target instanceof HTMLElement && target.closest("button")) return;
      if (event.key === "ArrowRight") cycle();
      if (event.key === "y" || event.key === "Y") choose("yes");
      if (event.key === "n" || event.key === "N") choose("no");
      if (event.key === "Enter" && mode.kind === "confirm") commit(mode.side);
      if (event.key === "Escape") setMode({ kind: "glance" });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const held = market
    ? book
        .filter((leg) => leg.marketId === market.id)
        .map((leg) => `${leg.label} ${sharesLabel(leg.shares)}`)
    : [];

  const yesLabel = market?.side ?? "YES";
  const noLabel = market?.other ?? "NO";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-5 px-4 py-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="kicker">Crypto track · paper</p>
          <h1 className="wordmark">Yesglance</h1>
        </div>
        <p className={pnl >= 0 ? "text-sm hud-up" : "meta text-sm"}>
          {ready ? money(pnl) : "$0.00"}
        </p>
      </header>

      <div className="lens-bezel self-center">
        <section className="lens" aria-live="polite">
          <span className="tick tick-tl" />
          <span className="tick tick-tr" />
          <span className="tick tick-bl" />
          <span className="tick tick-br" />
          <LensBody
            market={market}
            index={index}
            total={markets?.length ?? 0}
            error={error}
            stale={stale}
            mode={mode}
            stake={stake}
            held={held}
          />
        </section>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {mode.kind === "confirm" ? (
          <>
            <button type="button" className="hw" onClick={() => setMode({ kind: "glance" })}>
              BACK
            </button>
            <button
              type="button"
              className="hw"
              onClick={() => choose(mode.side === "yes" ? "no" : "yes")}
            >
              {mode.side === "yes" ? noLabel : yesLabel}
            </button>
            <button type="button" className="hw hw-yes" onClick={() => commit(mode.side)}>
              CONFIRM
            </button>
          </>
        ) : (
          <>
            <button type="button" className="hw" onClick={cycle} disabled={!markets?.length}>
              NEXT
            </button>
            <button
              type="button"
              className="hw"
              onClick={() => choose("no")}
              disabled={!market || mode.kind === "filled"}
            >
              {noLabel}
            </button>
            <button
              type="button"
              className="hw hw-yes"
              onClick={() => choose("yes")}
              disabled={!market || mode.kind === "filled"}
            >
              {yesLabel}
            </button>
          </>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="kicker">Stake</p>
        <div className="flex gap-2">
          {STAKES.map((amount) => (
            <button
              key={amount}
              type="button"
              className={amount === stake ? "chip chip-on" : "chip"}
              onClick={() => setStake(amount)}
            >
              ${amount}
            </button>
          ))}
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="book-label">Paper book</h2>
          {book.length > 0 ? (
            <button type="button" className="meta" onClick={clear}>
              Clear
            </button>
          ) : null}
        </div>
        {book.length === 0 ? (
          <p className="meta tracking-normal normal-case">
            Empty. A tap never spends real money.
          </p>
        ) : (
          book.map((leg) => {
            const mark = markLeg(leg, prices.get(leg.marketId));
            return (
              <div key={`${leg.marketId}-${leg.side}`} className="book-row">
                <div className="min-w-0">
                  <p className="truncate">{leg.title}</p>
                  <p className="meta">
                    {leg.label} {sharesLabel(leg.shares)} @ {cents(leg.avg)}
                  </p>
                </div>
                <p className={mark !== null && mark < 0 ? "meta" : "hud-up"}>
                  {mark === null ? "—" : money(mark)}
                </p>
              </div>
            );
          })
        )}
      </section>
    </main>
  );
}

function LensBody({
  market,
  index,
  total,
  error,
  stale,
  mode,
  stake,
  held,
}: {
  market: GlanceMarket | null;
  index: number;
  total: number;
  error: string | null;
  stale: boolean;
  mode: Mode;
  stake: number;
  held: string[];
}) {
  if (!market) {
    return (
      <div className="relative z-10 flex h-full flex-col justify-between">
        <p className="hud-kicker">YESGLANCE</p>
        <p className="hud-title">{error ? "NO FEED" : "FETCHING"}</p>
        <p className="hud-hint">{error ?? "LIVE ODDS"}</p>
      </div>
    );
  }

  const price =
    mode.kind !== "glance" && mode.side === "no" ? 1 - market.yes : market.yes;
  const side =
    mode.kind !== "glance" && mode.side === "no" ? market.other : market.side;
  const move = formatMove(market.dayMove);

  let hint = held.length ? `YOU ${held.join(" · ")}` : "TAP A SIDE";
  if (mode.kind === "confirm") {
    hint = `BUY ${side} $${stake} · ${sharesLabel(stake / price)} SH`;
  }
  if (mode.kind === "filled") {
    hint = `FILLED ${sharesLabel(mode.shares)} @ ${cents(mode.price)}`;
  }

  return (
    <div className="relative z-10 flex h-full flex-col justify-between">
      <div className="flex items-center justify-between">
        <p className="hud-kicker">{stale ? "STALE" : "YESGLANCE"}</p>
        <p className="hud-index">
          {String(index + 1).padStart(2, "0")}/{String(total).padStart(2, "0")}
        </p>
      </div>
      <div>
        <p className="hud-title">{market.lines[0]}</p>
        {market.lines[1] ? <p className="hud-title">{market.lines[1]}</p> : null}
      </div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="hud-side">{mode.kind === "filled" ? "PAPER" : side}</p>
          <p className="hud-price">{cents(price)}</p>
        </div>
        <div className="text-right">
          <p className={move.startsWith("+") ? "hud-meta hud-up" : "hud-meta"}>{move}</p>
          <p className="hud-meta">24H {compactUsd(market.volume24hr)}</p>
        </div>
      </div>
      <p className="hud-hint">{hint}</p>
    </div>
  );
}
