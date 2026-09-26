import type {
  QuotaPeriod,
  QuotaPersonRef,
  TrainingQuotaAuditItem,
} from "@/lib/types";

/** Validation bounds from the API contract (docs/cota-de-treinos.md). */
export const QUOTA_LIMIT_MIN = 0;
export const QUOTA_LIMIT_MAX = 50;
export const GRANT_AMOUNT_MIN = 1;
export const GRANT_AMOUNT_MAX = 20;
export const REASON_MIN = 3;
export const REASON_MAX = 500;

export const quotaKeys = {
  all: ["training-quota"] as const,
  overview: () => ["training-quota", "overview"] as const,
  audit: (page: number) => ["training-quota", "audit", page] as const,
  user: (userId: string) => ["training-quota", "user", userId] as const,
};

export const PERIOD_LABEL: Record<QuotaPeriod, string> = {
  WEEK: "Semanal",
  MONTH: "Mensal",
};

const PERIOD_NOUN: Record<QuotaPeriod, string> = {
  WEEK: "semana",
  MONTH: "mês",
};

export const AUDIT_ACTION_LABEL: Record<string, string> = {
  POLICY_UPDATED: "Regra alterada",
  GRANT_CREATED: "Treinos extras concedidos",
};

export function pluralTrainings(n: number): string {
  return `${n} ${n === 1 ? "treino" : "treinos"}`;
}

/** "3 treinos por semana" */
export function formatRule(limit: number, period: QuotaPeriod): string {
  return `${pluralTrainings(limit)} por ${PERIOD_NOUN[period] ?? period}`;
}

/** "3/semana" */
export function formatRuleShort(limit: number, period: QuotaPeriod): string {
  return `${limit}/${PERIOD_NOUN[period] ?? period}`;
}

const MONTHS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

/** "2026-W39" → "Semana 39 de 2026"; "2026-09" → "Setembro de 2026". */
export function formatPeriodKey(key: string): string {
  const week = /^(\d{4})-W(\d{1,2})$/.exec(key);
  if (week) return `Semana ${Number(week[2])} de ${week[1]}`;
  const month = /^(\d{4})-(\d{2})$/.exec(key);
  if (month) {
    const name = MONTHS[Number(month[2]) - 1];
    if (name) return `${name[0].toUpperCase()}${name.slice(1)} de ${month[1]}`;
  }
  return key;
}

export function personLabel(p: QuotaPersonRef | null | undefined): string {
  if (!p) return "—";
  return p.name?.trim() || p.email;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function isPeriod(v: unknown): v is QuotaPeriod {
  return v === "WEEK" || v === "MONTH";
}

function ruleFromJson(v: unknown): string | null {
  const r = asRecord(v);
  if (!r || typeof r.limit !== "number" || !isPeriod(r.period)) return null;
  return formatRuleShort(r.limit, r.period);
}

/**
 * Human-readable before → after for an audit row.
 * The before/after payloads are free-form JSON, so parse defensively and fall
 * back to compact JSON when the shape is unknown.
 */
export function formatAuditChange(item: TrainingQuotaAuditItem): string {
  if (item.action === "POLICY_UPDATED") {
    const before = ruleFromJson(item.before);
    const after = ruleFromJson(item.after);
    if (after) return `${before ?? "padrão"} → ${after}`;
  }

  if (item.action === "GRANT_CREATED") {
    const after = asRecord(item.after);
    const before = asRecord(item.before);
    if (after && typeof after.amount === "number") {
      return `+${pluralTrainings(after.amount)}`;
    }
    if (after && typeof after.bonus === "number") {
      const prev = before && typeof before.bonus === "number" ? before.bonus : 0;
      const diff = after.bonus - prev;
      return `+${pluralTrainings(diff)} (extras: ${prev} → ${after.bonus})`;
    }
  }

  const compact = (v: unknown) =>
    v === null || v === undefined ? "—" : JSON.stringify(v);
  if (item.before == null && item.after == null) return "—";
  return `${compact(item.before)} → ${compact(item.after)}`;
}
