"use client";

import { useState } from "react";
import type { DashboardOverview, LatencyStats, ReturnRate } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Clock, Repeat, Sparkles, UserPlus, Users } from "lucide-react";
import { ActiveUsersChart, HourlyChart, InteractionsChart, KindLegend, WeekHourHeatmap, WeekdayChart } from "./charts";
import { CohortTable } from "./cohort-table";
import { DayActivityDialog } from "./day-activity-dialog";
import { fmt, fmtPct, pointsTrend, relativeTrend, shortDay } from "./format";
import { KpiCard } from "./kpi-card";
import { dayparts, funnelSentence, funnelSteps, hourSentence, slotSentence, summarySentences, weekdaySentence } from "./insights";

/**
 * A visão geral já carregada. Desde 25/10/2026 (pedido do usuário: o painel
 * tem de se explicar sozinho) cada bloco abre com a frase que lê o número, e a
 * ordem é: resumo em frases → totalizadores → quando as pessoas treinam (dia da
 * semana, horário, dia × hora) → do cadastro ao hábito (funil + coortes) →
 * ativos por dia → o que treinam → volta ao treino curto → detalhes técnicos.
 */
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
        <SummaryCard sentences={summarySentences(data)} />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Usuários ativos"
            help="Pessoas que treinaram ao menos uma vez no período."
            value={fmt(kpis.activeUsers.value)}
            trend={relativeTrend(kpis.activeUsers.value, kpis.activeUsers.previous)}
            previousLabel={`${before}: ${fmt(kpis.activeUsers.previous)}`}
            detail={totals.users ? `${fmtPct(Math.round((kpis.activeUsers.value / totals.users) * 1000) / 10)} da base` : undefined}
          />
          <KpiCard
            label="Novos usuários"
            help="Contas criadas no período, e quantas já treinaram."
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
            label="Treinos feitos"
            help="Tudo o que foi treinado: cenários, gravações, treinos curtos e jogos."
            value={fmt(kpis.interactions.value)}
            trend={relativeTrend(kpis.interactions.value, kpis.interactions.previous)}
            previousLabel={`${before}: ${fmt(kpis.interactions.previous)}`}
            detail={
              kpis.activeUsers.value
                ? `${(kpis.interactions.value / kpis.activeUsers.value).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} por pessoa que treinou`
                : undefined
            }
          />
          <KpiCard
            label="Retenção"
            help="De quem treinou no período anterior, quantos voltaram a treinar neste."
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

      {data.weekday && data.heatmap && data.hourly && (
        <section className="space-y-4">
          <SectionTitle title="Quando as pessoas treinam" description="Dia da semana e horário, no fuso de Brasília. Bom para escolher a hora de lembretes, posts e e-mails." />
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="min-w-0 gap-4 shadow-none">
              <CardHeader>
                <CardTitle className="text-base">Dia da semana</CardTitle>
                <CardDescription className="text-foreground/80 tabular-nums">{weekdaySentence(data.weekday)}</CardDescription>
                <CardDescription>Média de treinos em cada dia (em 30 dias há 4 ou 5 de cada, por isso média e não total).</CardDescription>
              </CardHeader>
              <CardContent>
                <WeekdayChart weekday={data.weekday} />
              </CardContent>
            </Card>
            <Card className="min-w-0 gap-4 shadow-none">
              <CardHeader>
                <CardTitle className="text-base">Horário</CardTitle>
                <CardDescription className="text-foreground/80 tabular-nums">{hourSentence(data.hourly)}</CardDescription>
                <DaypartChips hourly={data.hourly} />
              </CardHeader>
              <CardContent>
                <HourlyChart hourly={data.hourly} />
              </CardContent>
            </Card>
          </div>
          <Card className="min-w-0 gap-4 shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Dia da semana × horário</CardTitle>
              <CardDescription className="text-foreground/80 tabular-nums">{slotSentence(data.heatmap)}</CardDescription>
            </CardHeader>
            <CardContent>
              <WeekHourHeatmap heatmap={data.heatmap} />
            </CardContent>
          </Card>
        </section>
      )}

      <section className="space-y-4">
        <SectionTitle title="Do cadastro ao hábito" description="Quem chega, quem começa a treinar e quem continua." />
        <div className="grid gap-4 lg:grid-cols-2">
          {data.activation && <FunnelCard activation={data.activation} days={period.days} />}
          <Card className="min-w-0 gap-4 shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Quem continua, semana a semana</CardTitle>
              <CardDescription>
                Cada linha é a turma que se cadastrou naquela semana. S0 é a própria semana do cadastro, S1 a seguinte e assim por diante: a % é quantos da turma treinaram ali. Mais escuro, mais gente voltando.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CohortTable cohorts={data.cohorts} />
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <SectionTitle title="Quem treinou, dia a dia" description="Clique num dia para ver quem treinou e em quê." />
        <Card className="min-w-0 gap-4 shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Pessoas que treinaram por dia</CardTitle>
          </CardHeader>
          <CardContent>
            <ActiveUsersChart daily={data.daily} onSelectDay={setSelectedDay} />
            <DayActivityDialog day={selectedDay} onClose={() => setSelectedDay(null)} />
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <SectionTitle title="O que treinam" description="Os tipos de treino e os cenários mais usados." />
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="min-w-0 gap-4 shadow-none lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Treinos por dia, por tipo</CardTitle>
              <KindLegend byKind={kpis.interactions.byKind} users={kpis.activeUsers.value} />
            </CardHeader>
            <CardContent>
              <InteractionsChart daily={data.daily} />
            </CardContent>
          </Card>
          <Card className="min-w-0 gap-4 shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Cenários mais treinados</CardTitle>
              <CardDescription className="tabular-nums">
                {completion.started && completionRate != null
                  ? `${fmt(completion.completed)} de ${fmt(completion.started)} cenários abertos foram até o fim (${fmtPct(Math.round(completionRate))}).`
                  : "Nenhum cenário no período."}
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

      {data.microReturn && (
        <section className="space-y-4">
          <SectionTitle title="Volta ao treino curto" description="Quem faz um treino curto volta a fazer outro?" />
          <div className="grid gap-4 sm:grid-cols-2">
            <ReturnCard
              label="Voltou no dia seguinte"
              help="Dos dias em que alguém fez um treino curto, quantos tiveram outro no dia seguinte."
              rate={data.microReturn.nextDay}
              before={before}
            />
            <ReturnCard
              label="Voltou na mesma semana"
              help="Dos dias em que alguém fez um treino curto, quantos tiveram outro entre 2 e 7 dias depois."
              rate={data.microReturn.nextWeek}
              before={before}
            />
          </div>
        </section>
      )}

      {data.drillLatency && (
        <details className="group rounded-card border">
          <summary className="cursor-pointer list-none px-5 py-4 text-sm font-medium [&::-webkit-details-marker]:hidden">
            Detalhes técnicos <span className="text-muted-foreground font-normal">· tempo da análise do treino curto</span>
          </summary>
          <div className="px-5 pb-5">
            <DrillLatencyCard latency={data.drillLatency} />
          </div>
        </details>
      )}
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
    <Card className="min-w-0 gap-4 shadow-none">
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

/** O resumo do topo: o período em frases, cada uma lendo um número. */
function SummaryCard({ sentences }: { sentences: string[] }) {
  const icons = [Users, UserPlus, CalendarDays, Clock, Repeat];
  return (
    <Card className="gap-3 px-5 py-5 shadow-none">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Sparkles className="text-primary size-4" aria-hidden />
        Resumo do período
      </p>
      <ul className="grid gap-x-8 gap-y-2.5 md:grid-cols-2">
        {sentences.map((text, i) => {
          const Icon = icons[i] ?? Sparkles;
          return (
            <li key={i} className="flex gap-2.5 text-sm leading-snug tabular-nums">
              <Icon className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
              {text}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/** Os quatro turnos com a fatia de cada um, para ler o horário sem contar barras. */
function DaypartChips({ hourly }: { hourly: NonNullable<DashboardOverview["hourly"]> }) {
  const parts = dayparts(hourly);
  const top = Math.max(...parts.map((p) => p.share));
  return (
    <ul className="flex flex-wrap gap-2 pt-1">
      {parts.map((p) => (
        <li
          key={p.key}
          className={
            "rounded-full border px-2.5 py-1 text-xs tabular-nums " +
            (p.share === top && top > 0 ? "border-primary/40 bg-primary/5 font-semibold" : "text-muted-foreground")
          }
          title={p.range}
        >
          {p.label} {fmtPct(p.share)}
        </li>
      ))}
    </ul>
  );
}

/** Funil dos novos: barras horizontais com a % dos cadastros e a maior perda em frase. */
function FunnelCard({ activation, days }: { activation: NonNullable<DashboardOverview["activation"]>; days: number }) {
  const steps = funnelSteps(activation);
  return (
    <Card className="min-w-0 gap-4 shadow-none">
      <CardHeader>
        <CardTitle className="text-base">Novos nos últimos {days} dias</CardTitle>
        <CardDescription className="text-foreground/80 tabular-nums">{funnelSentence(steps)}</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3.5">
          {steps.map((s) => (
            <li key={s.label} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span>
                  <span className="font-medium">{s.label}</span>
                  <span className="text-muted-foreground"> · {s.help}</span>
                </span>
                <span className="shrink-0 tabular-nums">
                  <span className="font-semibold">{fmt(s.count)}</span>
                  <span className="text-muted-foreground"> ({fmtPct(s.share)})</span>
                </span>
              </div>
              <div className="bg-muted h-2.5 overflow-hidden rounded-full">
                <div className="h-full rounded-full bg-[var(--chart-1)]" style={{ width: `${Math.max(s.count ? 2 : 0, s.share)}%` }} />
              </div>
            </li>
          ))}
        </ol>
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

