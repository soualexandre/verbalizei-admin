"use client";

import { useState } from "react";
import type { DashboardOverview, LatencyStats, ReturnRate } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HeroStat, HeroStats, InsightList, Section, type InsightTone } from "@/components/page-hero";
import { ActiveUsersChart, HourlyChart, InteractionsChart, KindDonut, KindLegend, WeekHourHeatmap, WeekdayChart } from "./charts";
import { CohortTable } from "./cohort-table";
import { DayActivityDialog } from "./day-activity-dialog";
import { fmt, fmtPct, pointsTrend, relativeTrend, shortDay } from "./format";
import { dayparts, funnelSentence, funnelSteps, hourSentence, slotSentence, summarySentences, weekdaySentence } from "./insights";

/**
 * Os totalizadores da Visão geral, na faixa azul (PageHero). Padrão do admin
 * desde 25/10/2026: totalizadores no topo → gráficos → insights.
 */
export function OverviewStats({ data }: { data: DashboardOverview }) {
  const { kpis, period, totals } = data;
  const before = `${period.days} dias antes`;
  return (
    <HeroStats cols={data.microReturn ? 6 : 4}>
      <HeroStat
        label="Pessoas que treinaram"
        help="Pessoas que treinaram ao menos uma vez no período (cenário, gravação, treino curto ou jogo)."
        value={fmt(kpis.activeUsers.value)}
        trend={relativeTrend(kpis.activeUsers.value, kpis.activeUsers.previous)}
        note={totals.users ? `${fmtPct(Math.round((kpis.activeUsers.value / totals.users) * 1000) / 10)} da base · ${before}: ${fmt(kpis.activeUsers.previous)}` : undefined}
      />
      <HeroStat
        label="Novos cadastros"
        help="Contas criadas no período, e quantas já treinaram."
        value={fmt(kpis.newUsers.value)}
        trend={relativeTrend(kpis.newUsers.value, kpis.newUsers.previous)}
        note={
          kpis.newUsers.value
            ? `${fmt(kpis.newUsers.activated)} já treinaram (${fmtPct(Math.round((kpis.newUsers.activated / kpis.newUsers.value) * 100))})`
            : "Nenhum cadastro no período"
        }
      />
      <HeroStat
        label="Treinos feitos"
        help="Tudo o que foi treinado: cenários, gravações, treinos curtos e jogos."
        value={fmt(kpis.interactions.value)}
        trend={relativeTrend(kpis.interactions.value, kpis.interactions.previous)}
        note={
          kpis.activeUsers.value
            ? `${(kpis.interactions.value / kpis.activeUsers.value).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} por pessoa que treinou`
            : undefined
        }
      />
      <HeroStat
        label="Voltaram a treinar"
        help="De quem treinou no período anterior, quantos voltaram a treinar neste (retenção)."
        value={kpis.retention.value == null ? "—" : fmtPct(kpis.retention.value)}
        trend={pointsTrend(kpis.retention.value, kpis.retention.previous)}
        note={kpis.retention.base ? `dos ${fmt(kpis.retention.base)} do período anterior` : "Ninguém no período anterior"}
      />
      {/* A volta ao treino curto é número, não conclusão: fica na faixa (revisão de 25/10/2026). */}
      {data.microReturn && (
        <>
          <ReturnStat
            label="Treino curto: volta no dia seguinte"
            help="Dos dias em que alguém fez um treino curto, quantos tiveram outro no dia seguinte."
            rate={data.microReturn.nextDay}
          />
          <ReturnStat
            label="Treino curto: volta na semana"
            help="Dos dias em que alguém fez um treino curto, quantos tiveram outro entre 2 e 7 dias depois."
            rate={data.microReturn.nextWeek}
          />
        </>
      )}
    </HeroStats>
  );
}

/** A linha de base da faixa: o período e o tamanho da base. */
export function overviewDescription(data: DashboardOverview): string {
  const { period, totals } = data;
  return `${shortDay(period.from)} a ${shortDay(period.to)}, comparado aos ${period.days} dias anteriores · base de ${fmt(totals.users)} pessoas, ${fmt(totals.premium)} premium.`;
}

const CHART_CARD = "min-w-0 gap-4 shadow-none";

/**
 * A visão geral abaixo da faixa: gráficos primeiro (quando treinam, quem
 * treinou dia a dia, o que treinam, do cadastro ao hábito), insights depois
 * (o período em frases, os cenários mais treinados, a volta ao treino curto).
 */
export function Overview({ data }: { data: DashboardOverview }) {
  const { kpis, period } = data;
  const completion = data.scenarioCompletion;
  const completionRate = completion.started ? (completion.completed / completion.started) * 100 : null;
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const summary = summarySentences(data);
  // Sentido da cor igual ao da faixa: azul = uso, verde = bom sinal.
  const tones: InsightTone[] = ["brand", "green", "brand", "brand", "brand"];

  return (
    <div className="space-y-12">
      {data.weekday && data.heatmap && data.hourly && (
        <Section title="Quando as pessoas treinam" description="Dia da semana e horário, no fuso de Brasília. Bom para escolher a hora de lembretes, posts e e-mails.">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className={CHART_CARD}>
              <CardHeader>
                <CardTitle className="text-base">Dia da semana</CardTitle>
                <CardDescription className="text-foreground/80 tabular-nums">{weekdaySentence(data.weekday)}</CardDescription>
                <CardDescription>
                  {period.days >= 14
                    ? `Média de treinos em cada dia da semana (em ${period.days} dias cada um aparece mais de uma vez, por isso média e não total).`
                    : "Treinos em cada dia da semana nos últimos 7 dias."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <WeekdayChart weekday={data.weekday} />
              </CardContent>
            </Card>
            <Card className={CHART_CARD}>
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
          <Card className={CHART_CARD}>
            <CardHeader>
              <CardTitle className="text-base">Dia da semana × horário</CardTitle>
              <CardDescription className="text-foreground/80 tabular-nums">{slotSentence(data.heatmap)}</CardDescription>
            </CardHeader>
            <CardContent>
              <WeekHourHeatmap heatmap={data.heatmap} />
            </CardContent>
          </Card>
        </Section>
      )}

      <Section title="Quem treinou, dia a dia" description="Clique num dia para ver quem treinou e em quê.">
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className={`${CHART_CARD} lg:col-span-2`}>
            <CardHeader>
              <CardTitle className="text-base">Pessoas que treinaram por dia</CardTitle>
              <CardDescription className="text-foreground/80 tabular-nums">{peakDaySentence(data.daily)}</CardDescription>
            </CardHeader>
            <CardContent>
              <ActiveUsersChart daily={data.daily} onSelectDay={setSelectedDay} />
              <DayActivityDialog day={selectedDay} onClose={() => setSelectedDay(null)} />
            </CardContent>
          </Card>
          <Card className={CHART_CARD}>
            <CardHeader>
              <CardTitle className="text-base">O que treinam</CardTitle>
              <CardDescription>A fatia de cada tipo no período.</CardDescription>
            </CardHeader>
            <CardContent>
              <KindDonut byKind={kpis.interactions.byKind} />
            </CardContent>
          </Card>
          <Card className={`${CHART_CARD} lg:col-span-3`}>
            <CardHeader>
              <CardTitle className="text-base">Treinos por dia, por tipo</CardTitle>
              <KindLegend byKind={kpis.interactions.byKind} users={kpis.activeUsers.value} />
            </CardHeader>
            <CardContent>
              <InteractionsChart daily={data.daily} />
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section title="Do cadastro ao hábito" description="Quem chega, quem começa a treinar e quem continua.">
        <div className="grid gap-4 lg:grid-cols-2">
          {data.activation && <FunnelCard activation={data.activation} days={period.days} />}
          <Card className={CHART_CARD}>
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
      </Section>

      <Section title="O que os números dizem" description="O período em frases e os cenários mais treinados.">
        <div className="grid gap-4 lg:grid-cols-2">
          <InsightList columns={1} items={summary.map((text, i) => ({ text, tone: tones[i] ?? "brand" }))} />
          <Card className={CHART_CARD}>
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
                      <span className="bg-green-100 text-primary flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums">{i + 1}</span>
                      <span className="min-w-0 flex-1 truncate" title={s.title}>
                        {s.title}
                      </span>
                      <span className="text-right tabular-nums">
                        <span className="font-semibold">{fmt(s.sessions)}</span>
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
      </Section>

      {data.drillLatency && (
        <details className="group rounded-card bg-card border">
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

/** "O dia mais cheio foi 30/09, com 13 pessoas; em média, 8 por dia." */
function peakDaySentence(daily: DashboardOverview["daily"]): string {
  if (!daily.length) return "Nenhum dia no período.";
  const peak = daily.reduce((a, b) => (b.activeUsers > a.activeUsers ? b : a));
  if (!peak.activeUsers) return "Ninguém treinou no período.";
  const avg = daily.reduce((sum, d) => sum + d.activeUsers, 0) / daily.length;
  return `O dia mais cheio foi ${shortDay(peak.day)}, com ${fmt(peak.activeUsers)} ${peak.activeUsers === 1 ? "pessoa" : "pessoas"}; em média, ${avg.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} por dia.`;
}

/** A volta depois do treino curto, na faixa, com a variação em pontos percentuais. */
function ReturnStat({ label, help, rate }: { label: string; help: string; rate: ReturnRate }) {
  return (
    <HeroStat
      label={label}
      help={help}
      value={rate.value == null ? "—" : fmtPct(rate.value)}
      trend={pointsTrend(rate.value, rate.previous)}
      note={rate.base ? `de ${fmt(rate.base)} dias com treino curto` : "Ninguém fez treino curto"}
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


