import type { DashboardOverview } from "@/lib/types";
import { fmt, fmtPct } from "./format";

/**
 * A visão geral dita em frases (25/10/2026, pedido do usuário: o painel tem
 * de se explicar sozinho, sem esforço para ler). Tudo aqui é conta pura sobre
 * o que a API manda; a página só desenha.
 */

export const WEEKDAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"] as const;
export const WEEKDAYS_SHORT = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"] as const;

/** "20h" a partir de 20. */
export const hourText = (h: number) => `${h}h`;
/** "das 20h às 21h". */
export const hourRange = (h: number) => `das ${hourText(h)} às ${hourText((h + 1) % 24)}`;

/** O artigo do dia: "na segunda", "no sábado". */
const onDay = (w: number) => (w >= 6 ? "no" : "na");

type Weekday = NonNullable<DashboardOverview["weekday"]>[number];

/** O dia da semana com a maior média por ocorrência; null sem treino. */
export function bestWeekday(weekday: Weekday[] | undefined): Weekday | null {
  if (!weekday?.length) return null;
  const best = weekday.reduce((a, b) => (b.average > a.average ? b : a));
  return best.interactions > 0 ? best : null;
}

/** O dia mais fraco (com o dia já tendo caído no período). */
export function weakestWeekday(weekday: Weekday[] | undefined): Weekday | null {
  const valid = (weekday ?? []).filter((d) => d.days > 0);
  if (!valid.length) return null;
  return valid.reduce((a, b) => (b.average < a.average ? b : a));
}

export interface Daypart {
  key: "madrugada" | "manha" | "tarde" | "noite";
  label: string;
  range: string;
  interactions: number;
  share: number;
}

const PARTS: Array<Omit<Daypart, "interactions" | "share"> & { from: number; to: number }> = [
  { key: "madrugada", label: "Madrugada", range: "0h às 6h", from: 0, to: 6 },
  { key: "manha", label: "Manhã", range: "6h às 12h", from: 6, to: 12 },
  { key: "tarde", label: "Tarde", range: "12h às 18h", from: 12, to: 18 },
  { key: "noite", label: "Noite", range: "18h às 24h", from: 18, to: 24 },
];

/** As 24 horas em quatro turnos, com a fatia de cada um. */
export function dayparts(hourly: DashboardOverview["hourly"]): Daypart[] {
  const rows = hourly ?? [];
  const total = rows.reduce((n, h) => n + h.interactions, 0);
  return PARTS.map(({ from, to, ...p }) => {
    const interactions = rows.filter((h) => h.hour >= from && h.hour < to).reduce((n, h) => n + h.interactions, 0);
    return { ...p, interactions, share: total ? Math.round((interactions / total) * 100) : 0 };
  });
}

/** A hora com mais treinos; null sem treino. */
export function peakHour(hourly: DashboardOverview["hourly"]) {
  const rows = hourly ?? [];
  const best = rows.reduce<(typeof rows)[number] | null>((a, b) => (!a || b.interactions > a.interactions ? b : a), null);
  return best && best.interactions > 0 ? best : null;
}

/** A célula mais forte do mapa dia × hora. */
export function bestSlot(heatmap: number[][] | undefined): { weekday: number; hour: number; interactions: number } | null {
  let best: { weekday: number; hour: number; interactions: number } | null = null;
  (heatmap ?? []).forEach((hours, d) =>
    hours.forEach((n, h) => {
      if (n > 0 && (!best || n > best.interactions)) best = { weekday: d + 1, hour: h, interactions: n };
    }),
  );
  return best;
}

export function weekdaySentence(weekday: Weekday[] | undefined): string {
  const best = bestWeekday(weekday);
  if (!best) return "Nenhum treino no período.";
  const weak = weakestWeekday(weekday);
  const name = WEEKDAYS[best.weekday - 1];
  const avg = best.average.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  const weakPart =
    weak && weak.weekday !== best.weekday
      ? ` O mais fraco é ${onDay(weak.weekday)} ${WEEKDAYS[weak.weekday - 1].toLowerCase()} (${weak.average.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}).`
      : "";
  return `${name} é o dia em que mais se treina: ${avg} treinos em média a cada ${name.toLowerCase()}.${weakPart}`;
}

const PART_PHRASE: Record<Daypart["key"], string> = {
  madrugada: "de madrugada",
  manha: "de manhã",
  tarde: "à tarde",
  noite: "à noite",
};

export function hourSentence(hourly: DashboardOverview["hourly"]): string {
  const peak = peakHour(hourly);
  if (!peak) return "Nenhum treino no período.";
  const top = dayparts(hourly).reduce((a, b) => (b.share > a.share ? b : a));
  return `O horário de pico é ${hourRange(peak.hour)}. ${fmtPct(top.share)} dos treinos acontecem ${PART_PHRASE[top.key]} (${top.range}).`;
}

export function slotSentence(heatmap: number[][] | undefined): string {
  const best = bestSlot(heatmap);
  if (!best) return "Nenhum treino no período.";
  return `O momento mais forte é ${onDay(best.weekday)} ${WEEKDAYS[best.weekday - 1].toLowerCase()}, ${hourRange(best.hour)} (${fmt(best.interactions)} ${best.interactions === 1 ? "treino" : "treinos"}). Quanto mais escuro o quadrado, mais treinos.`;
}

export interface FunnelStep {
  label: string;
  help: string;
  count: number;
  /** % dos cadastros. */
  share: number;
}

export function funnelSteps(a: NonNullable<DashboardOverview["activation"]>): FunnelStep[] {
  const share = (n: number) => (a.signups ? Math.round((n / a.signups) * 100) : 0);
  return [
    { label: "Se cadastraram", help: "Contas novas no período.", count: a.signups, share: 100 },
    { label: "Terminaram as perguntas", help: "Concluíram o onboarding.", count: a.onboarded, share: share(a.onboarded) },
    { label: "Fizeram o 1º treino", help: "Ao menos uma atividade depois do cadastro.", count: a.firstTraining, share: share(a.firstTraining) },
    { label: "Voltaram em outro dia", help: "Treinaram em mais de um dia desde o cadastro.", count: a.returned, share: share(a.returned) },
  ];
}

/** A passagem que mais perde gente, em frase. */
export function funnelSentence(steps: FunnelStep[]): string {
  if (!steps[0]?.count) return "Ninguém se cadastrou no período.";
  let worst = { from: steps[0], to: steps[1], lost: -1 };
  for (let i = 1; i < steps.length; i++) {
    const lost = steps[i - 1].count - steps[i].count;
    if (lost > worst.lost) worst = { from: steps[i - 1], to: steps[i], lost };
  }
  if (worst.lost <= 0) return "Ninguém se perdeu no caminho neste período.";
  return `A maior perda é entre "${worst.from.label.toLowerCase()}" e "${worst.to.label.toLowerCase()}": ${fmt(worst.lost)} ${worst.lost === 1 ? "pessoa parou" : "pessoas pararam"} ali.`;
}

/** O resumo do topo: o período em até cinco frases, cada uma com um número interpretado. */
export function summarySentences(data: DashboardOverview): string[] {
  const { kpis, period } = data;
  const out: string[] = [];
  const active = kpis.activeUsers;
  const change =
    active.previous > 0
      ? Math.round(((active.value - active.previous) / active.previous) * 100)
      : null;
  out.push(
    `${fmt(active.value)} ${active.value === 1 ? "pessoa treinou" : "pessoas treinaram"} nos últimos ${period.days} dias` +
      (change == null
        ? "."
        : change === 0
          ? ", o mesmo que nos dias anteriores."
          : `, ${Math.abs(change)}% ${change > 0 ? "a mais" : "a menos"} que nos ${period.days} dias anteriores.`),
  );
  const n = kpis.newUsers;
  out.push(
    n.value
      ? `${fmt(n.value)} ${n.value === 1 ? "pessoa nova chegou" : "pessoas novas chegaram"}; ${fmt(n.activated)} (${fmtPct(Math.round((n.activated / n.value) * 100))}) já ${n.activated === 1 ? "fez" : "fizeram"} o primeiro treino.`
      : "Ninguém se cadastrou no período.",
  );
  const best = bestWeekday(data.weekday);
  if (best) out.push(weekdaySentence(data.weekday).split(" O mais fraco")[0]);
  const peak = peakHour(data.hourly);
  if (peak) out.push(`O horário de pico é ${hourRange(peak.hour)}.`);
  const r = kpis.retention;
  if (r.value != null && r.base > 0) {
    out.push(`Dos ${fmt(r.base)} que treinaram no período anterior, ${fmtPct(r.value)} voltaram neste.`);
  }
  return out;
}
