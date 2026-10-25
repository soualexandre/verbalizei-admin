"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ExperimentReport, ExperimentVariantReport } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ErrorState } from "@/components/error-state";
import {
  HeroStat,
  HeroStats,
  HeroStatsSkeleton,
  InsightList,
  PageHero,
  Section,
  type InsightTone,
} from "@/components/page-hero";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fmt, fmtPct } from "@/components/dashboard/format";

const pct = (p: number) => fmtPct(Math.round(p * 1000) / 10);

/** Situação do teste numa pílula: vencedora (verde), sem diferença (cinza) ou rodando. */
function VerdictBadge({ report }: { report: ExperimentReport }) {
  const v = report.verdict;
  if (!report.active) return <Badge variant="secondary">Encerrado</Badge>;
  if (v.kind === "winner") {
    const label =
      report.variants.find((x) => x.name === v.variant)?.label ?? v.variant;
    return <Badge variant="success">Vencedora: {label}</Badge>;
  }
  if (v.kind === "no_difference")
    return <Badge variant="secondary">Sem diferença: fica o controle</Badge>;
  return (
    <Badge variant="outline">
      <span aria-hidden className="bg-primary size-1.5 rounded-full" />
      Rodando
    </Badge>
  );
}

/** Uma frase que lê o teste, para a seção de insights. */
function sentence(r: ExperimentReport): { text: string; tone: InsightTone } {
  const measured = r.variants.reduce((s, v) => s + v.measured, 0);
  if (r.verdict.kind === "winner") {
    const winner = r.variants.find(
      (v) => v.name === (r.verdict as { variant: string }).variant,
    );
    return {
      text: `${r.title}: "${winner?.label}" venceu, com ${pct(winner?.probabilityBest ?? 0)} de chance de ser a melhor. Troque o padrão no código e encerre o teste.`,
      tone: "green",
    };
  }
  if (r.verdict.kind === "no_difference") {
    return {
      text: `${r.title}: ${r.decision.maxDays / 7} semanas sem vencedora. Fica o controle; encerre o teste.`,
      tone: "neutral",
    };
  }
  if (measured === 0) {
    return {
      text: `${r.title}: ninguém com a janela fechada ainda (${r.metric.toLowerCase()}).`,
      tone: "neutral",
    };
  }
  const lead = [...r.variants].sort(
    (a, b) => b.probabilityBest - a.probabilityBest,
  )[0];
  return {
    text: `${r.title}: "${lead.label}" na frente (${pct(lead.probabilityBest)} de chance), mas faltam ${fmt(r.verdict.missing)} pessoas medidas na menor variante para decidir.`,
    tone: "lime",
  };
}

/**
 * Experimentos (25/10/2026): os testes A/B da ativação, com quem foi
 * sorteado, quantos converteram e a chance de cada variante ser a melhor. A
 * regra de decisão vem da API: pelo menos 50 pessoas medidas por variante e
 * 90% de chance, ou 8 semanas sem vencedora (fica o controle).
 */
export default function ExperimentsPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["experiments"],
    queryFn: () => api.get<ExperimentReport[]>("/admin/experiments"),
  });

  const active = data?.filter((r) => r.active) ?? [];
  const assigned =
    data?.reduce(
      (s, r) => s + r.variants.reduce((x, v) => x + v.assigned, 0),
      0,
    ) ?? 0;
  const measured =
    data?.reduce(
      (s, r) => s + r.variants.reduce((x, v) => x + v.measured, 0),
      0,
    ) ?? 0;
  const decided = data?.filter((r) => r.verdict.kind !== "running").length ?? 0;
  const rule = data?.[0]?.decision;

  return (
    <div className="space-y-12">
      <PageHero
        title="Experimentos"
        description={
          rule
            ? `Testes A/B da ativação. Uma variante vence com pelo menos ${rule.minPerArm} pessoas medidas em cada uma e ${pct(rule.minProbability)} de chance de ser a melhor; depois de ${rule.maxDays / 7} semanas sem vencedora, fica o controle.`
            : "Testes A/B da ativação: quem foi sorteado, quantos converteram e a chance de cada variante ser a melhor."
        }
      >
        {isLoading ? (
          <HeroStatsSkeleton count={4} />
        ) : data ? (
          <HeroStats cols={4}>
            <HeroStat
              label="Testes rodando"
              value={fmt(active.length)}
              note={`${fmt(data.length)} no total`}
              help="Testes ativos: novos cadastros entram no sorteio."
            />
            <HeroStat
              label="Pessoas sorteadas"
              value={fmt(assigned)}
              note="somando os testes"
              help="Cada pessoa é sorteada uma vez por teste, quando vê a tela testada."
            />
            <HeroStat
              label="Já medidas"
              value={fmt(measured)}
              note="com a janela da métrica fechada"
              help="Só entra na taxa quem já teve o tempo inteiro da métrica (ex.: 72 h depois do sorteio)."
            />
            <HeroStat
              label="Com decisão"
              value={fmt(decided)}
              note="vencedora ou sem diferença"
              help="Testes que já bateram a regra de decisão."
            />
          </HeroStats>
        ) : null}
      </PageHero>

      {isError ? (
        <ErrorState
          title="Não foi possível carregar os experimentos."
          error={error}
          onRetry={() => void refetch()}
          retrying={isFetching}
        />
      ) : isLoading || !data ? (
        <div className="grid gap-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="rounded-card h-56" />
          ))}
        </div>
      ) : (
        <>
          <Section
            title="Os testes"
            description="Cada linha é uma variante; a primeira é o controle (o que existia antes)."
          >
            <div className="grid gap-4">
              {data.map((r) => (
                <ExperimentCard key={r.key} report={r} />
              ))}
            </div>
          </Section>

          <Section
            title="O que os números dizem"
            description="Cada teste em uma frase, com o próximo passo."
          >
            <InsightList columns={1} items={data.map(sentence)} />
          </Section>
        </>
      )}
    </div>
  );
}

function ExperimentCard({ report }: { report: ExperimentReport }) {
  return (
    <Card className="min-w-0 gap-4 shadow-none">
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <CardTitle className="text-base">{report.title}</CardTitle>
          <VerdictBadge report={report} />
        </div>
        <CardDescription className="tabular-nums">
          {report.metric} ·{" "}
          {report.daysRunning === 1
            ? "1 dia"
            : `${fmt(report.daysRunning)} dias`}{" "}
          rodando · chave{" "}
          <code className="bg-muted rounded px-1 py-0.5 text-xs">
            {report.key}
          </code>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Celular: um bloco por variante, com a taxa e a chance à vista (a tabela rolaria de lado). */}
        <ul className="divide-y sm:hidden">
          {report.variants.map((v) => (
            <li key={v.name} className="space-y-2 py-3 first:pt-0 last:pb-0">
              <p className="text-sm">
                <span className="font-medium">{v.label}</span>
                {v.isControl && (
                  <span className="text-muted-foreground ml-2 text-xs">
                    controle
                  </span>
                )}
              </p>
              <p className="text-muted-foreground text-xs tabular-nums">
                {v.rate == null
                  ? "Ninguém medido ainda"
                  : `${fmtPct(v.rate)} · ${fmt(v.converted)} de ${fmt(v.measured)} medidos`}{" "}
                · {fmt(v.assigned)} sorteados
              </p>
              <ChanceBar v={v} measured={anyMeasured(report)} />
            </li>
          ))}
        </ul>
        <div className="hidden sm:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Variante</TableHead>
                <TableHead className="text-right">Sorteados</TableHead>
                <TableHead className="text-right">Medidos</TableHead>
                <TableHead className="text-right">Converteram</TableHead>
                <TableHead className="text-right">Taxa</TableHead>
                <TableHead className="w-[30%]">
                  Chance de ser a melhor
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.variants.map((v) => (
                <VariantRow key={v.name} v={v} measured={anyMeasured(report)} />
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

const anyMeasured = (r: ExperimentReport) =>
  r.variants.some((v) => v.measured > 0);

/** A chance de ser a melhor; sem ninguém medido, "—" (50%/50% pareceria um empate medido). */
function ChanceBar({
  v,
  measured,
}: {
  v: ExperimentVariantReport;
  measured: boolean;
}) {
  if (!measured)
    return <span className="text-muted-foreground text-sm">—</span>;
  return (
    <div className="flex items-center gap-3">
      <div
        className="bg-muted h-2 flex-1 overflow-hidden rounded-full"
        aria-hidden
      >
        <div
          className={cn(
            "h-full rounded-full",
            v.probabilityBest >= 0.9
              ? "bg-[var(--chart-1)]"
              : "bg-[var(--chart-2)]",
          )}
          style={{ width: `${Math.max(2, v.probabilityBest * 100)}%` }}
        />
      </div>
      <span className="w-12 text-right text-sm tabular-nums">
        {pct(v.probabilityBest)}
      </span>
    </div>
  );
}

function VariantRow({
  v,
  measured,
}: {
  v: ExperimentVariantReport;
  measured: boolean;
}) {
  return (
    <TableRow>
      <TableCell className="whitespace-normal">
        <span className="font-medium">{v.label}</span>
        {v.isControl && (
          <span className="text-muted-foreground ml-2 text-xs">controle</span>
        )}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {fmt(v.assigned)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {fmt(v.measured)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {fmt(v.converted)}
      </TableCell>
      <TableCell className="text-right font-semibold tabular-nums">
        {v.rate == null ? "—" : fmtPct(v.rate)}
      </TableCell>
      <TableCell>
        <ChanceBar v={v} measured={measured} />
      </TableCell>
    </TableRow>
  );
}
