import type {
  EnrichmentListStatus,
  EnrichmentReason,
  EnrichmentSignals,
  ProfileEnrichment,
} from "@/lib/types";
import { cn, formatDateTime } from "@/lib/utils";

export const REASON_LABEL: Record<EnrichmentReason, string> = {
  NO_ONBOARDING: "Sem onboarding",
  FREE_TEXT: 'Respondeu "Outro"',
  NO_SEGMENT: "Sem segmento",
};

export const STATUS_LABEL: Record<EnrichmentListStatus, string> = {
  READY: "Perfil inferido",
  NOT_PROCESSED: "Não processado",
  INSUFFICIENT_DATA: "Dados insuficientes",
  FAILED: "Falhou",
};

export function confidenceLevel(value: number | null) {
  if (value == null) return null;
  if (value >= 0.75) return "alta";
  if (value >= 0.5) return "média";
  return "baixa";
}

export function ConfidenceMeter({
  value,
  className,
}: {
  value: number | null;
  className?: string;
}) {
  if (value == null) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }
  const pct = Math.round(value * 100);
  const level = confidenceLevel(value);
  return (
    <div className={cn("w-24 space-y-1", className)} title={`Confiança ${level}`}>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="text-foreground font-medium tabular-nums">{pct}%</span>
        <span className="text-muted-foreground">{level}</span>
      </div>
      <div className="bg-muted h-1.5 overflow-hidden rounded-full">
        <div
          className={cn(
            "h-full rounded-full",
            value >= 0.75 ? "bg-primary" : value >= 0.5 ? "bg-primary/60" : "bg-muted-foreground/40",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function StatusText({ status }: { status: EnrichmentListStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs whitespace-nowrap",
        status === "READY" ? "text-foreground" : "text-muted-foreground",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-2 rounded-full",
          status === "READY" && "bg-primary",
          status === "NOT_PROCESSED" && "border-muted-foreground/60 border border-dashed",
          status === "INSUFFICIENT_DATA" && "bg-muted-foreground/40",
          status === "FAILED" && "bg-destructive",
        )}
      />
      {STATUS_LABEL[status]}
    </span>
  );
}

/** Retrato completo do perfil inferido, usado na listagem e no detalhe do usuário. */
export function EnrichmentProfile({
  enrichment,
  signals,
}: {
  enrichment: ProfileEnrichment;
  signals?: EnrichmentSignals | null;
}) {
  const facts: Array<[string, string | null]> = [
    ["Segmento", enrichment.inferredSegmentLabel],
    ["Foco", enrichment.inferredObjectiveLabel],
    ["Papel", enrichment.inferredAudienceLabel],
    ["Dificuldade", enrichment.inferredObstacleLabel],
    ["Ocupação", enrichment.occupation],
    ["Setor", enrichment.industry],
  ];

  return (
    <div className="space-y-4 text-sm">
      {enrichment.summary && (
        <p className="text-base leading-relaxed text-pretty">{enrichment.summary}</p>
      )}

      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-3">
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt className="text-muted-foreground text-xs">{label}</dt>
            <dd className={value ? "font-medium" : "text-muted-foreground"}>
              {value ?? "Sem evidência"}
            </dd>
          </div>
        ))}
      </dl>

      {enrichment.speakingContexts.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-muted-foreground text-xs">Onde precisa falar</p>
          <ul className="flex flex-wrap gap-1.5">
            {enrichment.speakingContexts.map((c) => (
              <li key={c} className="bg-muted rounded-md px-2 py-0.5 text-xs">
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      {enrichment.goals && (
        <div>
          <p className="text-muted-foreground text-xs">O que quer melhorar</p>
          <p>{enrichment.goals}</p>
        </div>
      )}

      {enrichment.rationale && (
        <div>
          <p className="text-muted-foreground text-xs">Por que chegamos nisso</p>
          <p className="text-muted-foreground">{enrichment.rationale}</p>
        </div>
      )}

      {enrichment.error && (
        <p className="text-destructive">Erro na última tentativa: {enrichment.error}</p>
      )}

      {signals && <SignalsList signals={signals} />}

      <p className="text-muted-foreground text-xs">
        {enrichment.source === "llm" ? "Inferido com IA" : "Inferido por regras"} · atualizado{" "}
        {formatDateTime(enrichment.updatedAt)}
        {enrichment.appliedAt && ` · segmento aplicado em ${formatDateTime(enrichment.appliedAt)}`}
      </p>
    </div>
  );
}

/** Opções do quiz da landing (elevoz). */
const LEAD_LABEL: Record<string, string> = {
  "sales-pitch": "Vendas / pitch comercial",
  presentation: "Apresentação para diretoria ou investidores",
  "social-media": "Vídeo para redes sociais",
  "job-interview": "Entrevista de emprego",
  "daily-meeting": "Reunião diária",
  "memory-blank": "Dar branco",
  "trembling-voice": "Voz trêmula",
  "too-fast": "Falar rápido demais",
  monotone: "Voz monótona",
  "filler-words": "Vícios de linguagem",
  "lack-confidence": "Falta de confiança",
  "poor-structure": "Falta de estrutura",
  high: "urgência alta",
  medium: "urgência média",
  low: "urgência baixa",
};

function SignalsList({ signals }: { signals: EnrichmentSignals }) {
  const o = signals.onboarding;
  const answers = [o.objective, o.audience, o.obstacle].filter(Boolean);
  const lines: Array<[string, string]> = [];

  if (answers.length) lines.push(["Respostas do onboarding", answers.join(" · ")]);
  if (signals.lead) {
    lines.push([
      "Quiz da landing",
      [signals.lead.context, signals.lead.mainPain, signals.lead.urgency]
        .filter((v): v is string => Boolean(v))
        .map((v) => LEAD_LABEL[v] ?? v)
        .join(" · ") || (signals.lead.source ?? "lead encontrado"),
    ]);
  }
  if (signals.emailDomain) lines.push(["Domínio do e-mail", signals.emailDomain]);
  if (signals.customScenarios.length) {
    lines.push(["Cenários que criou", signals.customScenarios.map((s) => s.title).join(" · ")]);
  }
  if (signals.scenariosUsed.length) {
    lines.push([
      "Cenários que treinou",
      signals.scenariosUsed.map((s) => `${s.title} (${s.sessions}×)`).join(" · "),
    ]);
  }
  if (signals.practice.length) {
    lines.push([
      "Práticas",
      signals.practice
        .map((p) => p.customScenario ?? p.preset ?? p.theme ?? p.customContext)
        .filter(Boolean)
        .join(" · "),
    ]);
  }
  if (signals.studiedUnits.length) {
    lines.push([
      "Trilhas estudadas",
      signals.studiedUnits.map((u) => `${u.title} (${u.lessons} lições)`).join(" · "),
    ]);
  }
  if (signals.feedbackComment) lines.push(["Comentário de feedback", signals.feedbackComment]);

  return (
    <details className="group rounded-md border px-3 py-2">
      <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-xs select-none">
        Sinais usados ({lines.length + (signals.transcriptExcerpts.length ? 1 : 0)})
      </summary>
      {lines.length === 0 && !signals.transcriptExcerpts.length ? (
        <p className="text-muted-foreground mt-2 text-xs">Nenhum sinal disponível.</p>
      ) : (
        <dl className="mt-2 space-y-2">
          {lines.map(([label, value]) => (
            <div key={label}>
              <dt className="text-muted-foreground text-xs">{label}</dt>
              <dd className="break-words">{value}</dd>
            </div>
          ))}
          {signals.transcriptExcerpts.length > 0 && (
            <div>
              <dt className="text-muted-foreground text-xs">
                Trechos de fala nos treinos ({signals.transcriptExcerpts.length})
              </dt>
              {signals.transcriptExcerpts.map((t, i) => (
                <dd key={i} className="text-muted-foreground mt-1 italic">
                  “{t}”
                </dd>
              ))}
            </div>
          )}
        </dl>
      )}
    </details>
  );
}
