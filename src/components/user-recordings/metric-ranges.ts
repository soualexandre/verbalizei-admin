import type { RecordingKind } from "@/lib/types";

/**
 * A régua única do produto (a mesma da web e do app): o que é bom, o que pede
 * atenção. A cor segue o DESIGN.md: verde = bom, lima = atenção, cinza = no meio.
 */
export type MetricTone = "good" | "attention" | "neutral";

export const KIND_LABEL: Record<RecordingKind, string> = {
  TRAINING_ATTEMPT: "Cenário",
  LESSON_CHALLENGE: "Desafio",
  RECORDING: "Gravação livre",
  DRILL: "Treino curto",
  MEETING: "Reunião real",
};

export const KIND_ORDER: RecordingKind[] = ["TRAINING_ATTEMPT", "DRILL", "LESSON_CHALLENGE", "RECORDING", "MEETING"];

export const kindLabel = (k: string) => KIND_LABEL[k as RecordingKind] ?? k;

export const STATUS_LABEL: Record<string, string> = {
  QUEUED: "Na fila",
  PROCESSING: "Analisando",
  COMPLETED: "Pronta",
  FAILED: "Falhou",
};

export const ERROR_LABEL: Record<string, string> = {
  AUDIO_QUALITY_REJECTED: "Áudio recusado pela qualidade",
  INSUFFICIENT_SPEECH: "Fala curta demais",
  AUDIO_DECODE_FAILED: "Áudio ilegível",
  AUDIO_DOWNLOAD_FAILED: "Áudio não encontrado",
};

export const errorLabel = (code: string | null | undefined) => (code ? ERROR_LABEL[code] ?? code : null);

export const CATEGORY_LABEL: Record<string, string> = {
  clarity: "Clareza",
  structure: "Estrutura",
  pace: "Ritmo",
  engagement: "Envolvimento",
};

export const RANGES = {
  pace: { good: [110, 160] as const, fast: 170, slow: 100, text: "bom entre 110 e 160 palavras/min" },
  fillers: { good: 2, problem: 6, text: "bom até 2 por minuto; acima de 6 atrapalha" },
  pause: { good: 1.5, long: 3, text: "bom até 1,5 s; acima de 3 s fica longa" },
  monotony: { good: 40, problem: 70, text: "bom até 40; a partir de 70 soa monótono" },
};

export function paceTone(wpm: number | null | undefined): MetricTone {
  if (wpm == null) return "neutral";
  if (wpm >= RANGES.pace.good[0] && wpm <= RANGES.pace.good[1]) return "good";
  if (wpm > RANGES.pace.fast || wpm < RANGES.pace.slow) return "attention";
  return "neutral";
}

export function paceWord(wpm: number | null | undefined): string | null {
  if (wpm == null) return null;
  if (wpm > RANGES.pace.fast) return "rápido";
  if (wpm < RANGES.pace.slow) return "devagar";
  if (wpm >= RANGES.pace.good[0] && wpm <= RANGES.pace.good[1]) return "no ponto";
  return "quase no ponto";
}

export function fillersTone(perMin: number | null | undefined): MetricTone {
  if (perMin == null) return "neutral";
  if (perMin <= RANGES.fillers.good) return "good";
  if (perMin > RANGES.fillers.problem) return "attention";
  return "neutral";
}

export function pauseTone(sec: number | null | undefined): MetricTone {
  if (sec == null) return "neutral";
  if (sec <= RANGES.pause.good) return "good";
  if (sec > RANGES.pause.long) return "attention";
  return "neutral";
}

export function monotonyTone(v: number | null | undefined): MetricTone {
  if (v == null) return "neutral";
  if (v <= RANGES.monotony.good) return "good";
  if (v >= RANGES.monotony.problem) return "attention";
  return "neutral";
}

/** Classes do texto de uma medida, pela cor do que ela diz. */
export const TONE_TEXT: Record<MetricTone, string> = {
  good: "text-green-ink",
  attention: "text-lime-ink",
  neutral: "text-foreground",
};

/** Fundo suave da pílula de uma medida. */
export const TONE_PILL: Record<MetricTone, string> = {
  good: "bg-success-soft text-success",
  attention: "bg-warning-soft text-warning",
  neutral: "bg-muted text-foreground",
};

const dec = (n: number, digits = 1) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: digits });

export const fmtNum = (n: number | null | undefined, digits = 1) => (n == null ? "—" : dec(n, digits));
export const fmtSeconds = (n: number | null | undefined) => (n == null ? "—" : `${dec(n, 1)} s`);

/** "2 min 05 s" ou "45 s". */
export function fmtDuration(sec: number | null | undefined): string {
  if (sec == null) return "—";
  const s = Math.round(sec);
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  return `${m} min ${String(s % 60).padStart(2, "0")} s`;
}
