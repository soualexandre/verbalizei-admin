"use client";

import { useState } from "react";
import type { DashboardOverview, LatencyStats, ReturnRate } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ActiveUsersChart, InteractionsChart, KindLegend } from "./charts";
import { CohortTable } from "./cohort-table";
import { DayActivityDialog } from "./day-activity-dialog";
import { fmt, fmtPct, pointsTrend, relativeTrend, shortDay } from "./format";
import { KpiCard } from "./kpi-card";

/** A visão geral já carregada: os quatro números, retenção e treinos. */
export function Overview({ data }: { data: DashboardOverview }) {
  const { kpis, period, totals } = data;
  const before = `${period.days} dias antes`;
  const completion = data.scenarioCompletion;
  const completionRate = completion.started ? (completion.completed / completion.started) * 100 : null;
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <p className="text-muted-foreground text-sm tabular-nums">
          {shortDay(period.from)} a {shortDay(period.to)} · Base: {fmt(totals.users)} usuários, {fmt(totals.premium)}{" "}
          premium{totals.admins ? ` · ${fmt(totals.admins)} admins fora da conta` : ""}
        </p>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Usuários ativos"
            help="Pessoas que fizeram ao menos uma interação no período (cenário, gravação, micro-treino ou jogo)."
            value={fmt(kpis.activeUsers.value)}
            trend={relativeTrend(kpis.activeUsers.value, kpis.activeUsers.previous)}
            previousLabel={`${before}: ${fmt(kpis.activeUsers.previous)}`}
            detail={totals.users ? `${fmtPct(Math.round((kpis.activeUsers.value / totals.users) * 1000) / 10)} da base` : undefined}
          />
          <KpiCard
            label="Novos usuários"
            help="Cadastros no período, e quantos deles já fizeram a primeira interação (ativação)."
            value={fmt(kpis.newUsers.value)}
            trend={relativeTrend(kpis.newUsers.value, kpis.newUsers.previous)}
            previousLabel={`${before}: ${fmt(kpis.newUsers.previous)}`}
            detail={
              kpis.newUsers.value
                ? `${fmt(kpis.newUsers.activated)} já treinaram (${fmtPct(Math.round((kpis.newUsers.activated / kpis.newUsers.value) * 100))})`
                : "Nenhum cadastro no período"
            }
          />
          <KpiCard
            label="Interações"
            help="Tudo o que foi feito no período: cenários, gravações (inclui o 1º reconhecimento), micro-treinos e rodadas de jogos."
            value={fmt(kpis.interactions.value)}
            trend={relativeTrend(kpis.interactions.value, kpis.interactions.previous)}
            previousLabel={`${before}: ${fmt(kpis.interactions.previous)}`}
            detail={
              kpis.activeUsers.value
                ? `${(kpis.interactions.value / kpis.activeUsers.value).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} por usuário ativo`
                : undefined
            }
          />
          <KpiCard
            label="Retenção"
            help="Dos usuários ativos no período anterior, a % que voltou a ter alguma interação neste período."
            value={kpis.retention.value == null ? "—" : fmtPct(kpis.retention.value)}
            trend={pointsTrend(kpis.retention.value, kpis.retention.previous)}
            previousLabel={
              kpis.retention.previous == null ? `${before}: sem base` : `${before}: ${fmtPct(kpis.retention.previous)}`
            }
            detail={
              kpis.retention.base
                ? `dos ${fmt(kpis.retention.base)} ativos no período anterior`
                : "Ninguém ativo no período anterior"
            }
          />
        </div>
      </section>

      <section className="space-y-4">
        <SectionTitle title="Retenção" description="Quem usa e quem volta." />
        {data.microReturn && (
          <div className="grid gap-4 sm:grid-cols-2">
            <ReturnCard
              label="Voltou no dia seguinte"
              help="Dos dias em que alguém fez micro-treino, a % em que fez outro no dia seguinte."
              rate={data.microReturn.nextDay}
              before={before}
            />
            <ReturnCard
              label="Voltou na mesma semana"
              help="Dos dias em que alguém fez micro-treino, a % em que fez outro entre o 2º e o 7º dia depois."
              rate={data.microReturn.nextWeek}
              before={before}
            />
          </div>
        )}
        {data.drillLatency && <DrillLatencyCard latency={data.drillLatency} />}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="gap-4 shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Usuários ativos por dia</CardTitle>
              <CardDescription>Pessoas com ao menos uma interação no dia. Clique num dia para ver quem treinou e em quê.</CardDescription>
            </CardHeader>
            <CardContent>
              <ActiveUsersChart daily={data.daily} onSelectDay={setSelectedDay} />
              <DayActivityDialog day={selectedDay} onClose={() => setSelectedDay(null)} />
            </CardContent>
          </Card>
          <Card className="gap-4 shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Coortes semanais</CardTitle>
              <CardDescription>
                Dos que se cadastraram em cada semana, a % que treinou na semana do cadastro (S0) e nas seguintes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CohortTable cohorts={data.cohorts} />
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <SectionTitle title="Treinos" description="O que as pessoas fazem no app." />
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="gap-4 shadow-none lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Interações por dia</CardTitle>
              <KindLegend byKind={kpis.interactions.byKind} />
            </CardHeader>
            <CardContent>
              <InteractionsChart daily={data.daily} />
            </CardContent>
          </Card>
          <Card className="gap-4 shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Cenários</CardTitle>
              <CardDescription className="tabular-nums">
                {completion.started && completionRate != null
                  ? `${fmt(completion.completed)} de ${fmt(completion.started)} sessões abertas foram concluídas (${fmtPct(Math.round(completionRate))}).`
                  : "Nenhuma sessão de cenário no período."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.topScenarios.length ? (
                <ol className="divide-y">
                  {data.topScenarios.map((s, i) => (
                    <li key={s.id} className="flex items-center gap-3 py-2.5 text-sm">
                      <span className="text-muted-foreground w-4 text-right tabular-nums">{i + 1}</span>
                      <span className="min-w-0 flex-1 truncate" title={s.title}>
                        {s.title}
                      </span>
                      <span className="text-right tabular-nums">
                        <span className="font-medium">{fmt(s.sessions)}</span>
                        <span className="text-muted-foreground"> · {fmt(s.users)} pessoas</span>
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-muted-foreground text-sm">Os mais treinados aparecem aqui.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

/** A volta depois do micro-treino, com a variação em pontos percentuais. */
function ReturnCard({ label, help, rate, before }: { label: string; help: string; rate: ReturnRate; before: string }) {
  return (
    <KpiCard
      label={label}
      help={help}
      value={rate.value == null ? "—" : fmtPct(rate.value)}
      trend={pointsTrend(rate.value, rate.previous)}
      previousLabel={rate.previous == null ? `${before}: sem base` : `${before}: ${fmtPct(rate.previous)}`}
      detail={rate.base ? `de ${fmt(rate.base)} dias com micro-treino` : "Ninguém fez micro-treino na base"}
    />
  );
}

const PROFILE_LABELS = { text: "Texto", voice: "Voz", full: "Completo" } as const;
const fmtSeconds = (v: number) => `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} s`;

function DrillLatencyCard({ latency }: { latency: Record<"text" | "voice" | "full", LatencyStats | null> }) {
  return (
    <Card className="gap-4 shadow-none">
      <CardHeader>
        <CardTitle className="text-base">Latência do treino curto (7 dias)</CardTitle>
        <CardDescription>Do envio ao resultado, por perfil: mediana (p50) e p95.</CardDescription>
      </CardHeader>
      <CardContent>
        <table className="w-full text-sm tabular-nums">
          <thead>
            <tr className="text-muted-foreground text-left">
              <th className="py-1 font-medium">Perfil</th>
              <th className="py-1 text-right font-medium">Treinos</th>
              <th className="py-1 text-right font-medium">p50</th>
              <th className="py-1 text-right font-medium">p95</th>
            </tr>
          </thead>
          <tbody>
            {(Object.keys(PROFILE_LABELS) as Array<keyof typeof PROFILE_LABELS>).map((k) => {
              const s = latency[k];
              return (
                <tr key={k} className="border-t">
                  <td className="py-1.5">{PROFILE_LABELS[k]}</td>
                  <td className="py-1.5 text-right">{s ? fmt(s.count) : "—"}</td>
                  <td className="py-1.5 text-right">{s ? fmtSeconds(s.p50) : "—"}</td>
                  <td className="py-1.5 text-right">{s ? fmtSeconds(s.p95) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function SectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  );
}

