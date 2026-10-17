/**
 * Relatório de avaliações (GET /admin/feedback-evaluations/report).
 * Tipos copiados de elovoz-api src/feedback-evaluation/evaluation-report.ts e
 * prompts/report-insights-v1.ts. Mantenha em sincronia ao mudar a API.
 */
import type { AgreementCell, SummaryAlert } from "@/lib/feedback-evaluations";

export interface ReportScope {
  from: string;
  to: string;
  days: number;
  kind: string | null;
  promptVersion: string | null;
  user: { id: string; name: string | null; email: string } | null;
}

/** Concordância com o lado do erro: generosa (too_high) ou dura (too_low). */
export interface DirectionCell extends AgreementCell {
  tooHigh: number;
  tooLow: number;
  direction: "generous" | "harsh" | null;
  /** Menos de 10 respostas: ler com cuidado. */
  small: boolean;
}

export interface MetricStats {
  n: number;
  median: number | null;
  p25: number | null;
  p75: number | null;
}

export interface AspectReport extends DirectionCell {
  label: string;
  metric: { path: string; label: string; unit: string } | null;
  metricByVerdict: { agree: MetricStats; partial: MetricStats; disagree: MetricStats } | null;
  metricByDirection: { tooHigh: MetricStats; tooLow: MetricStats } | null;
  byBand: DirectionCell[];
  topReasons: Array<{ reason: string; n: number }>;
}

export interface PhraseReport extends AgreementCell {
  aspect: string;
  band: number | null;
  text: string | null;
}

export interface QuotedComment {
  evaluationId: string;
  jobId: string;
  target: string;
  verdict: string | null;
  reasons: string[];
  comment: string;
  criteria: string | null;
  shown: string | null;
}

export interface ReportCase {
  jobId: string;
  kind: string;
  title: string | null;
  overallScore: number | null;
  durationSeconds: number | null;
  promptVersion: string | null;
  source: string | null;
  verdict: string;
  reasons: string[];
  comment: string | null;
  felt: string | null;
  headline: string | null;
  summary: string | null;
  metrics: Record<string, number>;
  contested: Array<{
    target: string;
    verdict: string | null;
    band: number | null;
    shown: string | null;
    reasons: string[];
    comment: string | null;
  }>;
  transcriptExcerpt: string | null;
}

export interface EvaluationReport {
  scope: ReportScope;
  generatedAt: string;
  totals: {
    answered: number;
    analyses: number;
    respondents: number;
    comments: number;
    staleExcluded: number;
    funnel: { shown: number; answered: number; dismissed: number; responseRate: number | null };
  };
  global: DirectionCell;
  byKind: DirectionCell[];
  byVersion: Array<DirectionCell & { promptVersion: string; copyVersion: string; model: string; source: string }>;
  bySource: DirectionCell[];
  byDuration: DirectionCell[];
  scoreCalibration: Array<DirectionCell & { band: number; label: string; meanScore: number | null }>;
  selfAssessment: {
    n: number;
    rows: Array<{
      felt: string;
      n: number;
      meanScore: number | null;
      agreement: AgreementCell;
      farGap: number;
    }>;
  };
  aspects: AspectReport[];
  worstPhrases: PhraseReport[];
  llmTexts: Array<AgreementCell & { key: string; samples: QuotedComment[] }>;
  transcript: { flagged: number; reasonCount: number; samples: QuotedComment[] };
  reasons: Array<{ reason: string; own: number; ai: number }>;
  criteria: Array<{ text: string; n: number }>;
  commentsByCategory: Array<{ category: string; n: number; quotes: QuotedComment[] }>;
  dwell: { agree: MetricStats; partial: MetricStats; disagree: MetricStats };
  attention: string[];
  alerts: SummaryAlert[];
  cases: ReportCase[];
}

export type InsightArea = "nota" | "metrica" | "frase" | "texto_ia" | "transcricao" | "prompt" | "outro";
export type InsightPriority = "alta" | "media" | "baixa";

export interface ReportInsights {
  model: string | null;
  promptVersion: string;
  summary: string;
  findings: Array<{
    title: string;
    evidence: string;
    area: InsightArea;
    action: string;
    priority: InsightPriority;
  }>;
  promptChanges: Array<{ target: string; change: string; rationale: string }>;
  thresholdChanges: Array<{ metric: string; current: string; suggested: string; rationale: string }>;
  openQuestions: string[];
}

export interface ReportResponse {
  report: EvaluationReport;
  insights: ReportInsights | null;
  insightsError: string | null;
  markdown: string;
}

export interface ReportParams {
  days: number;
  userId: string | null;
  kind: string | null;
  promptVersion: string;
  ai: boolean;
}

export function reportQuery(p: ReportParams): string {
  const q = new URLSearchParams({ days: String(p.days) });
  if (p.userId) q.set("userId", p.userId);
  if (p.kind) q.set("kind", p.kind);
  if (p.promptVersion.trim()) q.set("promptVersion", p.promptVersion.trim());
  if (p.ai) q.set("ai", "true");
  return q.toString();
}

// ─── Rótulos ──────────────────────────────────────────────────────────────────

export const KIND_LABEL: Record<string, string> = {
  TRAINING_ATTEMPT: "Treino",
  LESSON_CHALLENGE: "Desafio de lição",
  RECORDING: "Gravação",
  DRILL: "Micro-treino",
  MEETING: "Reunião",
};

export const DIRECTION_LABEL: Record<"generous" | "harsh", string> = {
  generous: "Generosa",
  harsh: "Dura",
};

export const REPORT_FELT_LABEL: Record<string, string> = {
  flowed: "Fluiu",
  so_so: "Mais ou menos",
  stuck: "Travou",
};

export const PRIORITY_LABEL: Record<InsightPriority, string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

export const AREA_LABEL: Record<InsightArea, string> = {
  nota: "Nota",
  metrica: "Métrica",
  frase: "Frase do catálogo",
  texto_ia: "Texto da IA",
  transcricao: "Transcrição",
  prompt: "Prompt",
  outro: "Outro",
};

export function formatDuration(seconds: number | null): string {
  if (seconds == null) return "—";
  const s = Math.round(seconds);
  if (s < 60) return `${s} s`;
  return `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, "0")} s`;
}

export function statsText(s: MetricStats | undefined | null): string {
  if (!s || s.n === 0 || s.median == null) return "—";
  const fmt = (v: number | null) => (v == null ? "—" : v.toLocaleString("pt-BR"));
  return `${fmt(s.median)} (${fmt(s.p25)}–${fmt(s.p75)})`;
}

/** Nome do arquivo baixado, com a data local. */
export function reportFileName(ext: "md" | "json", generatedAt?: string): string {
  const d = generatedAt ? new Date(generatedAt) : new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return `relatorio-avaliacoes-${date}.${ext}`;
}

export function downloadText(content: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
