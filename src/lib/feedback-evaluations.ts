/**
 * Avaliação do feedback pelo usuário (elovoz-api docs/avaliacao-de-feedback.md).
 * Tipos das rotas /admin/feedback-evaluations e textos do painel.
 */

export type EvalTarget = "ANALYSIS" | "ASPECT" | "LLM_TEXT" | "SELF_ASSESSMENT" | "TRANSCRIPT" | "IMPLICIT";
export type EvalStatus = "SHOWN" | "ANSWERED" | "DISMISSED";
export type EvalVerdict = "AGREE" | "PARTIAL" | "DISAGREE";

export interface AgreementCell {
  key: string;
  n: number;
  agree: number;
  partial: number;
  disagree: number;
  rate: number | null;
}

export interface SummaryAlert {
  kind: "low_agreement" | "drop";
  scope: "aspect" | "phrase" | "prompt" | "copy";
  key: string;
  n: number;
  rate: number;
  previousRate?: number;
}

export interface FunnelBlock {
  shown: number;
  answered: number;
  dismissed: number;
  pending: number;
}

export interface EvaluationSummary {
  days: number;
  global: AgreementCell;
  byAspect: AgreementCell[];
  byAspectBand: AgreementCell[];
  byPhrase: AgreementCell[];
  byPromptVersion: AgreementCell[];
  byCopyVersion: AgreementCell[];
  byRule: AgreementCell[];
  byLlmText: AgreementCell[];
  topReasons: Array<{ reason: string; n: number }>;
  alerts: SummaryAlert[];
  funnel: { global: FunnelBlock; selfAssessment: FunnelBlock; respondents: number };
}

export interface EvaluationRow {
  id: string;
  userId: string;
  analysisJobId: string;
  targetType: EvalTarget;
  targetKey: string;
  status: EvalStatus;
  verdict: EvalVerdict | null;
  value: Record<string, unknown> | null;
  reasons: string[];
  comment: string | null;
  snapshot: Record<string, unknown>;
  resultFingerprint: string;
  generatorMeta: Record<string, unknown>;
  promptVersion: string | null;
  copyVersion: string | null;
  phraseId: string | null;
  band: number | null;
  surface: string;
  source: "WEB" | "APP";
  askRule: string | null;
  dwellMs: number | null;
  aiCategories: string[];
  aiCriteria: string | null;
  aiProcessedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; name: string; email: string };
  analysisJob?: { id: string; kind: string; title: string | null; overallScore: number | null };
}

export interface EvaluationPage {
  total: number;
  page: number;
  pageSize: number;
  items: EvaluationRow[];
}

export interface EvaluationDetail {
  evaluation: EvaluationRow;
  siblings: EvaluationRow[];
  job: {
    id: string;
    kind: string;
    title: string | null;
    status: string;
    overallScore: number | null;
    durationSeconds: number | null;
    completedAt: string | null;
    result: unknown;
    resultMeta: Record<string, unknown> | null;
    resultFingerprint: string | null;
    analysisItems: unknown;
    transcript: string | null;
    audioUrl: string | null;
    stale: boolean;
  };
}

export interface EvaluationSettings {
  baseSampleRate: number;
  maxAsksPerDay: number;
  maxAsksPerWeek: number;
  pauseAfterDismissStreak: number;
  pauseDays: number;
  newVersionQuota: number;
  selfGapBands: number;
  onboardingAnalyses: number[];
  fallbackAskRate: number;
}

export const evalKeys = {
  all: ["feedback-evaluations"] as const,
  summary: (days: number) => ["feedback-evaluations", "summary", days] as const,
  list: (params: string) => ["feedback-evaluations", "list", params] as const,
  detail: (id: string) => ["feedback-evaluations", "detail", id] as const,
  settings: () => ["feedback-evaluations", "settings"] as const,
};

export const TARGET_LABEL: Record<EvalTarget, string> = {
  ANALYSIS: "Análise inteira",
  ASPECT: "Aspecto",
  LLM_TEXT: "Texto da IA",
  SELF_ASSESSMENT: "Autoavaliação",
  TRANSCRIPT: "Transcrição",
  IMPLICIT: "Sinais de uso",
};

export const VERDICT_LABEL: Record<EvalVerdict, string> = {
  AGREE: "Bateu",
  PARTIAL: "Em parte",
  DISAGREE: "Não bateu",
};

export const STATUS_LABEL: Record<EvalStatus, string> = {
  SHOWN: "Mostrada",
  ANSWERED: "Respondida",
  DISMISSED: "Descartada",
};

export const REASON_LABEL: Record<string, string> = {
  too_high: "Melhor do que fui",
  too_low: "Pior do que fui",
  wrong_facts: "Não aconteceu",
  transcript_error: "Transcrição errou",
  advice_not_useful: "Conselho não serve",
  unclear: "Não entendi",
  other: "Outro",
};

export const ASPECT_LABEL: Record<string, string> = {
  pace: "Ritmo",
  fillers: "Muletas",
  pauses: "Pausas",
  voice: "Voz",
  endings: "Finais de frase",
  confidence: "Segurança",
  concision: "Concisão",
  clarity: "Clareza",
  structure: "Estrutura",
  engagement: "Envolvimento",
  summary: "Resumo da IA",
  tip: "Dica da IA",
};

export const RULE_LABEL: Record<string, string> = {
  first_analyses: "Primeiras análises",
  self_gap: "Percepção longe da nota",
  new_version: "Versão nova",
  fallback: "Resultado sem IA",
  sample: "Amostra",
  "sem regra": "Sem regra",
};

export const FELT_LABEL: Record<string, string> = {
  flowed: "Fluiu",
  so_so: "Mais ou menos",
  stuck: "Travei",
};

export function reasonLabel(reason: string): string {
  const ai = reason.startsWith("ai:");
  const key = ai ? reason.slice(3) : reason;
  const label = REASON_LABEL[key] ?? key;
  return ai ? `${label} (IA)` : label;
}

export function pct(rate: number | null | undefined): string {
  if (rate == null) return "—";
  return `${Math.round(rate * 100)}%`;
}

const SCOPE_NOUN: Record<SummaryAlert["scope"], string> = {
  aspect: "O aspecto",
  phrase: "A frase",
  prompt: "A versão de prompt",
  copy: "A versão do catálogo",
};

/** Alerta em uma frase que já diz o que fazer com ele. */
export function alertSentence(a: SummaryAlert): string {
  const name = a.scope === "aspect" ? `“${ASPECT_LABEL[a.key] ?? a.key}”` : `“${a.key}”`;
  if (a.kind === "drop") {
    return `${SCOPE_NOUN[a.scope]} ${name} caiu de ${pct(a.previousRate)} para ${pct(a.rate)} de concordância na última semana (${a.n} respostas).`;
  }
  return `${SCOPE_NOUN[a.scope]} ${name} bate com a percepção de só ${pct(a.rate)} das pessoas (${a.n} respostas).`;
}

export function overviewSentence(s: EvaluationSummary): string {
  const g = s.funnel.global;
  if (g.answered === 0) return `Ninguém respondeu à pergunta “bateu?” nos últimos ${s.days} dias.`;
  const responseRate = g.shown ? g.answered / g.shown : null;
  return (
    `Nos últimos ${s.days} dias, ${s.funnel.respondents} ${s.funnel.respondents === 1 ? "pessoa respondeu" : "pessoas responderam"} ` +
    `${g.answered} ${g.answered === 1 ? "vez" : "vezes"}; ${pct(s.global.rate)} disseram que o retorno bateu. ` +
    `A pergunta foi respondida em ${pct(responseRate)} das vezes que apareceu e descartada em ${pct(g.shown ? g.dismissed / g.shown : null)}.`
  );
}
