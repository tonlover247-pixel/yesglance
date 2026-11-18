import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Side = "yes" | "no";

export type PaperLeg = {
  marketId: string;
  title: string;
  side: Side;
  label: string;
  shares: number;
  cost: number;
  avg: number;
};

type FillInput = {
  marketId: string;
  title: string;
  side: Side;
  label: string;
  shares: number;
  cost: number;
  avg: number;
};

type PaperState = {
  stake: number;
  legs: PaperLeg[];
  setStake: (stake: number) => void;
  fill: (input: FillInput) => void;
  clear: () => void;
};

export const usePaper = create<PaperState>()(
  persist(
    (set) => ({
      stake: 10,
      legs: [],
      setStake: (stake) => set({ stake }),
      fill: (input) =>
        set((state) => {
          const index = state.legs.findIndex(
            (leg) => leg.marketId === input.marketId && leg.side === input.side,
          );
          if (index === -1) return { legs: [...state.legs, input] };
          const current = state.legs[index];
          const shares = current.shares + input.shares;
          const cost = current.cost + input.cost;
          const next = [...state.legs];
          next[index] = {
            ...current,
            title: input.title,
            label: input.label,
            shares,
            cost,
            avg: cost / shares,
          };
          return { legs: next };
        }),
      clear: () => set({ legs: [] }),
    }),
    { name: "yesglance-paper", skipHydration: true },
  ),
);

export function markLeg(leg: PaperLeg, yes: number | undefined): number | null {
  if (yes === undefined) return null;
  const price = leg.side === "yes" ? yes : 1 - yes;
  return leg.shares * price - leg.cost;
}
