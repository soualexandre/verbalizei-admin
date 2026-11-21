import type {
  BillingCycle,
  BusinessPlanKey,
  PricingLimits,
  PricingPolicy,
  PricingPromo,
  QuotaPeriod,
} from "@/lib/types";

/**
 * Aba Preços (20/11/2026, verbalizei-api/docs/politica-de-precos.md): rótulos,
 * formatação e a margem estimada.
 */

export const pricingKeys = {
  all: ["pricing"] as const,
  view: () => ["pricing", "view"] as const,
  audit: () => ["pricing", "audit"] as const,
  quote: (q: string) => ["pricing", "quote", q] as const,
};

// ─── Margem estimada ────────────────────────────────────────────────────────
// Premissas do estudo "Verbalizei — posicionamento de preço" (18/11/2026).
// São estimativas para comparar planos, não o resultado real do mês.

/** Imposto sobre a receita (Simples), em fração. */
export const MARGIN_TAX = 0.155;
/** Taxa de pagamento no site, em fração (as lojas cobram mais). */
export const MARGIN_SITE_FEE = 0.03;
/** Conversas que uma pessoa faz por mês, em média. */
export const MARGIN_CONVERSATIONS_PER_MONTH = 6;
/** Custo de IA de uma conversa, em reais. */
export const MARGIN_AI_COST_PER_CONVERSATION = 0.12;

/** Custo de IA de um mês, em reais. */
export const MARGIN_AI_COST = MARGIN_CONVERSATIONS_PER_MONTH * MARGIN_AI_COST_PER_CONVERSATION;

/**
 * Margem estimada sobre um preço mensal: (preço − imposto − taxa − custo de IA) / preço.
 * Devolve a fração (0,81 = 81%) ou null sem preço.
 */
export function estimatedMargin(monthlyPrice: number): number | null {
  if (!(monthlyPrice > 0)) return null;
  const net = monthlyPrice * (1 - MARGIN_TAX - MARGIN_SITE_FEE) - MARGIN_AI_COST;
  return net / monthlyPrice;
}

/** As premissas da margem em uma frase. */
export const marginExplained = () =>
  `Estimativa do estudo de preços: tira ${percent(MARGIN_TAX * 100, 1)} de imposto, ${percent(MARGIN_SITE_FEE * 100)} de taxa de pagamento no site e ${formatBRL(MARGIN_AI_COST)} de IA (${MARGIN_CONVERSATIONS_PER_MONTH} conversas por mês a ${formatBRL(MARGIN_AI_COST_PER_CONVERSATION)} cada). Nas lojas a taxa é maior.`;

// ─── Formatação ─────────────────────────────────────────────────────────────

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** R$ 69,90. */
export function formatBRL(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return BRL.format(value);
}

export function percent(value: number, digits = 0): string {
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: digits })}%`;
}

/** Equivalente mensal e economia do anual sobre 12 mensais (mesma conta da API). */
export function annualDeal(monthly: number, annual: number) {
  const full = monthly * 12;
  return {
    perMonth: Math.round((annual / 12) * 100) / 100,
    savingsPercent: full > 0 ? Math.round((1 - annual / full) * 100) : 0,
  };
}

/** "69,90" para um campo de valor. */
export function moneyToInput(v: number | null | undefined): string {
  if (v == null) return "";
  return v.toFixed(2).replace(".", ",");
}

/** Aceita 69,90 · 69.90 · R$ 1.490,00. NaN se não for número; null se vazio. */
export function parseMoneyInput(raw: string): number | null {
  let s = raw.replace(/R\$/i, "").replace(/\s/g, "");
  if (!s) return null;
  // Vírgula é o decimal; sem vírgula, "1.490" é milhar e "69.90" é decimal.
  if (s.includes(",") || /^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(s)) return NaN;
  return Number(s);
}

/** Inteiro de um campo; null se vazio, NaN se não for inteiro. */
export function parseIntInput(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  return /^\d+$/.test(s) ? Number(s) : NaN;
}

// Datas: o dia é o de Brasília (UTC−3, sem horário de verão desde 2019).
const BRT_MS = 3 * 60 * 60 * 1000;

/** ISO → "2026-11-21" (dia em Brasília). */
export function isoToBrtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  return new Date(t - BRT_MS).toISOString().slice(0, 10);
}

/** "2026-11-21" → começo do dia em Brasília (ISO). */
export function brtDateToStartIso(date: string): string {
  return new Date(Date.parse(`${date}T00:00:00.000Z`) + BRT_MS).toISOString();
}

/** "2026-11-30" → fim do dia em Brasília (ISO). */
export function brtDateToEndIso(date: string): string {
  return new Date(Date.parse(`${date}T23:59:59.999Z`) + BRT_MS).toISOString();
}

/** 21/11/2026, no dia de Brasília. */
export function formatBrtDate(iso: string | null | undefined): string {
  const d = isoToBrtDate(iso);
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

// ─── Rótulos ────────────────────────────────────────────────────────────────

export const BUSINESS_PLAN_NAME: Record<BusinessPlanKey, string> = {
  ESSENCIAL: "Times Essencial",
  PRO: "Times Pro",
  PILOTO: "Piloto de 30 dias",
  EMPRESA: "Empresa",
};

export const BUSINESS_PLANS: BusinessPlanKey[] = ["ESSENCIAL", "PRO", "PILOTO", "EMPRESA"];

export const CYCLE_LABEL: Record<BillingCycle, string> = {
  ANNUAL: "Anual",
  MONTHLY: "Mensal",
};

export const PERIOD_WORD: Record<QuotaPeriod, string> = {
  WEEK: "por semana",
  MONTH: "por mês",
};

export const plural = (n: number, one: string, many: string) => `${n.toLocaleString("pt-BR")} ${n === 1 ? one : many}`;

export type PromoStatus = "live" | "scheduled" | "ended" | "off";

export const PROMO_STATUS: Record<PromoStatus, { label: string; variant: "success" | "default" | "secondary" | "outline" }> = {
  live: { label: "Valendo agora", variant: "success" },
  scheduled: { label: "Agendada", variant: "default" },
  ended: { label: "Encerrada", variant: "secondary" },
  off: { label: "Desligada", variant: "outline" },
};

export function promoStatus(p: PricingPromo, now = Date.now()): PromoStatus {
  if (!p.enabled) return "off";
  if (now < Date.parse(p.startsAt)) return "scheduled";
  if (now > Date.parse(p.endsAt)) return "ended";
  return "live";
}

/**
 * O nome de cada campo como a pessoa lê, pelo caminho da API (sem o prefixo
 * `policy.`; os limites começam com `limits.`).
 */
const FIELD_LABEL: Record<string, string> = {
  "consumer.starter.monthly": "Super mensal",
  "consumer.starter.annual": "Super anual",
  "consumer.max.monthly": "Max mensal",
  "consumer.max.annual": "Max anual",
  "consumer.max.fairUsePerMonth": "Uso justo do Max",
  "consumer.max.fairUseStartsAt": "Início do uso justo do Max",
  "consumer.pass.enabled": "Passe à venda",
  "consumer.pass.amount": "Preço do Passe",
  "consumer.pass.days": "Dias do Passe",
  "consumer.pass.conversations": "Conversas do Passe",
  "business.minSeats": "Mínimo de pessoas",
  "business.essencial.annual": "Essencial anual",
  "business.essencial.monthly": "Essencial mensal",
  "business.essencial.maxSeats": "Máximo de pessoas do Essencial",
  "business.pro.annual": "Pro anual",
  "business.pro.monthly": "Pro mensal",
  "business.pro.maxSeats": "Máximo de pessoas do Pro",
  "business.pilot.amount": "Preço do Piloto",
  "business.pilot.seats": "Pessoas do Piloto",
  "business.pilot.days": "Dias do Piloto",
  "business.enterprise.floorAnnual": "Piso do Empresa",
  "business.partnerDiscountPercent": "Desconto de parceiro",
  "business.fairUsePerPerson": "Uso justo por pessoa nas empresas",
  "limits.free.limit": "Conversas do Grátis",
  "limits.free.period": "Período do Grátis",
  "limits.free.drillsPerDay": "Treinos curtos do Grátis",
  "limits.starter.limit": "Conversas do Super",
  "limits.starter.period": "Período do Super",
};

const PROMO_FIELD_LABEL: Record<string, string> = {
  name: "nome",
  startsAt: "início",
  endsAt: "fim",
  enabled: "ligada",
  maxMonthly: "Max mensal",
  maxAnnual: "Max anual",
  hideStarter: "esconder o Super",
};

/** "consumer.max.annual" → "Max anual"; "promos.0.maxMonthly" → "Promoção 1: Max mensal". */
export function fieldLabel(path: string): string {
  const p = path.replace(/^policy\./, "");
  const promo = /^promos\.(\d+)\.(\w+)$/.exec(p);
  if (promo) return `Promoção ${Number(promo[1]) + 1}: ${PROMO_FIELD_LABEL[promo[2]] ?? promo[2]}`;
  return FIELD_LABEL[p] ?? p;
}

const MONEY_FIELDS = /(monthly|annual|amount|floorAnnual|maxMonthly|maxAnnual)$/;

/** O valor de um campo no histórico: R$, "sem limite", data, sim/não. */
export function formatFieldValue(path: string, v: unknown): string {
  const p = path.replace(/^policy\./, "");
  if (v === null || v === undefined) {
    if (/fairUse|drillsPerDay/.test(p)) return "sem limite";
    return "nenhum";
  }
  if (typeof v === "boolean") return v ? "sim" : "não";
  if (typeof v === "number") {
    if (MONEY_FIELDS.test(p)) return formatBRL(v);
    if (/Percent$/.test(p)) return percent(v);
    return v.toLocaleString("pt-BR");
  }
  if (typeof v === "string") {
    if (v === "WEEK" || v === "MONTH") return PERIOD_WORD[v];
    if (/At$/.test(p)) return formatBrtDate(v);
    return v;
  }
  return JSON.stringify(v);
}

const promoPrice = (p: PricingPromo) =>
  [p.maxMonthly != null ? `${formatBRL(p.maxMonthly)} no mensal` : null, p.maxAnnual != null ? `${formatBRL(p.maxAnnual)} no anual` : null]
    .filter(Boolean)
    .join(" e ");

/**
 * Uma mudança do histórico em frases. As promoções chegam como a lista
 * inteira (antes e depois): compara pela id.
 */
export function describeChange(c: { path: string; before: unknown; after: unknown }): string[] {
  const p = c.path.replace(/^policy\./, "");
  if (p !== "promos") return [`${fieldLabel(p)}: ${formatFieldValue(p, c.before)} → ${formatFieldValue(p, c.after)}`];

  const before = (Array.isArray(c.before) ? c.before : []) as PricingPromo[];
  const after = (Array.isArray(c.after) ? c.after : []) as PricingPromo[];
  const lines: string[] = [];
  for (const a of after) {
    const b = before.find((x) => x.id === a.id);
    if (!b) {
      lines.push(`Promoção "${a.name}" criada: ${promoPrice(a)}, de ${formatBrtDate(a.startsAt)} a ${formatBrtDate(a.endsAt)}`);
      continue;
    }
    const diffs: string[] = [];
    for (const k of Object.keys(PROMO_FIELD_LABEL) as Array<keyof PricingPromo>) {
      if (JSON.stringify(a[k]) === JSON.stringify(b[k])) continue;
      if (k === "enabled") {
        diffs.push(a.enabled ? "ligada" : "desligada");
        continue;
      }
      diffs.push(`${PROMO_FIELD_LABEL[k]} ${formatFieldValue(k, b[k])} → ${formatFieldValue(k, a[k])}`);
    }
    if (diffs.length) lines.push(`Promoção "${a.name}": ${diffs.join(", ")}`);
  }
  for (const b of before) if (!after.some((a) => a.id === b.id)) lines.push(`Promoção "${b.name}" removida`);
  return lines.length ? lines : ["Promoções reorganizadas"];
}

// ─── Rascunho dos diálogos ──────────────────────────────────────────────────

export interface PricingDraft {
  policy: PricingPolicy;
  limits: PricingLimits;
}

/** Lê um campo pelo caminho da API (`limits.` vai nos limites; o resto, na política). */
export function getField(d: PricingDraft, path: string): unknown {
  const [root, parts] = path.startsWith("limits.") ? [d.limits, path.slice(7).split(".")] : [d.policy, path.split(".")];
  let cur: unknown = root;
  for (const k of parts) cur = cur && typeof cur === "object" ? (cur as Record<string, unknown>)[k] : undefined;
  return cur;
}

/** Devolve uma cópia do rascunho com o campo trocado. */
export function setField(d: PricingDraft, path: string, value: unknown): PricingDraft {
  const next = structuredClone(d);
  const [root, parts] = path.startsWith("limits.") ? [next.limits, path.slice(7).split(".")] : [next.policy, path.split(".")];
  let cur = root as unknown as Record<string, unknown>;
  for (const k of parts.slice(0, -1)) cur = cur[k] as Record<string, unknown>;
  cur[parts[parts.length - 1]] = value;
  return next;
}
