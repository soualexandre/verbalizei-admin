"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import type { ProfileDimensionKey, ProfilesAnalysis } from "@/lib/types";
import {
  METRICS,
  buildConclusions,
  buildVerdict,
  fmtDecimal,
  fmtPct,
  periodPhrase,
} from "@/lib/profile-insights";
import { formatDate, formatDateTime, formatNumber } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
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

const PERIODS = [
  { value: "7", label: "7 dias" },
  { value: "30", label: "30 dias" },
  { value: "90", label: "90 dias" },
  { value: "all", label: "Todo o período" },
] as const;

export default function ProfilesPage() {
  const [days, setDays] = useState<string>("30");
  const [includeMocks, setIncludeMocks] = useState(false);
  const [includeInferred, setIncludeInferred] = useState(true);
  const [dimensionKey, setDimensionKey] = useState<ProfileDimensionKey>("persona");
  const [selected, setSelected] = useState<string[]>([]);
  const [highlighted, setHighlighted] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["profiles", days, includeMocks, includeInferred],
    queryFn: () =>
      api.get<ProfilesAnalysis>(
        `/admin/profiles?days=${days}&includeMocks=${includeMocks}&includeInferred=${includeInferred}`,
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
  }

  function toggleSelect(key: string) {
    setSelected((prev) =>
      prev.includes(key)
        ? prev.filter((k) => k !== key)
        : [...prev, key].slice(-2),
    );
  }

  return (
    <>
      <PageHeader
        title="Perfis"
        description="Quem mais acessa o Verbalizei e qual perfil vale mais atrair."
      >
        <div className="flex flex-wrap items-center gap-4">
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
            />
            <Label htmlFor="profiles-inferred" className="text-muted-foreground">
              Incluir perfis inferidos
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="profiles-mocks"
              checked={includeMocks}
              onCheckedChange={setIncludeMocks}
            />
            <Label htmlFor="profiles-mocks" className="text-muted-foreground">
              Incluir mocks
            </Label>
          </div>
        </div>
      </PageHeader>

      {isError ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-3">
            <p className="font-medium">Não foi possível carregar a análise de perfis.</p>
            <p className="text-muted-foreground text-sm">
              {error instanceof Error ? error.message : "Erro desconhecido."} Confira se a API
              está no ar e tente de novo.
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="size-4" />
              Tentar de novo
            </Button>
          </CardContent>
        </Card>
      ) : isLoading || !data || !dimension ? (
        <LoadingState />
      ) : (
        <div className={isFetching ? "opacity-70 transition-opacity" : "transition-opacity"}>
          <div className="space-y-6">
            <section aria-labelledby="verdict-title" className="space-y-4">
              <Card className="gap-4">
                <CardContent className="space-y-3">
                  {verdict ? (
                    <>
                      <h2
                        id="verdict-title"
                        className="max-w-4xl text-2xl leading-tight font-semibold tracking-tight text-balance sm:text-[1.75rem]"
                      >
                        {verdict.headline}
                      </h2>
                      <p className="max-w-3xl text-base leading-relaxed text-pretty">
                        {verdict.support}
                      </p>
                    </>
                  ) : (
                    <>
                      <h2 id="verdict-title" className="text-xl font-semibold tracking-tight">
                        {data.base.users === 0
                          ? "Ainda não há usuários para analisar"
                          : `Sem atividade suficiente ${periodPhrase(data.period)}`}
                      </h2>
                      <p className="text-muted-foreground max-w-3xl text-sm leading-relaxed">
                        O veredito aparece quando pelo menos um perfil tiver 20 usuários ou mais
                        com atividade no período. Tente um período maior.
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>

              <dl className="text-muted-foreground flex flex-wrap gap-x-6 gap-y-1 px-1 text-sm">
                <BaseFact label="usuários analisados" value={formatNumber(data.base.users)} />
                <BaseFact
                  label={data.period.allTime ? "já usaram o app" : `ativos em ${data.period.days} dias`}
                  value={fmtPct(data.base.activationRate)}
                />
                <BaseFact
                  label="dias de uso por ativo"
                  value={fmtDecimal(data.base.daysPerActiveUser)}
                />
                <BaseFact
                  label="completaram o onboarding"
                  value={fmtPct(data.onboardedRate)}
                />
                {data.includeInferred && data.inferredUsers > 0 && (
                  <div className="flex gap-1">
                    <dt className="sr-only">perfis inferidos</dt>
                    <dd>
                      <span className="text-foreground font-semibold tabular-nums">
                        {formatNumber(data.inferredUsers)}
                      </span>{" "}
                      com perfil inferido (
                      <Link href="/enrichment" className="underline underline-offset-2">
                        ver
                      </Link>
                      )
                    </dd>
                  </div>
                )}
                <div className="flex gap-1">
                  <dt className="sr-only">Atualizado em</dt>
                  <dd>
                    {data.period.allTime && `Desde ${formatDate(data.period.from)} · `}
                    Atualizado {formatDateTime(data.generatedAt)}
                  </dd>
                </div>
              </dl>
            </section>

            <section aria-labelledby="dimension-title" className="space-y-4">
              <div className="space-y-2">
                <h2 id="dimension-title" className="sr-only">
                  Comparar perfis
                </h2>
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
                <p className="text-muted-foreground text-sm">{dimension.description}</p>
              </div>

              <div className="grid items-start gap-6 min-[1400px]:grid-cols-[minmax(0,1fr)_19rem]">
                <div className="min-w-0 space-y-6">
                  <Card className="gap-4">
                    <CardHeader>
                      <CardTitle>Mapa de calor por {dimension.label.toLowerCase()}</CardTitle>
                      <CardDescription>
                        Cada célula compara o perfil com a média da base: azul está acima, vermelho
                        abaixo. Toque ou passe o mouse para ver o detalhe e marque dois perfis para
                        comparar.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 px-3 sm:px-6">
                      <ProfileHeatmap
                        dimension={dimension}
                        analysis={data}
                        selected={selected}
                        highlighted={highlighted}
                        onToggleSelect={toggleSelect}
                      />
                      <HeatLegend />
                    </CardContent>
                  </Card>

                  <Card className="gap-4">
                    <CardHeader>
                      <CardTitle>Comparação lado a lado</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ComparePanel
                        groups={selectedGroups}
                        analysis={data}
                        onClear={() => setSelected([])}
                      />
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
                          período. Um dia ativo é um dia com lição, desafio, gravação, treino,
                          prática ou jogo.
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
                          Todos os usuários não administradores
                          {data.includeMocks ? ", incluindo mocks" : ", sem mocks"}. Datas no
                          fuso de Brasília.
                          {data.includeInferred
                            ? " Quem não respondeu o onboarding, respondeu “Outro” ou está sem segmento entra pelo perfil inferido (confiança de 50% ou mais); o que o usuário declarou sempre vence."
                            : " Só respostas declaradas pelo usuário."}
                        </dd>
                      </div>
                    </dl>
                  </details>
                </div>

                <Card className="order-first gap-4 min-[1400px]:sticky min-[1400px]:top-6 min-[1400px]:order-last">
                  <CardHeader>
                    <CardTitle>Conclusões</CardTitle>
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
            </section>
          </div>
        </div>
      )}
    </>
  );
}

function BaseFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1">
      <dt className="sr-only">{label}</dt>
      <dd>
        <span className="text-foreground font-semibold tabular-nums">{value}</span> {label}
      </dd>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Carregando análise de perfis">
      <Skeleton className="h-36" />
      <Skeleton className="h-9 w-full max-w-2xl" />
      <div className="grid gap-6 min-[1400px]:grid-cols-[minmax(0,1fr)_19rem]">
        <Skeleton className="h-[28rem]" />
        <Skeleton className="h-[28rem]" />
      </div>
    </div>
  );
}
