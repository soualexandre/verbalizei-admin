"use client";

import { createContext, useContext, type ReactNode } from "react";
import { brl, usd } from "@/lib/billing";

/** A cotação do painel de custos; null = API antiga sem `exchange` (mostra em US$). */
const RateContext = createContext<number | null>(null);

export function MoneyProvider({ rate, children }: { rate: number | null; children: ReactNode }) {
  return <RateContext.Provider value={rate}>{children}</RateContext.Provider>;
}

/** Formatador pela cotação dada: valor em US$ → "R$ …" (sem cotação, "US$ …"). */
export function moneyFor(rate: number | null) {
  const money = (usdValue: number, digits = 2) => (rate ? brl(usdValue, rate, digits) : usd(usdValue, digits));
  return Object.assign(money, { rate });
}

/** O formatador do painel, com a cotação do MoneyProvider. */
export function useMoney() {
  return moneyFor(useContext(RateContext));
}
