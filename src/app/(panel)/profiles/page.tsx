"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ProfileDimensionKey, ProfilesAnalysis } from "@/lib/types";
import {
  METRICS,
  buildConclusions,
  buildVerdict,
  fmtDecimal,
  fmtPct,
} from "@/lib/profile-insights";
import { formatDate, formatDateTime, formatNumber } from "@/lib/utils";
import { ErrorState } from "@/components/error-state";
import { HeroStat, HeroStats, PageHero, Section, HeroStatsSkeleton } from "@/components/page-hero";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HeatLegend, ProfileHeatmap } from "./profile-heatmap";
import { ComparePanel, ConclusionsList } from "./insight-panels";
import { GroupDetailPanel } from "./group-detail-panel";

const PERIODS = [
  { value: "7", label: "7 dias" },
  { value: "30", label: "30 dias" },
  { value: "90", label: "90 dias" },
  { value: "all", label: "Todo o período" },
] as const;

export default function ProfilesPage() {
  const [days, setDays] = useState<string>("30");
  const [includeInferred, setIncludeInferred] = useState(true);
  const [dimensionKey, setDimensionKey] = useState<ProfileDimensionKey>("persona");
  const [selected, setSelected] = useState<string[]>([]);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const analysisQuery = `days=${days}&includeInferred=${includeInferred}`;

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["profiles", days, includeInferred],
    queryFn: () =>
      api.get<ProfilesAnalysis>(
        `/admin/profiles?${analysisQuery}`,
      ),
    placeholderData: (prev) => prev,
  });

  const dimension = data?.dimensions.find((d) => d.key === dimensionKey);
  const verdict = useMemo(() => (data ? buildVerdict(data) : null), [data]);
  const conclusions = useMemo(
    () => (data && dimension ? buildConclusions(dimension, data) : []),
    [data, dimension],
  );
  const selectedGroups = (dimension?.groups ?? []).filter((g) =>
    selected.includes(g.key),
  );

  function changeDimension(key: string) {
    setDimensionKey(key as ProfileDimensionKey);
    setSelected([]);
    setHighlighted(null);
    setOpenGroup(null);
  }

  function toggleSelect(key: string) {
    setSelected((prev) =>
      prev.includes(key)
        ? prev.filter((k) => k !== key)
        : [...prev, key].slice(-2),
    );
  }

  const periodText = data
    ? data.period.allTime
      ? `Desde ${formatDate(data.period.from)}`
      : `Últimos ${data.period.days} dias`
    : null;

  return (
    <>
      <PageHero
        title="Perfis"
        description={
          data
            ? `Quem mais acessa o Verbalizei e qual perfil vale mais atrair. ${periodText} · atualizado ${formatDateTime(data.generatedAt)}.`
            : "Quem mais acessa o Verbalizei e qual perfil vale mais atrair."
        }
        actions={
          <>
            <Tabs value={days} onValueChange={setDays}>
              <TabsList aria-label="Período">
                {PERIODS.map((p) => (
                  <TabsTrigger key={p.value} value={p.value}>
                    {p.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-2">
              <Switch
                id="profiles-inferred"
                checked={includeInferred}
                onCheckedChange={setIncludeInferred}
                className="data-[state=checked]:bg-primary"
              />
              <Label htmlFor="profiles-inferred">
                Incluir perfis inferidos
              </Label>
            </div>
          </>
        }
      >
        {data && !isError ? (
          <div className={isFetching ? "opacity-70 transition-opacity" : "transition-opacity"}>
            <ProfileStats data={data} />
          </div>
        ) : isLoading ? (
          <HeroStatsSkeleton count={6} />
        ) : null}
      </PageHero>

      {isError ? (
        <ErrorState title="Não foi possível carregar a análise de perfis." error={error} onRetry={() => refetch()} />
      ) : isLoading || !data || !dimension ? (
        <LoadingState />
      ) : (
        <div className={isFetching ? "space-y-12 opacity-70 transition-opacity" : "space-y-12 transition-opacity"}>
          <Section title="Comparar perfis" description={dimension.description}>
            <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <Tabs value={dimensionKey} onValueChange={changeDimension}>
                <TabsList aria-label="Comparar perfis por">
                  {data.dimensions.map((d) => (
                    <TabsTrigger key={d.key} value={d.key}>
                      {d.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            <div className="grid items-start gap-6 min-[1400px]:grid-cols-[minmax(0,1fr)_19rem]">
              <div className="min-w-0 space-y-6">
                <Card className="gap-4 shadow-none">
                  <CardHeader>
                    <CardTitle className="text-base">Mapa de calor por {dimension.label.toLowerCase()}</CardTitle>
                    <CardDescription>
                      Cada célula compara o perfil com a média da base: azul está acima, lima
                      abaixo (veja a legenda). Toque ou passe o mouse para ver o detalhe, marque dois perfis para
                      comparar e abra &ldquo;Ver respostas&rdquo; para ler o que cada grupo escreveu.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 px-3 sm:px-6">
                    <ProfileHeatmap
                      dimension={dimension}
                      analysis={data}
                      selected={selected}
                      highlighted={highlighted}
                      onToggleSelect={toggleSelect}
                      openGroup={openGroup}
                      onOpenGroup={(key) => setOpenGroup((k) => (k === key ? null : key))}
                    />
                    <HeatLegend />
                  </CardContent>
                </Card>

                {openGroup && (
                  <GroupDetailPanel
                    dimension={dimension.key}
                    groupKey={openGroup}
                    query={analysisQuery}
                    onClose={() => setOpenGroup(null)}
                  />
                )}

                <Card className="gap-4 shadow-none">
                  <CardHeader>
                    <CardTitle className="text-base">Comparação lado a lado</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ComparePanel
                      groups={selectedGroups}
                      analysis={data}
                      onClear={() => setSelected([])}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* As conclusões da dimensão ficam ao lado do mapa na tela larga (passar o mouse
                  numa conclusão destaca o grupo no mapa); nas menores, logo depois dele. */}
              <Card className="gap-4 shadow-none min-[1400px]:sticky min-[1400px]:top-6">
                <CardHeader>
                  <CardTitle className="text-base">Conclusões</CardTitle>
                  <CardDescription>
                    O que os dados de {dimension.label.toLowerCase()} dizem para aquisição.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ConclusionsList
                    conclusions={conclusions}
                    highlighted={highlighted}
                    onHighlight={setHighlighted}
                  />
                </CardContent>
              </Card>
            </div>
          </Section>

          <Section title="O que os números dizem" description="A leitura de toda a base: qual perfil vale mais atrair agora.">
            <Card className="gap-4 shadow-none">
              <CardContent className="space-y-3">
                {verdict ? (
                  <>
                    <p className="font-display max-w-4xl text-2xl leading-tight font-bold tracking-tight text-balance sm:text-[1.75rem]">
                      {verdict.headline}
                    </p>
                    <p className="max-w-3xl text-base leading-relaxed text-pretty">
                      {verdict.support}
                    </p>
                    {verdict.baseNote && (
                      <p className="text-muted-foreground max-w-3xl text-sm leading-relaxed text-pretty">
                        {verdict.baseNote}
                      </p>
                    )}
                    {verdict.caveat && (
                      <p className="text-muted-foreground max-w-3xl text-sm leading-relaxed text-pretty">
                        {verdict.caveat}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="font-display text-xl font-bold tracking-tight">
                    Ainda não há usuários para analisar
                  </p>
                )}
                {data.includeInferred && data.inferredUsers > 0 && (
                  <p className="text-muted-foreground text-sm">
                    {formatNumber(data.inferredUsers)} usuários entraram pelo perfil inferido (
                    <Link href="/enrichment" className="underline underline-offset-2">
                      ver
                    </Link>
                    ).
                  </p>
                )}
              </CardContent>
            </Card>

            <details className="group text-sm">
              <summary className="text-muted-foreground hover:text-foreground w-fit cursor-pointer select-none">
                Como cada métrica é calculada
              </summary>
              <dl className="mt-3 grid gap-x-8 gap-y-3 sm:grid-cols-2">
                <div>
                  <dt className="font-medium">Base → acessos</dt>
                  <dd className="text-muted-foreground">
                    Fatia da base de usuários contra a fatia de todos os dias ativos do
                    período. Um dia ativo é um dia com alguma interação: cenário concluído ou
                    com gravação, gravação avulsa (inclui o 1º reconhecimento), micro-treino
                    ou jogo — a mesma régua da Visão geral.
                  </dd>
                </div>
                {METRICS.map((m) => (
                  <div key={m.key}>
                    <dt className="font-medium">{m.label}</dt>
                    <dd className="text-muted-foreground">
                      {m.help(data.period)}
                    </dd>
                  </div>
                ))}
                <div>
                  <dt className="font-medium">Quem entra na análise</dt>
                  <dd className="text-muted-foreground">
                    Todos os usuários, menos administradores e usuários de teste. Datas
                    no fuso de Brasília.
                    {data.includeInferred
                      ? " Quem não respondeu o onboarding, respondeu “Outro” ou está sem segmento entra pelo perfil inferido (confiança de 50% ou mais); o que o usuário declarou sempre vence. O momento de carreira não é inferido."
                      : " Só respostas declaradas pelo usuário."}
                  </dd>
                </div>
              </dl>
            </details>
          </Section>
        </div>
      )}
    </>
  );
}

/** Os totais da base analisada, na faixa azul (padrão do admin desde 25/10/2026). */
function ProfileStats({ data }: { data: ProfilesAnalysis }) {
  const { base, period } = data;
  const metric = (key: string) => METRICS.find((m) => m.key === key)?.help(period);
  return (
    <HeroStats cols={6}>
      <HeroStat
        label="Usuários analisados"
        value={formatNumber(base.users)}
        note="sem testes e admins"
        help="Todos os usuários, menos administradores e usuários de teste."
      />
      <HeroStat
        label={period.allTime ? "Já usaram o app" : "Ativos no período"}
        value={formatNumber(base.activeUsers)}
        note={`${fmtPct(base.activationRate)} da base`}
        help={metric("activationRate")}
      />
      <HeroStat
        label="Dias de uso por ativo"
        value={fmtDecimal(base.daysPerActiveUser)}
        note={`${formatNumber(base.activeDays)} dias ativos no total`}
        help={metric("daysPerActiveUser")}
      />
      <HeroStat
        label="Recorrentes"
        value={formatNumber(base.recurringUsers)}
        note={`${fmtPct(base.recurringRate)} da base`}
        help={metric("recurringRate")}
      />
      <HeroStat
        label="Premium"
        value={formatNumber(base.premiumUsers)}
        note={`${fmtPct(base.premiumRate)} da base`}
        help={metric("premiumRate")}
      />
      <HeroStat
        label="Fizeram o onboarding"
        value={fmtPct(data.onboardedRate)}
        note={
          data.includeInferred && data.inferredUsers > 0
            ? `${formatNumber(data.inferredUsers)} com perfil inferido`
            : "da base"
        }
        help="Fatia da base que respondeu as perguntas de boas-vindas até o fim."
      />
    </HeroStats>
  );
}


function LoadingState() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Carregando análise de perfis">
      <Skeleton className="h-9 w-full max-w-2xl" />
      <div className="grid gap-6 min-[1400px]:grid-cols-[minmax(0,1fr)_19rem]">
        <Skeleton className="h-[28rem]" />
        <Skeleton className="h-[28rem]" />
      </div>
    </div>
  );
}
