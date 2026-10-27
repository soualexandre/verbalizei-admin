"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, api } from "@/lib/api";
import type { ActivationRate, ActivationReport } from "@/lib/types";
import { ErrorState } from "@/components/error-state";
import { HeroStat, HeroStats, InsightList, PageHero, Section, HeroStatsSkeleton } from "@/components/page-hero";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmt, fmtPct } from "@/components/dashboard/format";

const PERIODS = [7, 30, 90, 180] as const;

/** Os recortes, na ordem do seletor (as chaves vêm da API). */
const BREAKDOWNS: Array<{ key: string; label: string }> = [
  { key: "semana", label: "Semana de cadastro" },
  { key: "semana_24h", label: "Semana de cadastro (só ≥ 24 h)" },
  { key: "origem", label: "Origem do cadastro" },
  { key: "canal", label: "Canal (web ou app)" },
  { key: "aparelho", label: "Aparelho" },
  { key: "navegador", label: "Navegador" },
  { key: "cadastro", label: "Forma de cadastro" },
  { key: "foco", label: "Foco (conversa que está vindo)" },
  { key: "momento", label: "Momento da carreira" },
  { key: "area", label: "Área" },
  { key: "onboarding", label: "Versão do onboarding" },
  { key: "onboarding_24h", label: "Versão do onboarding (só ≥ 24 h)" },
  { key: "fim_onboarding", label: "Onde terminou o onboarding" },
];

/**
 * Ativação (25/10/2026, pedido do usuário): o relatório que rodava no servidor
 * (`npm run report:activation`), aqui no painel e para baixar — o CSV traz uma
 * linha por pessoa com a etapa em que parou e a próxima ação sugerida. Tudo
 * conta só pessoas reais (sem mocks e admins) cadastradas na janela escolhida.
 * Padrão do admin (25/10/2026): faixa azul com os totais → gráficos → insights.
 */
export default function ActivationPage() {
  const [days, setDays] = useState<(typeof PERIODS)[number]>(30);
  const [downloading, setDownloading] = useState<"csv" | "md" | null>(null);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["activation-report", days],
    queryFn: () => api.get<ActivationReport>(`/admin/reports/activation?days=${days}`),
    placeholderData: (prev) => prev,
  });

  const download = async (format: "csv" | "md") => {
    setDownloading(format);
    try {
      const text = await apiFetch<string>(`/admin/reports/activation/export?days=${days}&format=${format}`);
      // O fetch tira o BOM do começo do texto; sem ele o Excel abre os acentos errados.
      const body = format === "csv" && !text.startsWith("\uFEFF") ? `\uFEFF${text}` : text;
      const blob = new Blob([body], { type: format === "csv" ? "text/csv;charset=utf-8" : "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ativacao-${days}d-${new Date().toISOString().slice(0, 10)}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Não foi possível baixar o relatório.");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <>
      <PageHero
        title="Ativação"
        description={`Do cadastro ao hábito: quem se cadastrou nos últimos ${days} dias, onde parou e o que fazer.`}
        actions={
          <>
            <Tabs value={String(days)} onValueChange={(v) => setDays(Number(v) as typeof days)}>
              <TabsList aria-label="Período">
                {PERIODS.map((p) => (
                  <TabsTrigger key={p} value={String(p)} className="tabular-nums">
                    {p} dias
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <Button variant="outline" size="sm" onClick={() => download("csv")} disabled={downloading !== null} title="Baixar CSV (uma linha por pessoa)">
              <Download className="size-4" />
              {downloading === "csv" ? (
                "Baixando…"
              ) : (
                <>
                  <span className="sm:hidden">CSV</span>
                  <span className="hidden sm:inline">Baixar CSV (por pessoa)</span>
                </>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={() => download("md")} disabled={downloading !== null} title="Baixar o relatório em Markdown">
              <FileText className="size-4" />
              {downloading === "md" ? (
                "Baixando…"
              ) : (
                <>
                  <span className="sm:hidden">Relatório</span>
                  <span className="hidden sm:inline">Baixar relatório</span>
                </>
              )}
            </Button>
          </>
        }
      >
        {data ? (
          <div className={isFetching ? "opacity-70 transition-opacity" : "transition-opacity"}>
            <ActivationStats totals={data.totals} />
          </div>
        ) : isLoading ? (
          <HeroStatsSkeleton count={6} />
        ) : null}
      </PageHero>

      {isError && !data ? (
        <ErrorState title="Não foi possível carregar o relatório." onRetry={() => refetch()} />
      ) : isLoading || !data ? (
        <div className="space-y-10" aria-busy="true" aria-label="Carregando o relatório">
          <Skeleton className="h-80 rounded-card" />
          <Skeleton className="h-64 rounded-card" />
        </div>
      ) : (
        <div className={isFetching ? "space-y-12 opacity-70 transition-opacity" : "space-y-12 transition-opacity"}>
          <Report data={data} />
        </div>
      )}
    </>
  );
}

/** Os seis totais da janela, na faixa azul: cada etapa com a % dos cadastros. */
function ActivationStats({ totals: t }: { totals: ActivationReport["totals"] }) {
  const share = (n: number) => (t.signups ? fmtPct(Math.round((n / t.signups) * 100)) : "—");
  return (
    <HeroStats cols={6}>
      <HeroStat label="Se cadastraram" value={fmt(t.signups)} note="pessoas reais na janela" help="Contas criadas na janela escolhida, sem usuários de teste e administradores." />
      <HeroStat
        label="Fizeram alguma coisa"
        value={fmt(t.didSomething)}
        note={`${share(t.didSomething)} dos cadastros`}
        help="Fizeram qualquer atividade depois do cadastro: onboarding, sala, treino curto, jogo, roteiro ou cenário próprio."
      />
      <HeroStat
        label="Ficaram no onboarding"
        value={fmt(t.stuckOnboarding)}
        note={`${share(t.stuckOnboarding)} dos cadastros`}
        help="Começaram as perguntas de boas-vindas e não terminaram."
      />
      <HeroStat
        label="Criaram cenário"
        value={fmt(t.createdScenario)}
        note={`${share(t.createdScenario)} dos cadastros`}
        help="Criaram um cenário próprio, com o contexto deles."
      />
      <HeroStat
        label="Falaram numa sala"
        value={fmt(t.spoke)}
        note={`${share(t.spoke)} · a ativação real`}
        help="Entraram numa sala e gravaram ao menos um trecho. É a régua de ativação."
      />
      <HeroStat
        label="Treinaram em 2+ dias"
        value={fmt(t.returned)}
        note={`${share(t.returned)} · começo do hábito`}
        help="Treinaram em pelo menos dois dias diferentes: o primeiro sinal de hábito."
      />
    </HeroStats>
  );
}


/**
 * Abaixo da faixa, no padrão do admin: gráficos (funil e recortes) e depois
 * os insights (perdas com o que resolve, sinais, quem nunca falou, falhas).
 */
function Report({ data }: { data: ActivationReport }) {
  const main = data.funnel.filter((s) => !s.parallel);
  const parallel = data.funnel.filter((s) => s.parallel);
  const gaps = data.gaps.slice(0, 3);

  return (
    <>
      <NorthStarSection data={data} />

      <Section title="Funil" description="Cada barra é a % dos cadastros que chegou à etapa; ao lado, quanto passou da etapa anterior.">
        <Card className="shadow-none">
          <CardContent className="space-y-4 pt-6">
            <ol className="space-y-3">
              {main.map((s) => (
                <li key={s.key} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium">{s.label}</span>
                    <span className="shrink-0 tabular-nums">
                      <span className="font-semibold">{fmt(s.people)}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        · {s.ofSignups == null ? "—" : fmtPct(s.ofSignups)} do cadastro
                        {s.key !== "cadastrou" && s.ofPrevious != null ? ` · ${fmtPct(s.ofPrevious)} da anterior` : ""}
                      </span>
                    </span>
                  </div>
                  <div className="bg-muted h-2.5 overflow-hidden rounded-full">
                    <div className="h-full rounded-full bg-[var(--chart-1)]" style={{ width: `${Math.max(s.people ? 1.5 : 0, s.ofSignups ?? 0)}%` }} />
                  </div>
                </li>
              ))}
            </ol>
            {parallel.length > 0 && (
              <div className="border-t pt-4">
                <p className="text-muted-foreground mb-2 text-sm">Em paralelo (não condicionam as etapas acima):</p>
                <ul className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
                  {parallel.map((s) => (
                    <li key={s.key} className="flex justify-between gap-3 tabular-nums">
                      <span>{s.label}</span>
                      <span>
                        <span className="font-semibold">{fmt(s.people)}</span>
                        <span className="text-muted-foreground"> · {s.ofSignups == null ? "—" : fmtPct(s.ofSignups)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </Section>

      <BreakdownSection breakdowns={data.breakdowns} />

      <Section title="Onde estão as perdas" description="As passagens do funil que mais perdem gente, em ordem, com o que costuma resolver.">
        <Card className="shadow-none">
          <CardContent className="pt-6">
            {gaps.length ? (
              <ol className="grid gap-6 lg:grid-cols-3 lg:gap-8">
                {gaps.map((g, i) => (
                  <li key={g.to} className="flex gap-3">
                    <span
                      className="bg-green-100 text-primary flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums"
                      aria-label={`${i + 1}ª maior perda`}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0 space-y-1.5">
                      <p className="font-semibold leading-snug">
                        {g.from} → {g.to}
                      </p>
                      <p className="text-sm tabular-nums">
                        <span className="font-display text-xl font-bold">{fmt(g.lost)}</span>{" "}
                        <span className="text-muted-foreground">pessoas ficaram ({g.lostShare == null ? "—" : fmtPct(g.lostShare)} de quem chegou)</span>
                      </p>
                      {g.fix && <p className="text-sm leading-relaxed">{g.fix}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-muted-foreground text-sm">Nenhuma perda no período.</p>
            )}
          </CardContent>
        </Card>
      </Section>

      <Section title="O que os números dizem" description="Os sinais sobre os bloqueios e o que fazer com quem ainda não falou.">
        {data.signals.length > 0 && (
          <InsightList items={data.signals.map((text) => ({ text, tone: "brand" as const }))} />
        )}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="min-w-0 gap-4 shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Quem nunca falou: onde parou</CardTitle>
              <CardDescription>A última etapa de cada um e o que fazer (a ação de cada pessoa está no CSV).</CardDescription>
            </CardHeader>
            <CardContent>
              {data.stuckAt.length ? (
                <ul className="divide-y">
                  {data.stuckAt.map((s) => (
                    <li key={s.stage} className="flex gap-4 py-3 text-sm">
                      <span className="font-display w-10 shrink-0 text-right text-lg font-bold tabular-nums">{fmt(s.people)}</span>
                      <span className="min-w-0">
                        <span className="block font-medium">Parou depois de: {s.stage.toLowerCase()}</span>
                        <span className="text-muted-foreground block">{s.action}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm">Todo mundo da janela já falou numa sala.</p>
              )}
            </CardContent>
          </Card>
          <Card className="min-w-0 gap-4 shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Onde param no onboarding</CardTitle>
              <CardDescription>Quantas pessoas pararam em cada pergunta de boas-vindas.</CardDescription>
            </CardHeader>
            <CardContent>
              {data.onboardingDropoff.length > 0 ? (
                <ul className="divide-y text-sm tabular-nums">
                  {data.onboardingDropoff.map((d) => (
                    <li key={d.step} className="flex justify-between gap-3 py-2">
                      <span>{d.step}</span>
                      <span className="font-semibold">{fmt(d.people)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm">Ninguém da janela parou no meio do onboarding.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </Section>

      {data.failures.length > 0 && (
        <Section title="Análises que falharam" description="Por tipo e código de erro, só das pessoas da janela.">
          <Card className="shadow-none">
            <CardContent className="overflow-x-auto pt-6">
              <table className="w-full text-sm tabular-nums">
                <thead>
                  <tr className="text-muted-foreground text-left">
                    <th className="py-1 font-medium">Tipo</th>
                    <th className="py-1 font-medium">Código</th>
                    <th className="py-1 text-right font-medium">Pessoas</th>
                    <th className="py-1 text-right font-medium">Análises</th>
                  </tr>
                </thead>
                <tbody>
                  {data.failures.map((f) => (
                    <tr key={`${f.kind}-${f.code}`} className="border-t">
                      <td className="py-1.5">{f.kind}</td>
                      <td className="py-1.5">{f.code}</td>
                      <td className="py-1.5 text-right">{fmt(f.users)}</td>
                      <td className="py-1.5 text-right">{fmt(f.jobs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </Section>
      )}

      <p className="text-muted-foreground text-xs">
        Gerado em {new Date(data.generatedAt).toLocaleString("pt-BR")}. &ldquo;Falou numa sala&rdquo; é a ativação real: entrou numa sala e gravou ao menos um trecho.
      </p>
    </>
  );
}

/** Um recorte por vez (seletor), com a melhor e a pior ativação marcadas. */
function BreakdownSection({ breakdowns }: { breakdowns: ActivationReport["breakdowns"] }) {
  const [key, setKey] = useState("origem");
  const rows = breakdowns[key] ?? [];
  const rated = rows.filter((r) => r.signups >= 3 && r.activation != null);
  const best = rated.length > 1 ? rated.reduce((a, b) => ((b.activation ?? 0) > (a.activation ?? 0) ? b : a)) : null;
  const worst = rated.length > 1 ? rated.reduce((a, b) => ((b.activation ?? 0) < (a.activation ?? 0) ? b : a)) : null;
  const label = BREAKDOWNS.find((b) => b.key === key)?.label ?? key;
  return (
    <Section
      title="Recortes"
      description="Quem converte mais, por grupo. Grupos com menos de 3 cadastros não entram no melhor/pior."
      aside={
        <Select value={key} onValueChange={setKey}>
          <SelectTrigger className="w-64" aria-label="Recorte">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BREAKDOWNS.map((b) => (
              <SelectItem key={b.key} value={b.key}>
                {b.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    >
      <Card className="shadow-none">
        <CardContent className="space-y-3 pt-6">
          {best && worst && best.group !== worst.group && (
            <p className="text-sm">
              Por {label.toLowerCase()}: <strong>{best.group}</strong> converte mais ({fmtPct(best.activation!)} falaram numa sala) e{" "}
              <strong>{worst.group}</strong> menos ({fmtPct(worst.activation!)}).
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm tabular-nums">
              <thead>
                <tr className="text-muted-foreground text-left">
                  <th className="py-1.5 font-medium">{label}</th>
                  <th className="py-1.5 text-right font-medium">Cadastros</th>
                  <th className="py-1.5 text-right font-medium">Onboarding</th>
                  <th className="py-1.5 text-right font-medium">Entrou na sala</th>
                  <th className="py-1.5 text-right font-medium">Falou</th>
                  <th className="py-1.5 text-right font-medium">2+ dias</th>
                  <th className="py-1.5 text-right font-medium">Ativação</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.group} className="border-t">
                    <td className="max-w-56 truncate py-2" title={r.group}>
                      {r.group}
                    </td>
                    <td className="py-2 text-right">{fmt(r.signups)}</td>
                    <td className="py-2 text-right">{fmt(r.onboarded)}</td>
                    <td className="py-2 text-right">{fmt(r.enteredRoom)}</td>
                    <td className="py-2 text-right">{fmt(r.spoke)}</td>
                    <td className="py-2 text-right">{fmt(r.returned)}</td>
                    <td className="py-2 text-right font-semibold">{r.activation == null ? "—" : fmtPct(r.activation)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </Section>
  );
}

const rateText = (r: ActivationRate) => (r.eligible ? `${fmt(r.people)}/${fmt(r.eligible)}` : "—");
const minutes = (m: number | null) => (m == null ? "—" : `${(Math.round(m * 10) / 10).toLocaleString("pt-BR")} min`);

/**
 * Métrica-norte "3 em 7", 2º dia e 1ª fala, e as coortes semanais (27/10/2026,
 * plano de medição do estudo de ativação). Cada taxa conta só quem já pode ser
 * medido: a semana corrente não aparece como queda.
 */
function NorthStarSection({ data }: { data: ActivationReport }) {
  const ns = data.northStar;
  const cohorts = data.cohorts ?? [];
  if (!ns) return null;
  const items = [
    {
      label: "3 em 7 (métrica-norte)",
      value: ns.threeInSeven.share == null ? "—" : fmtPct(ns.threeInSeven.share),
      note: `${rateText(ns.threeInSeven)} falaram em 3 sessões nos 7 dias do cadastro`,
    },
    {
      label: "2º dia",
      value: ns.secondDay.share == null ? "—" : fmtPct(ns.secondDay.share),
      note: `${rateText(ns.secondDay)} falaram em 2+ dias (contas com ≥ 24 h)`,
    },
    {
      label: "Até a 1ª fala",
      value: minutes(ns.firstSpeech.p50),
      note: `mediana depois do onboarding · p90 ${minutes(ns.firstSpeech.p90)}`,
    },
  ];
  return (
    <Section title="Métrica-norte e coortes" description="Só conta quem já teve tempo: a semana corrente não aparece como queda. Dias de Brasília.">
      <Card className="shadow-none">
        <CardContent className="space-y-6 pt-6">
          <dl className="grid gap-4 sm:grid-cols-3">
            {items.map((i) => (
              <div key={i.label} className="space-y-1">
                <dt className="text-muted-foreground text-sm">{i.label}</dt>
                <dd className="font-display text-2xl font-bold tabular-nums">{i.value}</dd>
                <dd className="text-muted-foreground text-sm">{i.note}</dd>
              </div>
            ))}
          </dl>
          {cohorts.length > 0 && (
            <div className="overflow-x-auto border-t pt-4">
              <table className="w-full min-w-[720px] text-sm tabular-nums">
                <thead>
                  <tr className="text-muted-foreground text-left">
                    <th className="py-1.5 font-medium">Semana</th>
                    <th className="py-1.5 text-right font-medium">Cadastros</th>
                    <th className="py-1.5 text-right font-medium">≥ 24 h</th>
                    <th className="py-1.5 text-right font-medium">Falou</th>
                    <th className="py-1.5 text-right font-medium">Voltou D1</th>
                    <th className="py-1.5 text-right font-medium">Falou D1</th>
                    <th className="py-1.5 text-right font-medium">Voltou D7</th>
                    <th className="py-1.5 text-right font-medium">Falou D7</th>
                    <th className="py-1.5 text-right font-medium">3 em 7</th>
                    <th className="py-1.5 text-right font-medium" title="Pessoas por dias com fala na 1ª semana">
                      L7: 0 · 1 · 2 · 3 · 4+
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {cohorts.map((c) => (
                    <tr key={c.week} className="border-t">
                      <td className="py-2">{c.week.split("-").reverse().slice(0, 2).join("/")}</td>
                      <td className="py-2 text-right">{fmt(c.signups)}</td>
                      <td className="py-2 text-right">{fmt(c.mature)}</td>
                      <td className="py-2 text-right">{fmt(c.spoke)}</td>
                      <td className="py-2 text-right">{rateText(c.voltouD1)}</td>
                      <td className="py-2 text-right">{rateText(c.falouD1)}</td>
                      <td className="py-2 text-right">{rateText(c.voltouD7)}</td>
                      <td className="py-2 text-right">{rateText(c.falouD7)}</td>
                      <td className="py-2 text-right font-semibold">{rateText(c.threeInSeven)}</td>
                      <td className="py-2 text-right">{c.l7.join(" · ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-muted-foreground mt-2 text-xs">
                Semana começa na segunda. &ldquo;1/3&rdquo; = 1 de 3 que já podem ser medidos. D1 é o dia seguinte ao cadastro; D7, o 7º dia.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </Section>
  );
}
