/** Painel de custos (GET /admin/billing, 14/11/2026). Valores em US$, estimados pelo uso registrado. */

export type BillingStatus = "ok" | "near" | "over" | "unset";

export interface BillingItem {
  id: string;
  name: string;
  provider: string;
  kind: "FIXED" | "USAGE";
  active: boolean;
  unitType: string | null;
  usedUnits: number;
  quotaUnits: number | null;
  spentUsd: number;
  forecastUsd: number;
  budgetUsd: number | null;
  quotaPct: number | null;
  budgetPct: number | null;
  alertPct: number;
  status: BillingStatus;
  calls: number;
  notes: string | null;
  source: string | null;
  usageProvider: string | null;
  usageFeature: string | null;
  usdPerUnit: number | null;
}

export interface BillingAlert {
  id: string;
  level: "warning" | "critical";
  title: string;
  detail: string;
  href: string;
}

export interface BillingOverview {
  month: { key: string; start: string; end: string; days: number; elapsedDays: number };
  totals: {
    fixedUsd: number;
    usageUsd: number;
    spentUsd: number;
    forecastUsd: number;
    usageForecastUsd: number;
    previousUsageUsd: number;
    fixedMissing: number;
  };
  items: BillingItem[];
  byProvider: { provider: string; usd: number; calls: number; units: number }[];
  byFeature: { provider: string; feature: string; units: number; usd: number; calls: number; covered: boolean }[];
  byDay: { day: string; providers: Record<string, number> }[];
  topUsers: { userId: string; name: string | null; email: string | null; usd: number; calls: number }[];
  alerts: BillingAlert[];
}

export const usd = (n: number, digits = 2) =>
  `US$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;

/** "3,4 mi", "820 mil", "1.204". */
export function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  if (n >= 10_000) return `${Math.round(n / 1000).toLocaleString("pt-BR")} mil`;
  return n.toLocaleString("pt-BR");
}

export const UNIT_LABEL: Record<string, string> = {
  chars: "caracteres",
  tokens: "tokens",
  minutes: "min",
  calls: "chamadas",
};

export const PROVIDER_LABEL: Record<string, string> = {
  google: "Google",
  openrouter: "OpenRouter",
  openai: "OpenAI",
  gemini: "Gemini",
  recall: "Recall.ai",
  deepgram: "Deepgram",
  oci: "Oracle Cloud",
  postgres: "PostgreSQL",
  aws: "AWS",
  vercel: "Vercel",
};

export const providerLabel = (p: string) => PROVIDER_LABEL[p] ?? p;

/** O que cada chamada faz no produto (feature gravada no AiUsage). */
const FEATURE_LABEL: Record<string, string> = {
  tts: "Voz das personas",
  "participant-turn": "Fala da persona na sala",
  objectives: "Objetivos da conversa",
  "speech-builder": "Montador de discurso",
  "assistant-rag": "Assistente (busca)",
  "meeting-bot": "Bot em reuniões",
  unknown: "Sem rótulo",
};

export const featureLabel = (f: string) => FEATURE_LABEL[f] ?? f;
