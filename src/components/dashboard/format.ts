import type { InteractionKind } from "@/lib/types";

/** Os tipos de interação, na ordem das legendas e das pilhas. */
export const KINDS: { key: InteractionKind; label: string; color: string }[] = [
  { key: "scenarios", label: "Cenários", color: "var(--chart-1)" },
  { key: "recordings", label: "Gravações", color: "var(--chart-2)" },
  { key: "micro", label: "Micro-treinos", color: "var(--chart-3)" },
  { key: "games", label: "Jogos", color: "var(--chart-4)" },
];

const int = new Intl.NumberFormat("pt-BR");
export const fmt = (n: number) => int.format(n);
export const fmtPct = (n: number) =>
  `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

/** "15/10" a partir de "2026-10-15". */
export function shortDay(day: string): string {
  const [, m, d] = day.split("-");
  return `${d}/${m}`;
}

/** "12 a 18/10" — a semana que começa em `monday`. */
export function weekLabel(monday: string): string {
  const start = new Date(`${monday}T00:00:00Z`);
  const end = new Date(start.getTime() + 6 * 86_400_000);
  const dd = (d: Date) => String(d.getUTCDate()).padStart(2, "0");
  const mm = (d: Date) => String(d.getUTCMonth() + 1).padStart(2, "0");
  return start.getUTCMonth() === end.getUTCMonth()
    ? `${dd(start)} a ${dd(end)}/${mm(end)}`
    : `${dd(start)}/${mm(start)} a ${dd(end)}/${mm(end)}`;
}

export type Trend = { text: string; direction: "up" | "down" | "flat" } | null;

/** Variação relativa ("+12%") de `value` contra `previous`; sem base, nada. */
export function relativeTrend(value: number, previous: number): Trend {
  if (previous === 0) return value === 0 ? { text: "estável", direction: "flat" } : null;
  const change = ((value - previous) / previous) * 100;
  const rounded = Math.round(change);
  if (rounded === 0) return { text: "estável", direction: "flat" };
  return { text: `${rounded > 0 ? "+" : ""}${rounded}%`, direction: rounded > 0 ? "up" : "down" };
}

/** Variação em pontos percentuais ("+3,2 p.p."), para taxas. */
export function pointsTrend(value: number | null, previous: number | null): Trend {
  if (value == null || previous == null) return null;
  const diff = Math.round((value - previous) * 10) / 10;
  if (diff === 0) return { text: "estável", direction: "flat" };
  return {
    text: `${diff > 0 ? "+" : ""}${diff.toLocaleString("pt-BR")} p.p.`,
    direction: diff > 0 ? "up" : "down",
  };
}
