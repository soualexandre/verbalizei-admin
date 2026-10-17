"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { FileBarChart } from "lucide-react";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import {
  ASPECT_LABEL,
  FELT_LABEL,
  RULE_LABEL,
  STATUS_LABEL,
  TARGET_LABEL,
  VERDICT_LABEL,
  evalKeys,
  reasonLabel,
  type EvalTarget,
  type EvalVerdict,
  type EvaluationDetail,
  type EvaluationRow,
} from "@/lib/feedback-evaluations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface ReportPerson {
  id: string;
  name: string | null;
  email: string | null;
}

export function targetText(row: EvaluationRow): string {
  const type = TARGET_LABEL[row.targetType as EvalTarget] ?? row.targetType;
  if (row.targetType === "ASPECT" || row.targetType === "LLM_TEXT") {
    return `${type}: ${ASPECT_LABEL[row.targetKey] ?? row.targetKey}`;
  }
  return type;
}

export function AnswerBadge({ row }: { row: EvaluationRow }) {
  if (row.targetType === "SELF_ASSESSMENT" && row.status === "ANSWERED") {
    const felt = String(row.value?.felt ?? "");
    return <Badge variant="outline">{FELT_LABEL[felt] ?? felt}</Badge>;
  }
  if (row.status !== "ANSWERED" || !row.verdict) {
    return <Badge variant="outline">{STATUS_LABEL[row.status]}</Badge>;
  }
  const variant: Record<EvalVerdict, "success" | "warning" | "destructive"> = {
    AGREE: "success",
    PARTIAL: "warning",
    DISAGREE: "destructive",
  };
  return <Badge variant={variant[row.verdict]}>{VERDICT_LABEL[row.verdict]}</Badge>;
}

// ─── Detalhe ──────────────────────────────────────────────────────────────────

export function EvaluationDialog({
  id,
  onClose,
  onReport,
}: {
  id: string | null;
  onClose: () => void;
  /** Abre a aba Relatório com esta pessoa escolhida. */
  onReport?: (person: ReportPerson) => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: evalKeys.detail(id ?? ""),
    queryFn: () => api.get<EvaluationDetail>(`/admin/feedback-evaluations/${id}`),
    enabled: !!id,
  });
  const ev = data?.evaluation;
  const job = data?.job;

  return (
    <Dialog open={!!id} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{ev ? targetText(ev) : "Avaliação"}</DialogTitle>
          <DialogDescription>
            {ev ? `${ev.user?.name ?? ev.user?.email ?? "Pessoa"} · ${formatDateTime(ev.createdAt)} · ${ev.source}` : " "}
          </DialogDescription>
        </DialogHeader>

        {isLoading || !ev || !job ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <div className="space-y-6 text-sm">
            {job.stale && (
              <p className="rounded-md bg-amber-50 p-3 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                Esta análise foi reprocessada depois da avaliação: o resultado abaixo não é o que a pessoa viu. Use o
                “O que estava na tela”.
              </p>
            )}

            {onReport && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  onReport({ id: ev.userId, name: ev.user?.name ?? null, email: ev.user?.email ?? null })
                }
              >
                <FileBarChart className="size-4" />
                Relatório desta pessoa
              </Button>
            )}

            <section className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <AnswerBadge row={ev} />
                {ev.askRule && <Badge variant="outline">{RULE_LABEL[ev.askRule] ?? ev.askRule}</Badge>}
                {ev.reasons.map((r) => (
                  <Badge key={r} variant={r.startsWith("ai:") ? "outline" : "secondary"}>
                    {reasonLabel(r)}
                  </Badge>
                ))}
              </div>
              {ev.comment && <blockquote className="border-l-2 pl-3 italic">“{ev.comment}”</blockquote>}
              {ev.aiCriteria && (
                <p className="text-muted-foreground">
                  <strong className="text-foreground">Como a pessoa avalia (IA):</strong> {ev.aiCriteria}
                </p>
              )}
            </section>

            <section className="space-y-2">
              <h3 className="font-semibold">O que estava na tela</h3>
              <Fields value={ev.snapshot} />
            </section>

            <section className="space-y-2">
              <h3 className="font-semibold">A análise</h3>
              <p className="text-muted-foreground">
                {job.title ?? job.kind} · nota {job.overallScore != null ? Math.round(job.overallScore) : "—"} ·{" "}
                <Link className="underline" href={`/users/${ev.userId}`}>
                  ver pessoa
                </Link>
              </p>
              {job.audioUrl && <audio controls preload="none" src={job.audioUrl} className="w-full" />}
              {job.transcript && (
                <details>
                  <summary className="cursor-pointer font-medium">Transcrição</summary>
                  <p className="mt-2 whitespace-pre-wrap leading-relaxed">{job.transcript}</p>
                </details>
              )}
              <details>
                <summary className="cursor-pointer font-medium">Quem gerou</summary>
                <Fields value={{ ...job.resultMeta, copyVersion: ev.copyVersion, phraseId: ev.phraseId }} />
              </details>
            </section>

            {data.siblings.length > 1 && (
              <section className="space-y-2">
                <h3 className="font-semibold">Outras respostas desta pessoa nesta análise</h3>
                <ul className="space-y-1">
                  {data.siblings
                    .filter((s) => s.id !== ev.id)
                    .map((s) => (
                      <li key={s.id} className="flex flex-wrap items-center gap-2">
                        <span>{targetText(s)}</span>
                        <AnswerBadge row={s} />
                        {s.reasons.map((r) => (
                          <Badge key={r} variant="secondary">
                            {reasonLabel(r)}
                          </Badge>
                        ))}
                      </li>
                    ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function fieldText(value: unknown): string {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "number") return value.toLocaleString("pt-BR");
  if (Array.isArray(value)) return value.map(fieldText).join(" · ");
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `${k}: ${fieldText(v)}`)
      .join(" · ");
  }
  return String(value);
}

/** Campos de um objeto em lista (chave e valor), no lugar do JSON cru. */
export function Fields({ value }: { value: unknown }) {
  if (!value || typeof value !== "object") {
    return <p className="text-muted-foreground">{fieldText(value)}</p>;
  }
  const entries = Object.entries(value as Record<string, unknown>).filter(([, v]) => v != null && v !== "");
  if (!entries.length) return <p className="text-muted-foreground">Nada registrado.</p>;
  return (
    <dl className="divide-y rounded-md border">
      {entries.map(([k, v]) => (
        <div key={k} className="grid gap-1 px-3 py-2 sm:grid-cols-[10rem_1fr]">
          <dt className="text-muted-foreground font-mono text-xs">{k}</dt>
          <dd className="break-words">{fieldText(v)}</dd>
        </div>
      ))}
    </dl>
  );
}
