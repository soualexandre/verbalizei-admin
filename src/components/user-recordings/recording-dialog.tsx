"use client";

import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { EvaluationRow } from "@/lib/feedback-evaluations";
import { reasonLabel } from "@/lib/feedback-evaluations";
import type { RecordingDetail, RecordingJob, RecordingKeyPoint, RecordingMeeting, RecordingTurn } from "@/lib/types";
import { cn, formatDateTime } from "@/lib/utils";
import { AnswerBadge, Fields, targetText } from "@/components/feedback-evaluations/evaluation-dialog";
import { ErrorState } from "@/components/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  CATEGORY_LABEL,
  errorLabel,
  fillersTone,
  fmtDuration,
  fmtNum,
  fmtSeconds,
  kindLabel,
  monotonyTone,
  paceTone,
  paceWord,
  pauseTone,
  RANGES,
  TONE_PILL,
  type MetricTone,
} from "./metric-ranges";

const SPEEDS = [1, 1.25, 1.5, 2] as const;

const FAILURE_CHECK_LABEL: Record<string, string> = {
  speech_ratio: "pouca fala no áudio",
  snr: "ruído alto ou voz baixa",
  duration: "duração fora do limite",
  decode: "arquivo que não abre",
  max_duration: "áudio longo demais",
};

const RELIABILITY_REASON: Record<string, string> = {
  short: "a fala foi curta demais (menos de 25 palavras) para uma nota confiável",
  transcript: "a transcrição saiu com pouca confiança",
};

/** A gravação inteira: áudio, notas, medidas, retorno escrito, conversa, transcrição e avaliações. */
export function RecordingDialog({ userId, jobId, onClose }: { userId: string; jobId: string | null; onClose: () => void }) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["user-recording", userId, jobId],
    queryFn: () => api.get<RecordingDetail>(`/admin/users/${userId}/recordings/${jobId}`),
    enabled: !!jobId,
    // A URL do áudio é assinada e expira: não vale guardar por muito tempo.
    staleTime: 5 * 60_000,
  });

  const job = data?.job;

  return (
    <Dialog open={!!jobId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-4xl p-5 sm:max-w-4xl sm:p-6">
        <DialogHeader className="pr-6 text-left">
          <DialogTitle className="font-display text-xl leading-tight">{job ? job.title || kindLabel(job.kind) : "Gravação"}</DialogTitle>
          <DialogDescription>
            {job
              ? [kindLabel(job.kind), formatDateTime(job.createdAt), job.durationSeconds != null ? fmtDuration(job.durationSeconds) : null]
                  .filter(Boolean)
                  .join(" · ")
              : "Carregando a gravação…"}
          </DialogDescription>
        </DialogHeader>

        {isError ? (
          <ErrorState bare title="Não foi possível abrir a gravação." error={error} onRetry={() => refetch()} />
        ) : isLoading || !data || !job ? (
          <div className="space-y-3" aria-busy="true">
            <Skeleton className="h-14 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        ) : (
          <div className="min-w-0 space-y-7 text-sm">
            <AudioBlock job={job} />
            <StatusNotice job={job} />
            <Scores job={job} />
            <Measures job={job} />
            <WrittenFeedback job={job} />
            <Conversation job={job} />
            {data.meeting && <MeetingBlock meeting={data.meeting} />}
            <TranscriptBlock job={job} />
            <Evaluations evaluations={data.evaluations} />
            <Provenance job={job} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function H({ children }: { children: React.ReactNode }) {
  return <h3 className="font-display text-base font-bold">{children}</h3>;
}

// ─── Áudio ────────────────────────────────────────────────────────────────────

/** O player principal, com velocidade de reprodução. */
function MainPlayer({ src }: { src: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [speed, setSpeed] = useState<number>(1);
  return (
    <div className="bg-muted space-y-2 rounded-xl p-3">
      <audio ref={ref} controls preload="none" src={src} className="w-full" onLoadedMetadata={() => ref.current && (ref.current.playbackRate = speed)} />
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Velocidade">
        <span className="text-muted-foreground mr-1 text-xs">Velocidade</span>
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={speed === s}
            onClick={() => {
              setSpeed(s);
              if (ref.current) ref.current.playbackRate = s;
            }}
            className={cn(
              "h-7 cursor-pointer rounded-full px-2.5 text-xs font-semibold tabular-nums transition-colors",
              speed === s ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground border",
            )}
          >
            {s.toLocaleString("pt-BR")}×
          </button>
        ))}
      </div>
    </div>
  );
}

function AudioBlock({ job }: { job: RecordingJob }) {
  const main = job.playbackAudioUrl || job.audioUrl;
  const segments = (job.training?.segments ?? []).slice().sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  return (
    <section className="space-y-2">
      <H>Ouvir</H>
      {main ? (
        <>
          <MainPlayer src={main} />
          {job.playbackAudioUrl && <p className="text-muted-foreground text-xs">O treino inteiro num arquivo só.</p>}
        </>
      ) : (
        <p className="text-muted-foreground">Sem áudio inteiro disponível{segments.length ? "; ouça pelas partes abaixo." : "."}</p>
      )}
      {segments.length > 0 && (
        <details className="rounded-xl border px-3 py-2" open={!main}>
          <summary className="cursor-pointer font-medium">Partes da gravação ({segments.length})</summary>
          <ul className="mt-2 divide-y">
            {segments.map((s, i) => (
              <li key={s.id} className="space-y-1.5 py-3">
                <p className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-semibold">Parte {(s.index ?? i) + 1}</span>
                  {s.durationSeconds != null && <span className="text-muted-foreground">{fmtDuration(s.durationSeconds)}</span>}
                  {s.metrics?.wpm != null && <span className="text-muted-foreground">{fmtNum(s.metrics.wpm, 0)} palavras/min</span>}
                  {s.metrics?.fillersPerMinute != null && (
                    <span className="text-muted-foreground">{fmtNum(s.metrics.fillersPerMinute)} muletas/min</span>
                  )}
                </p>
                {s.audioUrl ? (
                  <audio controls preload="none" src={s.audioUrl} className="w-full" />
                ) : (
                  <p className="text-muted-foreground text-xs">Sem áudio desta parte.</p>
                )}
                {s.transcript && <p className="leading-relaxed">{s.transcript}</p>}
                {(s.quickFeedback?.highlight || s.quickFeedback?.adjust) && (
                  <p className="text-muted-foreground text-xs">
                    {s.quickFeedback?.highlight && <>Foi bem: {s.quickFeedback.highlight}. </>}
                    {s.quickFeedback?.adjust && <>Ajustar: {s.quickFeedback.adjust}</>}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

// ─── Situação ─────────────────────────────────────────────────────────────────

function StatusNotice({ job }: { job: RecordingJob }) {
  const rel = job.result?.reliability;
  if (job.status === "FAILED") {
    const check = job.failureCheck ? FAILURE_CHECK_LABEL[job.failureCheck] ?? job.failureCheck : null;
    return (
      <div className="border-destructive/30 bg-destructive/5 flex gap-2 rounded-xl border p-3">
        <TriangleAlert className="text-destructive mt-0.5 size-4 shrink-0" aria-hidden />
        <div className="space-y-1">
          <p className="font-semibold">A análise falhou: {errorLabel(job.errorCode) ?? "erro sem código"}{check ? ` (${check})` : ""}.</p>
          {job.error && <p className="text-muted-foreground break-words">{job.error}</p>}
          {job.errorCode && <p className="text-muted-foreground font-mono text-xs">{job.errorCode}</p>}
        </div>
      </div>
    );
  }
  if (job.status === "QUEUED" || job.status === "PROCESSING") {
    return <p className="bg-muted rounded-xl p-3">A análise ainda não terminou.</p>;
  }
  if (rel?.level === "low") {
    return (
      <div className="bg-lime-50 flex gap-2 rounded-xl p-3">
        <TriangleAlert className="text-lime-ink mt-0.5 size-4 shrink-0" aria-hidden />
        <p>
          A pessoa não viu nota nesta análise: {RELIABILITY_REASON[rel.reason ?? ""] ?? "a fala não deu base para uma nota confiável"}.
          {rel.wordCount != null && ` ${fmtNum(rel.wordCount, 0)} palavras.`}
        </p>
      </div>
    );
  }
  return null;
}

// ─── Notas e medidas ──────────────────────────────────────────────────────────

function Scores({ job }: { job: RecordingJob }) {
  const cats = Object.entries(job.result?.categories ?? {}).filter(([, v]) => typeof v === "number" && v > 0);
  if (job.overallScore == null && !cats.length) return null;
  return (
    <section className="space-y-2">
      <H>Notas</H>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <div className="rounded-xl bg-primary px-3 py-3 text-primary-foreground">
          <p className="text-xs opacity-85">Nota geral</p>
          <p className="font-display text-2xl font-extrabold tabular-nums">{job.overallScore != null ? Math.round(job.overallScore) : "—"}</p>
        </div>
        {cats.map(([k, v]) => (
          <div key={k} className="bg-muted rounded-xl px-3 py-3">
            <p className="text-muted-foreground text-xs">{CATEGORY_LABEL[k] ?? k}</p>
            <p className="font-display text-2xl font-extrabold tabular-nums">{Math.round(v)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Measure({ label, value, tone, range, extra }: { label: string; value: string; tone: MetricTone; range?: string; extra?: string | null }) {
  return (
    <div className="rounded-xl border px-3 py-2.5">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-0.5 flex flex-wrap items-center gap-1.5">
        <span className={cn("rounded-full px-2 py-0.5 text-sm font-bold tabular-nums", TONE_PILL[tone])}>{value}</span>
        {extra && <span className="text-muted-foreground text-xs">{extra}</span>}
      </p>
      {range && <p className="text-muted-foreground mt-1 text-xs leading-snug">{range}</p>}
    </div>
  );
}

function Measures({ job }: { job: RecordingJob }) {
  const r = job.result;
  if (!r) return null;
  const wpm = r.speechRate ?? r.wpm;
  const f = r.fillerWords;
  const top = (f?.top ?? []).filter((t) => t.word);
  const has = [wpm, r.articulationRate, f?.perMinute, r.longestPause, r.monotonyScore, r.wordCount].some((v) => v != null);
  if (!has) return null;
  return (
    <section className="space-y-2">
      <H>Medidas</H>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {wpm != null && <Measure label="Ritmo" value={`${fmtNum(wpm, 0)} palavras/min`} tone={paceTone(wpm)} extra={paceWord(wpm)} range={RANGES.pace.text} />}
        {r.articulationRate != null && (
          <Measure label="Ritmo só falando (sem pausas)" value={`${fmtNum(r.articulationRate, 0)} palavras/min`} tone="neutral" />
        )}
        {f?.perMinute != null && (
          <Measure
            label="Muletas por minuto"
            value={fmtNum(f.perMinute)}
            tone={fillersTone(f.perMinute)}
            extra={f.total != null ? `${fmtNum(f.total, 0)} no total` : null}
            range={RANGES.fillers.text}
          />
        )}
        {r.longestPause != null && (
          <Measure
            label="Maior pausa"
            value={fmtSeconds(r.longestPause)}
            tone={pauseTone(r.longestPause)}
            extra={r.longPauses != null ? `${fmtNum(r.longPauses, 0)} pausas longas` : null}
            range={RANGES.pause.text}
          />
        )}
        {r.monotonyScore != null && (
          <Measure label="Monotonia" value={fmtNum(r.monotonyScore, 0)} tone={monotonyTone(r.monotonyScore)} range={RANGES.monotony.text} />
        )}
        {r.wordCount != null && <Measure label="Palavras ditas" value={fmtNum(r.wordCount, 0)} tone="neutral" />}
      </div>
      {top.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-muted-foreground text-xs">Muletas mais usadas:</span>
          {top.slice(0, 8).map((t) => (
            <Badge key={t.word} variant="secondary">
              “{t.word}” × {fmtNum(t.count ?? 0, 0)}
            </Badge>
          ))}
        </div>
      )}
    </section>
  );
}

// ─── Retorno escrito ──────────────────────────────────────────────────────────

function WrittenFeedback({ job }: { job: RecordingJob }) {
  const items = job.trainingAttempt?.analysisItems;
  if (!items) return null;
  const points: RecordingKeyPoint[] = items.keyPoints?.length
    ? items.keyPoints
    : [
        ...(items.positives ?? []).map((text) => ({ type: "strength" as const, text })),
        ...(items.improvements ?? []).map((text) => ({ type: "improve" as const, text })),
      ];
  const strengths = points.filter((p) => p.type === "strength" && p.text);
  const improve = points.filter((p) => p.type !== "strength" && p.text);
  if (!items.summary && !items.tip && !points.length) return null;
  return (
    <section className="space-y-3">
      <H>O que a pessoa leu</H>
      {items.summary && <p className="text-[15px] leading-relaxed">{items.summary}</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {strengths.length > 0 && <PointList title="Foi bem" points={strengths} className="text-green-ink" />}
        {improve.length > 0 && <PointList title="A melhorar" points={improve} className="text-lime-ink" />}
      </div>
      {items.tip && (
        <p className="bg-green-50 rounded-xl p-3">
          <span className="font-semibold">Dica: </span>
          {items.tip}
        </p>
      )}
    </section>
  );
}

function PointList({ title, points, className }: { title: string; points: RecordingKeyPoint[]; className: string }) {
  return (
    <div className="rounded-xl border p-3">
      <p className={cn("mb-1.5 font-semibold", className)}>{title}</p>
      <ul className="space-y-2">
        {points.map((p, i) => (
          <li key={i}>
            <p>{p.text}</p>
            {p.evidence && <p className="text-muted-foreground mt-0.5 border-l-2 pl-2 text-xs italic">“{p.evidence}”</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Conversa ─────────────────────────────────────────────────────────────────

function Conversation({ job }: { job: RecordingJob }) {
  const turns: RecordingTurn[] = (job.trainingAttempt?.analysisItems?.conversation ?? []).filter((t) => t?.text);
  if (!turns.length) return null;
  const names = new Map((job.training?.personas ?? []).map((p) => [p.id, p.name]));
  return (
    <section className="space-y-2">
      <H>A conversa</H>
      <ol className="space-y-2.5">
        {turns.map((t, i) => {
          const user = t.speaker === "user";
          return (
            <li key={i} className={cn("flex", user ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[90%] space-y-1.5 rounded-2xl px-3.5 py-2.5 sm:max-w-[80%]", user ? "bg-green-50" : "bg-muted")}>
                <p className="text-muted-foreground text-xs font-semibold">
                  {user ? "A pessoa" : (t.personaId && names.get(t.personaId)) || "Persona"}
                </p>
                <p className="leading-relaxed">{t.text}</p>
                {(t.notes ?? []).filter((n) => n.text).map((n, j) => (
                  <p key={j} className={cn("text-xs", n.kind === "strength" ? "text-green-ink" : "text-lime-ink")}>
                    <span className="font-semibold">{n.kind === "strength" ? "Foi bem: " : "A melhorar: "}</span>
                    {n.text}
                    {n.quote && <span className="text-muted-foreground italic"> (“{n.quote}”)</span>}
                  </p>
                ))}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

// ─── Reunião ──────────────────────────────────────────────────────────────────

function MeetingBlock({ meeting }: { meeting: RecordingMeeting }) {
  const people = Array.isArray(meeting.participants) ? meeting.participants : [];
  return (
    <section className="space-y-2">
      <H>A reunião</H>
      <p className="text-muted-foreground">
        {[meeting.title, meeting.provider, meeting.startedAt ? formatDateTime(meeting.startedAt) : null, meeting.durationSeconds != null ? fmtDuration(meeting.durationSeconds) : null]
          .filter(Boolean)
          .join(" · ")}
      </p>
      {people.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {people.map((p, i) => (
            <li key={p.id ?? i}>
              <Badge variant="outline">
                {p.name || p.email || "Sem nome"}
                {p.isHost ? " (anfitrião)" : ""}
                {p.talkSeconds != null ? ` · falou ${fmtDuration(p.talkSeconds)}` : ""}
              </Badge>
            </li>
          ))}
        </ul>
      )}
      {meeting.audio.filter((a) => a.url).map((a, i) => (
        <div key={a.key} className="space-y-1">
          <p className="text-muted-foreground text-xs">Áudio da reunião {meeting.audio.length > 1 ? i + 1 : ""}</p>
          <audio controls preload="none" src={a.url!} className="w-full" />
        </div>
      ))}
      {meeting.segments.length > 0 && (
        <details className="rounded-xl border px-3 py-2">
          <summary className="cursor-pointer font-medium">Trechos da reunião ({meeting.segments.length})</summary>
          <ul className="mt-2 divide-y">
            {meeting.segments.map((s) => (
              <li key={s.id} className="space-y-1.5 py-3">
                <p className="text-xs font-semibold">
                  Trecho {s.index + 1}
                  {s.durationSeconds != null && <span className="text-muted-foreground font-normal"> · {fmtDuration(s.durationSeconds)}</span>}
                </p>
                {s.audioUrl && <audio controls preload="none" src={s.audioUrl} className="w-full" />}
                {s.transcript && <p className="leading-relaxed">{s.transcript}</p>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

// ─── Transcrição, avaliações e origem ─────────────────────────────────────────

function TranscriptBlock({ job }: { job: RecordingJob }) {
  const r = job.result;
  const text =
    (typeof r?.transcript === "string" && r.transcript) ||
    (typeof r?.fullText === "string" && r.fullText) ||
    job.trainingAttempt?.transcript ||
    null;
  if (!text) return null;
  return (
    <details className="rounded-xl border px-3 py-2">
      <summary className="cursor-pointer font-display font-bold">Transcrição</summary>
      <p className="mt-2 whitespace-pre-wrap leading-relaxed">{text}</p>
    </details>
  );
}

function Evaluations({ evaluations }: { evaluations: RecordingDetail["evaluations"] }) {
  return (
    <section className="space-y-2">
      <H>O que a pessoa achou do retorno</H>
      {!evaluations.length ? (
        <p className="text-muted-foreground">Ela não avaliou este retorno.</p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {evaluations.map((ev) => {
            const row = ev as unknown as EvaluationRow;
            return (
              <li key={ev.id} className="space-y-1.5 px-3 py-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{targetText(row)}</span>
                  <AnswerBadge row={row} />
                  {ev.reasons.map((r) => (
                    <Badge key={r} variant="secondary">
                      {reasonLabel(r)}
                    </Badge>
                  ))}
                  <span className="text-muted-foreground ml-auto text-xs">{formatDateTime(ev.createdAt)}</span>
                </div>
                {ev.comment && <blockquote className="border-l-2 pl-3 italic">“{ev.comment}”</blockquote>}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Provenance({ job }: { job: RecordingJob }) {
  return (
    <details className="rounded-xl border px-3 py-2">
      <summary className="cursor-pointer font-display font-bold">Quem gerou</summary>
      <div className="mt-2 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <code className="bg-muted rounded px-2 py-1 font-mono text-xs break-all">{job.id}</code>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              navigator.clipboard
                .writeText(job.id)
                .then(() => toast.success("ID copiado."))
                .catch(() => toast.error("Não foi possível copiar."));
            }}
          >
            <Copy className="size-4" />
            Copiar ID
          </Button>
        </div>
        <Fields value={job.resultMeta ?? null} />
      </div>
    </details>
  );
}
