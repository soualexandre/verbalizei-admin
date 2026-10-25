"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { DashboardOverview } from "@/lib/types";
import { ErrorState } from "@/components/error-state";
import { PageHero, HeroStatsSkeleton } from "@/components/page-hero";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Overview, OverviewStats, overviewDescription } from "@/components/dashboard/overview";

const PERIODS = [7, 30, 90] as const;

/**
 * Visão geral (padrão do admin desde 25/10/2026: faixa azul com os
 * totalizadores → gráficos → insights): a saúde do produto no período (7, 30 ou 90 dias) contra o
 * período anterior de mesmo tamanho. "Ativo" = fez ao menos uma interação
 * (cenário, gravação, micro-treino ou jogo) — a mesma régua da coluna
 * Interações dos usuários. Usuários de teste (mock) e admins nunca entram.
 * Financeiro não entra aqui.
 */
export default function DashboardPage() {
  const [days, setDays] = useState<(typeof PERIODS)[number]>(7);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["overview", days],
    queryFn: () =>
      api.get<DashboardOverview>(`/admin/overview?days=${days}`),
    placeholderData: (prev) => prev,
  });

  const tabs = (
    <Tabs value={String(days)} onValueChange={(v) => setDays(Number(v) as typeof days)}>
      <TabsList>
        {PERIODS.map((p) => (
          <TabsTrigger key={p} value={String(p)} className="tabular-nums">
            {p} dias
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );

  return (
    <>
      <PageHero
        title="Visão geral"
        description={data ? overviewDescription(data) : `Uso nos últimos ${days} dias, comparado aos ${days} dias anteriores.`}
        actions={tabs}
      >
        {data ? (
          <div className={isFetching ? "opacity-70 transition-opacity" : "transition-opacity"}>
            <OverviewStats data={data} />
          </div>
        ) : isLoading ? (
          <HeroStatsSkeleton count={4} />
        ) : null}
      </PageHero>

      {isError && !data ? (
        <ErrorState title="Não foi possível carregar a visão geral." onRetry={() => refetch()} />
      ) : isLoading || !data ? (
        <Loading />
      ) : (
        <div className={isFetching ? "opacity-70 transition-opacity" : "transition-opacity"}>
          <Overview data={data} />
        </div>
      )}
    </>
  );
}


function Loading() {
  return (
    <div className="space-y-10" aria-busy="true" aria-label="Carregando visão geral">
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-80 rounded-card" />
        <Skeleton className="h-80 rounded-card" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-80 rounded-card lg:col-span-2" />
        <Skeleton className="h-80 rounded-card" />
      </div>
    </div>
  );
}
