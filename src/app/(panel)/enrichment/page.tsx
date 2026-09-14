"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCheck, Loader2, WandSparkles } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type {
  EnrichmentRunState,
  EnrichmentSimulation,
  EnrichmentSummary,
} from "@/lib/types";
import { formatDateTime, formatNumber } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EnrichmentTable } from "./enrichment-table";

const pct = (part: number, total: number) =>
  total > 0 ? Math.round((part / total) * 100) : 0;

export default function EnrichmentPage() {
  const qc = useQueryClient();
  const [runOpen, setRunOpen] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);

  const summary = useQuery({
    queryKey: ["enrichment-summary"],
    queryFn: () => api.get<EnrichmentSummary>("/admin/enrichment/summary"),
    refetchInterval: (q) => (q.state.data?.run.running ? 2500 : false),
  });
  const running = summary.data?.run.running ?? false;

  // Quando a execução termina, atualiza tabela e avisa.
  const [wasRunning, setWasRunning] = useState(false);
  useEffect(() => {
    if (running) setWasRunning(true);
    if (!running && wasRunning && summary.data) {
      setWasRunning(false);
      const r = summary.data.run;
      qc.invalidateQueries({ queryKey: ["enrichment-users"] });
      if (r.error) toast.error(`Enriquecimento interrompido: ${r.error}`);
      else
        toast.success(
          `Enriquecimento concluído: ${r.ready} perfis inferidos, ${r.insufficient} sem dados suficientes${r.failed ? `, ${r.failed} falhas` : ""}.`,
        );
    }
  }, [running, wasRunning, summary.data, qc]);

  const applyMutation = useMutation({
    mutationFn: () =>
      api.post<{ applied: number }>("/admin/enrichment/apply-bulk", { minConfidence: 0.75 }),
    onSuccess: (res) => {
      toast.success(`Segmento aplicado a ${res.applied} usuários.`);
      setApplyOpen(false);
      qc.invalidateQueries({ queryKey: ["enrichment-summary"] });
      qc.invalidateQueries({ queryKey: ["enrichment-users"] });
      qc.invalidateQueries({ queryKey: ["profiles"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const data = summary.data;

  return (
    <>
      <PageHeader
        title="Enriquecimento"
        description='Perfil inferido de quem não fez o onboarding, respondeu "Outro" ou está sem segmento.'
      >
        <div className="flex flex-wrap items-center gap-2">
        {data && data.applicableHighConfidence > 0 && (
          <Button variant="outline" onClick={() => setApplyOpen(true)} disabled={running}>
            <CheckCheck className="size-4" />
            Aplicar segmentos ({formatNumber(data.applicableHighConfidence)})
          </Button>
        )}
        <Button onClick={() => setRunOpen(true)} disabled={running || !data}>
          {running ? <Loader2 className="size-4 animate-spin" /> : <WandSparkles className="size-4" />}
          {running ? "Enriquecendo…" : "Enriquecer agora"}
        </Button>
        </div>
      </PageHeader>

      {summary.isLoading || !data ? (
        <div className="space-y-6">
          <Skeleton className="h-36" />
          <div className="grid gap-6 lg:grid-cols-3">
            <Skeleton className="h-56" />
            <Skeleton className="h-56" />
            <Skeleton className="h-56" />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {data.run.running && <RunProgress run={data.run} />}

          <Card className="gap-4">
            <CardContent className="space-y-3">
              <h2 className="max-w-4xl text-2xl leading-tight font-semibold tracking-tight text-balance">
                {headline(data)}
              </h2>
              <p className="max-w-3xl text-base leading-relaxed text-pretty">{support(data)}</p>
              {!data.llmAvailable && (
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Nenhum provedor de IA está configurado na API. O enriquecimento vai usar só regras
                  (onboarding, quiz da landing, trilhas e domínio do e-mail) e não vai interpretar
                  textos livres.
                </p>
              )}
            </CardContent>
          </Card>

          <dl className="text-muted-foreground flex flex-wrap gap-x-6 gap-y-1 px-1 text-sm">
            <Fact value={data.reasons.NO_ONBOARDING} label="sem onboarding" />
            <Fact value={data.reasons.FREE_TEXT} label="responderam “Outro”" />
            <Fact value={data.reasons.NO_SEGMENT} label="sem segmento" />
            <Fact value={data.status.NOT_PROCESSED} label="ainda não processados" />
            <Fact value={data.applied} label="com segmento já aplicado" />
            <div>
              <dt className="sr-only">Última atualização</dt>
              <dd>
                {data.lastEnrichedAt
                  ? `Último enriquecimento ${formatDateTime(data.lastEnrichedAt)}`
                  : "Nunca enriquecido"}
              </dd>
            </div>
          </dl>

          {data.status.READY > 0 && (
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="gap-4">
                <CardHeader>
                  <CardTitle>Segmentos inferidos</CardTitle>
                  <CardDescription>Com a confiança média de cada um.</CardDescription>
                </CardHeader>
                <CardContent>
                  <RankedBars
                    items={data.inferredSegments.map((s) => ({
                      label: s.label,
                      users: s.users,
                      note: `${Math.round(s.avgConfidence * 100)}% conf.`,
                    }))}
                    empty="Nenhum segmento inferido ainda."
                  />
                </CardContent>
              </Card>
              <Card className="gap-4">
                <CardHeader>
                  <CardTitle>Ocupações mais comuns</CardTitle>
                  <CardDescription>Profissão ou cargo provável.</CardDescription>
                </CardHeader>
                <CardContent>
                  <RankedBars items={data.topOccupations} empty="Sem ocupações identificadas." />
                </CardContent>
              </Card>
              <Card className="gap-4">
                <CardHeader>
                  <CardTitle>Setores</CardTitle>
                  <CardDescription>Área de atuação provável.</CardDescription>
                </CardHeader>
                <CardContent>
                  <RankedBars items={data.topIndustries} empty="Sem setores identificados." />
                </CardContent>
              </Card>
            </div>
          )}

          <EnrichmentTable
            segments={data.inferredSegments}
            disabled={running}
            onChanged={() => qc.invalidateQueries({ queryKey: ["enrichment-summary"] })}
          />
        </div>
      )}

      <RunDialog open={runOpen} onOpenChange={setRunOpen} onStarted={() => summary.refetch()} />

      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aplicar segmentos inferidos</DialogTitle>
            <DialogDescription>
              {data &&
                `${formatNumber(data.applicableHighConfidence)} usuários sem segmento (ou em "Outros") vão receber o segmento inferido com confiança alta (75% ou mais). Quem declarou um segmento não é alterado. A trilha de estudo só muda se você rodar "Migrar trilhas" em Usuários.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => applyMutation.mutate()} disabled={applyMutation.isPending}>
              {applyMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              Aplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function headline(data: EnrichmentSummary) {
  if (data.candidates === 0) return "Todos os usuários têm perfil declarado.";
  const ready = data.status.READY;
  if (ready === 0) {
    return `${formatNumber(data.candidates)} usuários ainda não têm perfil claro.`;
  }
  const top = data.inferredSegments[0];
  return top
    ? `${formatNumber(ready)} de ${formatNumber(data.candidates)} perfis identificados: ${pct(top.users, ready)}% são ${top.label}.`
    : `${formatNumber(ready)} de ${formatNumber(data.candidates)} perfis identificados.`;
}

function support(data: EnrichmentSummary) {
  if (data.candidates === 0) return "Não há ninguém para enriquecer agora.";
  const parts: string[] = [];
  if (data.status.READY === 0) {
    parts.push(
      "Rode o enriquecimento para cruzar respostas livres, quiz da landing, cenários de treino, práticas, trilhas e o que eles falaram nos treinos.",
    );
  } else {
    const second = data.inferredSegments[1];
    if (second) parts.push(`Em seguida vem ${second.label} (${pct(second.users, data.status.READY)}%).`);
    const occupation = data.topOccupations[0];
    if (occupation) parts.push(`A ocupação mais comum é ${occupation.label.toLowerCase()}.`);
  }
  if (data.status.INSUFFICIENT_DATA > 0) {
    parts.push(
      `${formatNumber(data.status.INSUFFICIENT_DATA)} ainda não deram sinal suficiente; serão reavaliados quando usarem o app.`,
    );
  }
  if (data.status.NOT_PROCESSED > 0 && data.status.READY > 0) {
    parts.push(`${formatNumber(data.status.NOT_PROCESSED)} aguardam processamento.`);
  }
  return parts.join(" ");
}

function Fact({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <dt className="sr-only">{label}</dt>
      <dd>
        <span className="text-foreground font-semibold tabular-nums">{formatNumber(value)}</span>{" "}
        {label}
      </dd>
    </div>
  );
}

function RankedBars({
  items,
  empty,
}: {
  items: Array<{ label: string; users: number; note?: string }>;
  empty: string;
}) {
  if (!items.length) return <p className="text-muted-foreground text-sm">{empty}</p>;
  const max = Math.max(...items.map((i) => i.users));
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.label} className="space-y-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate" title={item.label}>
              {item.label}
            </span>
            <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
              <span className="text-foreground font-medium">{formatNumber(item.users)}</span>
              {item.note && ` · ${item.note}`}
            </span>
          </div>
          <div className="h-1.5">
            <div
              className="bg-primary h-full rounded-r-[3px]"
              style={{ width: `${Math.max((item.users / max) * 100, 2)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function RunProgress({ run }: { run: EnrichmentRunState }) {
  const done = run.total > 0 ? (run.processed / run.total) * 100 : 0;
  return (
    <Card className="gap-3 py-4" aria-live="polite">
      <CardContent className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
          <p className="font-medium">
            {run.total === 0
              ? "Coletando sinais dos usuários…"
              : `Enriquecendo ${formatNumber(run.processed)} de ${formatNumber(run.total)}`}
          </p>
          <p className="text-muted-foreground text-xs tabular-nums">
            {formatNumber(run.ready)} inferidos · {formatNumber(run.insufficient)} sem dados
            {run.failed > 0 && ` · ${formatNumber(run.failed)} falhas`}
          </p>
        </div>
        <div className="bg-muted h-2 overflow-hidden rounded-full">
          <div
            className="bg-primary h-full rounded-full transition-[width] duration-500"
            style={{ width: `${done}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function RunDialog({
  open,
  onOpenChange,
  onStarted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStarted: () => void;
}) {
  const [force, setForce] = useState(false);
  const simulation = useQuery({
    queryKey: ["enrichment-simulation", force],
    queryFn: () =>
      api.post<EnrichmentSimulation>("/admin/enrichment/run", { dryRun: true, force }),
    enabled: open,
  });
  const start = useMutation({
    mutationFn: () => api.post<EnrichmentRunState>("/admin/enrichment/run", { force }),
    onSuccess: () => {
      toast.success("Enriquecimento iniciado. Você pode continuar usando o painel.");
      onOpenChange(false);
      onStarted();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });
  const sim = simulation.data;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enriquecer perfis</DialogTitle>
          <DialogDescription>
            Cruza respostas livres, quiz da landing, cenários de treino, práticas, trilhas, domínio do
            e-mail e trechos do que o usuário falou nos treinos. Nada do que o usuário declarou é
            alterado.
          </DialogDescription>
        </DialogHeader>

        {simulation.isLoading || !sim ? (
          <div className="flex items-center gap-2 py-4 text-sm">
            <Loader2 className="text-muted-foreground size-4 animate-spin" />
            Calculando quem será processado…
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            <p className="text-base font-medium">
              {sim.toProcess === 0
                ? "Ninguém para processar: todos já foram enriquecidos e não tiveram dados novos."
                : `${formatNumber(sim.toProcess)} usuários serão processados agora.`}
            </p>
            <ul className="text-muted-foreground space-y-1">
              {sim.queued > sim.limit && (
                <li>
                  {formatNumber(sim.queued - sim.limit)} ficam para a próxima execução (limite de{" "}
                  {formatNumber(sim.limit)} por vez).
                </li>
              )}
              {sim.withoutEvidence > 0 && (
                <li>
                  {formatNumber(sim.withoutEvidence)} não têm nenhum sinal e serão marcados sem chamar a IA.
                </li>
              )}
              {sim.skippedUnchanged > 0 && (
                <li>{formatNumber(sim.skippedUnchanged)} já enriquecidos sem dados novos serão pulados.</li>
              )}
              {!sim.llmAvailable && <li>IA indisponível: só regras serão aplicadas.</li>}
              <li>A rotina diária (4h) repete isso automaticamente para novos usuários.</li>
            </ul>
            <label className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                checked={force}
                onChange={(e) => setForce(e.target.checked)}
                className="accent-primary size-4"
              />
              Reprocessar também quem não teve dados novos
            </label>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => start.mutate()}
            disabled={start.isPending || !sim || sim.toProcess === 0}
          >
            {start.isPending && <Loader2 className="size-4 animate-spin" />}
            Enriquecer {sim ? formatNumber(sim.toProcess) : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
