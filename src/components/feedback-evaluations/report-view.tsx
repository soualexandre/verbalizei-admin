"use client";

import type { ReactNode } from "react";
import { AlertTriangle, Copy, ExternalLink, Info, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/utils";
import {
  ASPECT_LABEL,
  TARGET_LABEL,
  VERDICT_LABEL,
  alertSentence,
  pct,
  reasonLabel,
  type EvalTarget,
  type EvalVerdict,
} from "@/lib/feedback-evaluations";
import {
  AREA_LABEL,
  DIRECTION_LABEL,
  KIND_LABEL,
  PRIORITY_LABEL,
  REPORT_FELT_LABEL,
  formatDuration,
  statsText,
  type AspectReport,
  type DirectionCell,
  type EvaluationReport,
  type InsightPriority,
  type QuotedComment,
  type ReportCase,
  type ReportInsights,
  type ReportResponse,
} from "@/lib/evaluation-report";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type OpenEvaluation = (evaluationId: string) => void;

export function ReportView({ data, onOpenEvaluation }: { data: ReportResponse; onOpenEvaluation: OpenEvaluation }) {
  const r = data.report;
  return (
    <div className="space-y-6">
      <ScopeCard report={r} />
      <AttentionCard report={r} />
      {data.insights && <InsightsCard insights={data.insights} />}
      {data.insightsError && (
        <p className="text-muted-foreground flex items-start gap-2 rounded-md border border-dashed p-3 text-sm">
          <Info className="mt-0.5 size-4 shrink-0" />
          As recomendações da IA não vieram: {data.insightsError}
        </p>
      )}
      <ClarityCard report={r} />
      <AgreementSection report={r} />
      <div className="grid gap-6 lg:grid-cols-2">
        <CalibrationCard report={r} />
        <SelfAssessmentCard report={r} />
      </div>
      <AspectsSection aspects={r.aspects} />
      <PhrasesAndTexts report={r} onOpenEvaluation={onOpenEvaluation} />
      <ReasonsSection report={r} onOpenEvaluation={onOpenEvaluation} />
      <CasesSection cases={r.cases} onOpenEvaluation={onOpenEvaluation} />
    </div>
  );
}

// ─── Peças ────────────────────────────────────────────────────────────────────

function Section({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Empty({ children = "Sem respostas no recorte." }: { children?: ReactNode }) {
  return <p className="text-muted-foreground text-sm">{children}</p>;
}

function VerdictBadge({ verdict }: { verdict: string | null }) {
  if (!verdict) return <Badge variant="outline">Sem resposta</Badge>;
  const variant: Record<EvalVerdict, "success" | "warning" | "destructive"> = {
    AGREE: "success",
    PARTIAL: "warning",
    DISAGREE: "destructive",
  };
  const v = verdict as EvalVerdict;
  return <Badge variant={variant[v] ?? "outline"}>{VERDICT_LABEL[v] ?? verdict}</Badge>;
}

function DirectionBadge({ direction }: { direction: DirectionCell["direction"] }) {
  if (!direction) return <span className="text-muted-foreground">—</span>;
  return <Badge variant={direction === "generous" ? "warning" : "secondary"}>{DIRECTION_LABEL[direction]}</Badge>;
}

function Reasons({ reasons }: { reasons: string[] }) {
  if (!reasons.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {reasons.map((r) => (
        <Badge key={r} variant={r.startsWith("ai:") ? "outline" : "secondary"}>
          {reasonLabel(r)}
        </Badge>
      ))}
    </div>
  );
}

function aspectName(key: string): string {
  return ASPECT_LABEL[key] ?? key;
}

/** "ASPECT:pace" → "Aspecto: Ritmo"; "ANALYSIS" → "Análise inteira". */
function targetName(target: string): string {
  const [type, key] = target.split(":");
  const label = TARGET_LABEL[type as EvalTarget] ?? type;
  return key ? `${label}: ${aspectName(key)}` : label;
}

const rateClass = (c: { rate: number | null; small?: boolean }) =>
  c.rate != null && !c.small && c.rate < 0.55 ? "text-amber-600" : undefined;

function CopyButton({ text, label = "Copiar" }: { text: string; label?: string }) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          toast.success("Copiado.");
        } catch {
          toast.error("Não foi possível copiar.");
        }
      }}
    >
      <Copy className="size-3.5" />
      {label}
    </Button>
  );
}

// ─── Escopo e totais ──────────────────────────────────────────────────────────

function ScopeCard({ report: r }: { report: EvaluationReport }) {
  const t = r.totals;
  const s = r.scope;
  const items: Array<[string, ReactNode]> = [
    ["Período", `${formatDateTime(s.from)} a ${formatDateTime(s.to)} (${s.days} dias)`],
    ["Pessoa", s.user ? `${s.user.name ?? "Sem nome"} · ${s.user.email}` : "Todas"],
    ["Tipo de análise", s.kind ? (KIND_LABEL[s.kind] ?? s.kind) : "Todos"],
    ["Versão do prompt", s.promptVersion ?? "Todas"],
    ["Respostas", t.answered],
    ["Análises", t.analyses],
    ["Respondentes", t.respondents],
    ["Comentários", t.comments],
    [
      "Taxa de resposta",
      `${pct(t.funnel.responseRate)} (${t.funnel.answered} de ${t.funnel.shown} perguntas; ${t.funnel.dismissed} descartadas)`,
    ],
    ["Excluídas por reprocessamento", t.staleExcluded],
    [
      "Tempo até responder",
      `bateu ${statsText(r.dwell.agree)} s · em parte ${statsText(r.dwell.partial)} s · não bateu ${statsText(r.dwell.disagree)} s`,
    ],
  ];
  return (
    <Section title="Escopo e totais" description={`Gerado em ${formatDateTime(r.generatedAt)}.`}>
      <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
        {items.map(([k, v]) => (
          <div key={k}>
            <dt className="text-muted-foreground text-xs">{k}</dt>
            <dd className="tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}

function AttentionCard({ report: r }: { report: EvaluationReport }) {
  if (!r.attention.length && !r.alerts.length) return null;
  return (
    <Card className="border-amber-300 dark:border-amber-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="size-4 text-amber-600" />
          Pontos de atenção
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {r.attention.length > 0 && (
          <ul className="list-disc space-y-1.5 pl-5 text-sm">
            {r.attention.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        )}
        {r.alerts.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-muted-foreground text-xs font-medium uppercase">Alertas</p>
            <ul className="space-y-1.5 text-sm">
              {r.alerts.map((a) => (
                <li key={`${a.kind}:${a.scope}:${a.key}`}>{alertSentence(a)}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Recomendações da IA ──────────────────────────────────────────────────────

const PRIORITY_VARIANT: Record<InsightPriority, "destructive" | "warning" | "secondary"> = {
  alta: "destructive",
  media: "warning",
  baixa: "secondary",
};

function InsightsCard({ insights: i }: { insights: ReportInsights }) {
  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="text-primary size-4" />
          Recomendações da IA
        </CardTitle>
        <CardDescription>
          {i.model ?? "Modelo desconhecido"} · {i.promptVersion}. Leia como hipótese: confira os números nas seções
          abaixo antes de mudar algo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 text-sm">
        <p className="leading-relaxed whitespace-pre-wrap">{i.summary}</p>

        {i.findings.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold">Achados</h3>
            <ol className="space-y-3">
              {i.findings.map((f, idx) => (
                <li key={idx} className="space-y-1.5 rounded-md border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{f.title}</span>
                    <Badge variant={PRIORITY_VARIANT[f.priority]}>Prioridade {PRIORITY_LABEL[f.priority].toLowerCase()}</Badge>
                    <Badge variant="outline">{AREA_LABEL[f.area] ?? f.area}</Badge>
                  </div>
                  {f.evidence && (
                    <p className="text-muted-foreground">
                      <strong className="text-foreground">Evidência:</strong> {f.evidence}
                    </p>
                  )}
                  <p>
                    <strong>Ação:</strong> {f.action}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        )}

        {i.promptChanges.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold">Mudanças de prompt</h3>
            {i.promptChanges.map((p, idx) => (
              <div key={idx} className="space-y-2 rounded-md border p-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline">{p.target}</Badge>
                  <CopyButton text={p.change} />
                </div>
                <pre className="bg-muted rounded-md p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">
                  {p.change}
                </pre>
                {p.rationale && <p className="text-muted-foreground">{p.rationale}</p>}
              </div>
            ))}
          </div>
        )}

        {i.thresholdChanges.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold">Mudanças de limiar</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Métrica</TableHead>
                  <TableHead>Atual → sugerido</TableHead>
                  <TableHead>Por quê</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {i.thresholdChanges.map((t, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{t.metric}</TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums">
                      {t.current || "—"} → <strong>{t.suggested}</strong>
                    </TableCell>
                    <TableCell className="min-w-64 whitespace-normal">{t.rationale}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {i.openQuestions.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold">Perguntas em aberto</h3>
            <ul className="list-disc space-y-1 pl-5">
              {i.openQuestions.map((q, idx) => (
                <li key={idx}>{q}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Concordância ─────────────────────────────────────────────────────────────

function DirectionTable<T extends DirectionCell>({
  cells,
  label,
  first = "Recorte",
  extra,
}: {
  cells: T[];
  label: (c: T) => ReactNode;
  first?: string;
  extra?: { head: string; cell: (c: T) => ReactNode };
}) {
  if (!cells.length) return <Empty />;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{first}</TableHead>
          {extra && <TableHead className="text-right">{extra.head}</TableHead>}
          <TableHead className="text-right">n</TableHead>
          <TableHead className="text-right">Concordância</TableHead>
          <TableHead className="text-right">Em parte</TableHead>
          <TableHead className="text-right">Não bateu</TableHead>
          <TableHead className="text-right">Alta demais</TableHead>
          <TableHead className="text-right">Baixa demais</TableHead>
          <TableHead>Lado do erro</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {cells.map((c) => (
          <TableRow key={c.key} className={c.small ? "text-muted-foreground" : undefined}>
            <TableCell className="whitespace-normal">{label(c)}</TableCell>
            {extra && <TableCell className="text-right tabular-nums">{extra.cell(c)}</TableCell>}
            <TableCell className="text-right tabular-nums">
              <span className="inline-flex items-center gap-1.5">
                {c.small && (
                  <Badge variant="outline" title="Menos de 10 respostas: leia com cuidado">
                    amostra pequena
                  </Badge>
                )}
                {c.n}
              </span>
            </TableCell>
            <TableCell className="text-right font-medium tabular-nums">
              <span className={rateClass(c)}>{pct(c.rate)}</span>
            </TableCell>
            <TableCell className="text-right tabular-nums">{c.partial}</TableCell>
            <TableCell className="text-right tabular-nums">{c.disagree}</TableCell>
            <TableCell className="text-right tabular-nums">{c.tooHigh}</TableCell>
            <TableCell className="text-right tabular-nums">{c.tooLow}</TableCell>
            <TableCell>
              <DirectionBadge direction={c.direction} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function AgreementSection({ report: r }: { report: EvaluationReport }) {
  return (
    <Section
      title="Concordância"
      description="Pergunta global (“o retorno bateu?”). Generosa = mais gente achou a nota alta demais; dura = baixa demais."
    >
      <div className="space-y-6">
        <DirectionTable cells={[r.global]} label={() => "Todas as análises"} />
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Por tipo de análise</h3>
          <DirectionTable cells={r.byKind} label={(c) => KIND_LABEL[c.key] ?? c.key} first="Tipo" />
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Por versão</h3>
          <DirectionTable
            cells={r.byVersion}
            first="Prompt · catálogo · modelo · fonte"
            label={(c) => (
              <span className="font-mono text-xs">
                {c.promptVersion} · {c.copyVersion} · {c.model} · {c.source}
                {c.unclear ? <span className="text-destructive"> · não entendi {c.unclear} ({pct(c.unclearRate ?? null)})</span> : null}
              </span>
            )}
          />
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Por fonte</h3>
            <DirectionTable cells={r.bySource} label={(c) => c.key} first="Fonte" />
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Por duração da fala</h3>
            <DirectionTable cells={r.byDuration} label={(c) => c.key} first="Duração" />
          </div>
        </div>
      </div>
    </Section>
  );
}

/**
 * Clareza do retorno (25/10/2026): quantos disseram "não entendi" contra a meta
 * de 10% e as análises cuja nota contradiz as áreas da tela (a causa de 21–25/10).
 */
const SCREEN_AREA: Record<string, string> = {
  clarity: "clareza",
  structure: "estrutura",
  pace: "ritmo",
  engagement: "engajamento",
};

function ClarityCard({ report: r }: { report: EvaluationReport }) {
  const c = r.clarity;
  const m = r.scoreMismatch;
  if (!c || !m) return null;
  const over = c.rate != null && c.rate >= c.target;
  return (
    <Section
      title="Clareza do retorno"
      description={`Meta: menos de ${pct(c.target)} das respostas globais com "Não entendi o retorno".`}
    >
      <div className="space-y-3 text-sm">
        {c.n ? (
          <p>
            <span className={over ? "text-destructive font-semibold" : "font-semibold"}>{pct(c.rate)}</span>{" "}
            ({c.unclear} de {c.n} respostas globais) disseram que não entenderam o retorno.
          </p>
        ) : (
          <Empty />
        )}
        {m.n ? (
          <div className="space-y-1">
            <p>
              <span className="text-destructive font-semibold">{m.n}</span> de {m.analyses} análises avaliadas têm nota que
              contradiz as áreas da tela:
            </p>
            <ul className="text-muted-foreground space-y-0.5">
              {m.samples.map((s) => (
                <li key={s.jobId} className="font-mono text-xs">
                  {s.jobId.slice(0, 8)} · nota {s.overallScore} · média das áreas {s.areasMean} ·{" "}
                  {SCREEN_AREA[s.lowest.key] ?? s.lowest.key} {s.lowest.score}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-muted-foreground">Nenhuma nota contradiz as áreas da tela.</p>
        )}
      </div>
    </Section>
  );
}

function CalibrationCard({ report: r }: { report: EvaluationReport }) {
  return (
    <Section title="Calibração da nota" description="Concordância por faixa da nota mostrada.">
      <DirectionTable
        cells={r.scoreCalibration}
        first="Faixa"
        label={(c) => c.label}
        extra={{ head: "Nota média", cell: (c) => c.meanScore ?? "—" }}
      />
    </Section>
  );
}

function SelfAssessmentCard({ report: r }: { report: EvaluationReport }) {
  const rows = r.selfAssessment.rows;
  return (
    <Section
      title="Autoavaliação × nota"
      description={`${r.selfAssessment.n} análises com a sensação da pessoa. “Longe” = nota a 2 ou mais faixas do que ela sentiu.`}
    >
      {!rows.length ? (
        <Empty>Ninguém respondeu à autoavaliação no recorte.</Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sensação</TableHead>
              <TableHead className="text-right">n</TableHead>
              <TableHead className="text-right">Nota média</TableHead>
              <TableHead className="text-right">Concordância</TableHead>
              <TableHead className="text-right">Longe</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((s) => (
              <TableRow key={s.felt}>
                <TableCell>{REPORT_FELT_LABEL[s.felt] ?? s.felt}</TableCell>
                <TableCell className="text-right tabular-nums">{s.n}</TableCell>
                <TableCell className="text-right tabular-nums">{s.meanScore ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {pct(s.agreement.rate)}
                  <span className="text-muted-foreground"> de {s.agreement.n}</span>
                </TableCell>
                <TableCell className="text-right tabular-nums">{s.farGap}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Section>
  );
}

// ─── Aspectos ─────────────────────────────────────────────────────────────────

function AspectsSection({ aspects }: { aspects: AspectReport[] }) {
  return (
    <Section
      title="Aspectos"
      description="Do que mais erra para o que menos erra. A métrica é o número que a pipeline mediu: mediana (p25–p75)."
    >
      {!aspects.length ? (
        <Empty />
      ) : (
        <div className="space-y-4">
          {aspects.map((a) => (
            <AspectBlock key={a.key} aspect={a} />
          ))}
        </div>
      )}
    </Section>
  );
}

function AspectBlock({ aspect: a }: { aspect: AspectReport }) {
  const unit = a.metric?.unit ?? "";
  return (
    <details className="group rounded-md border" open={!a.small && (a.rate ?? 1) < 0.6}>
      <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm">
        <span className="font-semibold">{a.label}</span>
        <span className={rateClass(a)}>{pct(a.rate)} de concordância</span>
        <span className="text-muted-foreground">n = {a.n}</span>
        {a.small && <Badge variant="outline">amostra pequena</Badge>}
        <DirectionBadge direction={a.direction} />
        <span className="text-muted-foreground">
          alta demais {a.tooHigh} · baixa demais {a.tooLow}
        </span>
      </summary>
      <div className="space-y-4 border-t px-4 py-4 text-sm">
        {a.metric && a.metricByVerdict && (
          <div className="space-y-2">
            <p className="text-muted-foreground">
              Métrica: <strong className="text-foreground">{a.metric.label}</strong> ({unit}) ·{" "}
              <code className="text-xs">{a.metric.path}</code>
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quem</TableHead>
                  <TableHead className="text-right">n</TableHead>
                  <TableHead className="text-right">Mediana (p25–p75)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(
                  [
                    ["Concordou", a.metricByVerdict.agree],
                    ["Em parte", a.metricByVerdict.partial],
                    ["Discordou", a.metricByVerdict.disagree],
                    ...(a.metricByDirection
                      ? ([
                          ["Disse “alta demais”", a.metricByDirection.tooHigh],
                          ["Disse “baixa demais”", a.metricByDirection.tooLow],
                        ] as const)
                      : []),
                  ] as const
                ).map(([label, s]) => (
                  <TableRow key={label}>
                    <TableCell>{label}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.n}</TableCell>
                    <TableCell className="text-right tabular-nums">{statsText(s)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {a.byBand.length > 0 && (
          <div className="space-y-2">
            <p className="font-medium">Por faixa</p>
            <DirectionTable cells={a.byBand} first="Faixa" label={(c) => c.key} />
          </div>
        )}
        {a.topReasons.length > 0 && (
          <div className="space-y-1.5">
            <p className="font-medium">Principais motivos</p>
            <ul className="space-y-1">
              {a.topReasons.map((r) => (
                <li key={r.reason} className="flex justify-between gap-4">
                  <span>{reasonLabel(r.reason)}</span>
                  <span className="text-muted-foreground tabular-nums">{r.n}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </details>
  );
}

// ─── Frases, textos da IA ─────────────────────────────────────────────────────

function Quote({ q, onOpen }: { q: QuotedComment; onOpen: OpenEvaluation }) {
  return (
    <li className="space-y-1.5 rounded-md border p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-xs">{targetName(q.target)}</span>
        <VerdictBadge verdict={q.verdict} />
        <Reasons reasons={q.reasons} />
        <Button variant="ghost" size="sm" className="ml-auto h-7" onClick={() => onOpen(q.evaluationId)}>
          <ExternalLink className="size-3.5" />
          Abrir
        </Button>
      </div>
      {q.shown && (
        <p className="text-muted-foreground">
          <strong className="text-foreground">Na tela:</strong> {q.shown}
        </p>
      )}
      {q.comment && <blockquote className="border-l-2 pl-3 italic">“{q.comment}”</blockquote>}
      {q.criteria && (
        <p className="text-muted-foreground text-xs">
          <strong>Critério (IA):</strong> {q.criteria}
        </p>
      )}
    </li>
  );
}

function Quotes({ quotes, onOpen }: { quotes: QuotedComment[]; onOpen: OpenEvaluation }) {
  if (!quotes.length) return <Empty>Sem exemplos.</Empty>;
  return (
    <ul className="space-y-2">
      {quotes.map((q) => (
        <Quote key={q.evaluationId} q={q} onOpen={onOpen} />
      ))}
    </ul>
  );
}

function PhrasesAndTexts({ report: r, onOpenEvaluation }: { report: EvaluationReport; onOpenEvaluation: OpenEvaluation }) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Section title="Frases do catálogo que mais erram" description="A partir de 3 respostas, da menor concordância.">
        {!r.worstPhrases.length ? (
          <Empty>Nenhuma frase com 3 ou mais respostas e erro no recorte.</Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Frase</TableHead>
                <TableHead className="text-right">n</TableHead>
                <TableHead className="text-right">Concordância</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {r.worstPhrases.map((p) => (
                <TableRow key={p.key}>
                  <TableCell className="min-w-64 whitespace-normal">
                    <span className="text-muted-foreground font-mono text-xs">
                      {p.key} · {aspectName(p.aspect)}
                    </span>
                    {p.text && <span className="mt-0.5 block">{p.text}</span>}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{p.n}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    <span className={rateClass(p)}>{pct(p.rate)}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>

      <Section title="Textos da IA" description="Resumo e dica do topo do resultado, com o que disseram quando não bateu.">
        {!r.llmTexts.length ? (
          <Empty />
        ) : (
          <div className="space-y-5">
            {r.llmTexts.map((t) => (
              <div key={t.key} className="space-y-2">
                <p className="text-sm">
                  <strong>{aspectName(t.key)}</strong> · {pct(t.rate)} de concordância
                  <span className="text-muted-foreground">
                    {" "}
                    (n = {t.n}; em parte {t.partial}; não bateu {t.disagree})
                  </span>
                </p>
                <Quotes quotes={t.samples} onOpen={onOpenEvaluation} />
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

// ─── Transcrição, motivos, critérios, comentários ─────────────────────────────

function ReasonsSection({ report: r, onOpenEvaluation }: { report: EvaluationReport; onOpenEvaluation: OpenEvaluation }) {
  return (
    <>
      <div className="grid gap-6 xl:grid-cols-2">
        <Section
          title="Transcrição"
          description={`${r.transcript.flagged} marcaram a transcrição como errada; ${r.transcript.reasonCount} citaram “transcrição errou” como motivo.`}
        >
          <Quotes quotes={r.transcript.samples} onOpen={onOpenEvaluation} />
        </Section>

        <Section title="Motivos" description="Marcados pela própria pessoa × acrescentados pela IA ao ler o comentário.">
          {!r.reasons.length ? (
            <Empty>Nenhum motivo no recorte.</Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Motivo</TableHead>
                  <TableHead className="text-right">Próprios</TableHead>
                  <TableHead className="text-right">Pela IA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {r.reasons.map((m) => (
                  <TableRow key={m.reason}>
                    <TableCell>{reasonLabel(m.reason)}</TableCell>
                    <TableCell className="text-right tabular-nums">{m.own}</TableCell>
                    <TableCell className="text-right tabular-nums">{m.ai}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Section>
      </div>

      <Section title="Critérios das pessoas" description="Pelo que cada uma julga a própria fala, lido pela IA nos comentários.">
        {!r.criteria.length ? (
          <Empty>Nenhum critério extraído no recorte.</Empty>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {r.criteria.map((c) => (
              <li key={c.text} className="flex justify-between gap-4">
                <span>{c.text}</span>
                <span className="text-muted-foreground tabular-nums">{c.n}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Comentários por categoria" description="Categoria principal dada pela IA a cada comentário.">
        {!r.commentsByCategory.length ? (
          <Empty>Nenhum comentário no recorte.</Empty>
        ) : (
          <div className="space-y-3">
            {r.commentsByCategory.map((c) => (
              <details key={c.category} className="rounded-md border">
                <summary className="cursor-pointer px-4 py-3 text-sm">
                  <span className="font-medium">{c.category}</span>
                  <span className="text-muted-foreground"> · {c.n}</span>
                </summary>
                <div className="border-t p-3">
                  <Quotes quotes={c.quotes} onOpen={onOpenEvaluation} />
                </div>
              </details>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}

// ─── Casos ────────────────────────────────────────────────────────────────────

function CasesSection({ cases, onOpenEvaluation }: { cases: ReportCase[]; onOpenEvaluation: OpenEvaluation }) {
  return (
    <Section
      title="Casos para estudar"
      description="Discordâncias globais, primeiro as com comentário e com a nota longe do que a pessoa sentiu."
    >
      {!cases.length ? (
        <Empty>Nenhuma discordância global no recorte.</Empty>
      ) : (
        <div className="space-y-3">
          {cases.map((c) => (
            <CaseBlock key={c.evaluationId} c={c} onOpen={onOpenEvaluation} />
          ))}
        </div>
      )}
    </Section>
  );
}

function CaseBlock({ c, onOpen }: { c: ReportCase; onOpen: OpenEvaluation }) {
  const metrics = Object.entries(c.metrics);
  return (
    <details className="rounded-md border">
      <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm">
        <VerdictBadge verdict={c.verdict} />
        <span className="font-medium">{c.title ?? KIND_LABEL[c.kind] ?? c.kind}</span>
        <span className="text-muted-foreground">
          nota {c.overallScore != null ? Math.round(c.overallScore) : "—"} · {formatDuration(c.durationSeconds)}
          {c.felt && <> · sentiu “{REPORT_FELT_LABEL[c.felt] ?? c.felt}”</>}
        </span>
        {c.comment && <span className="text-muted-foreground truncate italic">“{c.comment}”</span>}
      </summary>
      <div className="space-y-4 border-t px-4 py-4 text-sm">
        <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <span>{KIND_LABEL[c.kind] ?? c.kind}</span>
          <span>Prompt {c.promptVersion ?? "—"}</span>
          <span>Fonte {c.source ?? "—"}</span>
          <span className="font-mono">job {c.jobId}</span>
          <Button variant="ghost" size="sm" className="ml-auto h-7" onClick={() => onOpen(c.evaluationId)}>
            Abrir avaliação
          </Button>
        </div>
        <Reasons reasons={c.reasons} />
        {c.comment && <blockquote className="border-l-2 pl-3 italic">“{c.comment}”</blockquote>}
        {(c.headline || c.summary) && (
          <div className="space-y-1">
            <p className="font-medium">O que a tela mostrou</p>
            {c.headline && <p className="font-medium">{c.headline}</p>}
            {c.summary && <p className="text-muted-foreground leading-relaxed">{c.summary}</p>}
          </div>
        )}
        {metrics.length > 0 && (
          <div className="space-y-1">
            <p className="font-medium">Métricas da pipeline</p>
            <div className="flex flex-wrap gap-1.5">
              {metrics.map(([k, v]) => (
                <Badge key={k} variant="outline" className="tabular-nums">
                  {aspectName(k)}: {v.toLocaleString("pt-BR")}
                </Badge>
              ))}
            </div>
          </div>
        )}
        {c.contested.length > 0 && (
          <div className="space-y-2">
            <p className="font-medium">Itens contestados</p>
            <ul className="space-y-2">
              {c.contested.map((it, idx) => (
                <li key={idx} className="space-y-1 rounded-md bg-muted/50 p-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span>{targetName(it.target)}</span>
                    {it.band != null && <span className="text-muted-foreground text-xs">faixa {it.band}</span>}
                    <VerdictBadge verdict={it.verdict} />
                    <Reasons reasons={it.reasons} />
                  </div>
                  {it.shown && <p className="text-muted-foreground">{it.shown}</p>}
                  {it.comment && <p className="italic">“{it.comment}”</p>}
                </li>
              ))}
            </ul>
          </div>
        )}
        {c.transcriptExcerpt && (
          <div className="space-y-1">
            <p className="font-medium">Trecho da transcrição</p>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{c.transcriptExcerpt}</p>
          </div>
        )}
      </div>
    </details>
  );
}
