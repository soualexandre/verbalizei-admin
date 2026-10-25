"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Download, FileText, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, api } from "@/lib/api";
import type { ActivationReport } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
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
  { key: "origem", label: "Origem do cadastro" },
  { key: "canal", label: "Canal (web ou app)" },
  { key: "aparelho", label: "Aparelho" },
  { key: "navegador", label: "Navegador" },
  { key: "cadastro", label: "Forma de cadastro" },
  { key: "foco", label: "Foco (conversa que está vindo)" },
  { key: "momento", label: "Momento da carreira" },
  { key: "area", label: "Área" },
  { key: "onboarding", label: "Versão do onboarding" },
];

/**
 * Ativação (25/10/2026, pedido do usuário): o relatório que rodava no servidor
 * (`npm run report:activation`), aqui no painel e para baixar — o CSV traz uma
 * linha por pessoa com a etapa em que parou e a próxima ação sugerida. Tudo
 * conta só pessoas reais (sem mocks e admins) cadastradas na janela escolhida.
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
      <PageHeader
        title="Ativação"
        description={`Do cadastro ao hábito: quem se cadastrou nos últimos ${days} dias, onde parou e o que fazer.`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={String(days)} onValueChange={(v) => setDays(Number(v) as typeof days)}>
            <TabsList>
              {PERIODS.map((p) => (
                <TabsTrigger key={p} value={String(p)} className="tabular-nums">
                  {p} dias
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Button variant="outline" size="sm" onClick={() => download("csv")} disabled={downloading !== null}>
            <Download className="size-4" />
            {downloading === "csv" ? "Baixando…" : "Baixar CSV (por pessoa)"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => download("md")} disabled={downloading !== null}>
            <FileText className="size-4" />
            {downloading === "md" ? "Baixando…" : "Baixar relatório"}
          </Button>
        </div>
      </PageHeader>

      {isError && !data ? (
        <Card className="shadow-none">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <AlertCircle className="text-muted-foreground size-6" />
            <p className="text-sm">Não foi possível carregar o relatório.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="size-4" />
              Tentar de novo
            </Button>
          </CardContent>
        </Card>
      ) : isLoading || !data ? (
        <div className="space-y-6" aria-busy="true" aria-label="Carregando o relatório">
          <Skeleton className="h-28 rounded-card" />
          <Skeleton className="h-64 rounded-card" />
          <Skeleton className="h-80 rounded-card" />
        </div>
      ) : (
        <div className={isFetching ? "space-y-10 opacity-70 transition-opacity" : "space-y-10 transition-opacity"}>
          <Report data={data} />
        </div>
      )}
    </>
  );
}

function Report({ data }: { data: ActivationReport }) {
  const t = data.totals;
  const share = (n: number) => (t.signups ? fmtPct(Math.round((n / t.signups) * 100)) : "—");
  const totals = [
    { label: "Se cadastraram", value: t.signups, note: "na janela" },
    { label: "Fizeram alguma coisa", value: t.didSomething, note: `${share(t.didSomething)} · qualquer atividade` },
    { label: "Ficaram no onboarding", value: t.stuckOnboarding, note: `${share(t.stuckOnboarding)} · não terminaram as perguntas` },
    { label: "Criaram cenário", value: t.createdScenario, note: `${share(t.createdScenario)} · cenário próprio` },
    { label: "Falaram numa sala", value: t.spoke, note: `${share(t.spoke)} · a ativação de verdade` },
    { label: "Treinaram em 2+ dias", value: t.returned, note: `${share(t.returned)} · começando o hábito` },
  ];
  const main = data.funnel.filter((s) => !s.parallel);
  const parallel = data.funnel.filter((s) => s.parallel);

  return (
    <>
      <section className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {totals.map((c) => (
          <Card key={c.label} className="gap-1 px-4 py-4 shadow-none">
            <p className="text-sm font-medium">{c.label}</p>
            <p className="text-2xl font-semibold tracking-tight tabular-nums">{fmt(c.value)}</p>
            <p className="text-muted-foreground text-xs tabular-nums">{c.note}</p>
          </Card>
        ))}
      </section>

      <section className="space-y-4">
        <SectionTitle title="Onde estão as perdas" description="As passagens do funil que mais perdem gente, em ordem, com o que costuma resolver." />
        {data.gaps.length ? (
          <ol className="grid gap-3 lg:grid-cols-3">
            {data.gaps.slice(0, 3).map((g, i) => (
              <Card key={g.to} className="gap-2 px-5 py-5 shadow-none">
                <p className="text-muted-foreground text-xs font-semibold tabular-nums">{i + 1}ª maior perda</p>
                <p className="font-semibold leading-snug">
                  {g.from} → {g.to}
                </p>
                <p className="text-2xl font-semibold tabular-nums">
                  {fmt(g.lost)} <span className="text-muted-foreground text-sm font-normal">pessoas ({g.lostShare == null ? "—" : fmtPct(g.lostShare)} de quem chegou)</span>
                </p>
                {g.fix && <p className="text-sm leading-relaxed">{g.fix}</p>}
              </Card>
            ))}
          </ol>
        ) : (
          <p className="text-muted-foreground text-sm">Nenhuma perda no período.</p>
        )}
      </section>

      <section className="space-y-4">
        <SectionTitle title="Funil" description="Cada barra é a % dos cadastros que chegou à etapa; ao lado, quanto passou da etapa anterior." />
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
            <div className="border-t pt-4">
              <p className="text-muted-foreground mb-2 text-xs font-medium">Em paralelo (não condicionam as etapas acima)</p>
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
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
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
                    <span className="w-10 shrink-0 text-right text-lg font-semibold tabular-nums">{fmt(s.people)}</span>
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
            <CardTitle className="text-base">Sinais</CardTitle>
            <CardDescription>O que os números dizem sobre os bloqueios.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="list-disc space-y-1.5 pl-5 text-sm leading-snug tabular-nums">
              {data.signals.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
            {data.onboardingDropoff.length > 0 && (
              <div className="border-t pt-4">
                <p className="mb-2 text-sm font-medium">Onde param no onboarding</p>
                <ul className="space-y-1 text-sm tabular-nums">
                  {data.onboardingDropoff.map((d) => (
                    <li key={d.step} className="flex justify-between gap-3">
                      <span>{d.step}</span>
                      <span className="font-semibold">{fmt(d.people)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <BreakdownSection breakdowns={data.breakdowns} />

      {data.failures.length > 0 && (
        <section className="space-y-4">
          <SectionTitle title="Análises que falharam" description="Por tipo e código de erro, só das pessoas da janela." />
          <Card className="shadow-none">
            <CardContent className="pt-6">
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
        </section>
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
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <SectionTitle title="Recortes" description="Quem converte mais, por grupo. Grupos com menos de 3 cadastros não entram no melhor/pior." />
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
      </div>
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
    </section>
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
