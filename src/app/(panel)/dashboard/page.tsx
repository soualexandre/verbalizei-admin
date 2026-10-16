"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import type { DashboardOverview } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Overview } from "@/components/dashboard/overview";

const PERIODS = [7, 30, 90] as const;

/**
 * Visão geral: a saúde do produto no período (7, 30 ou 90 dias) contra o
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

  return (
    <>
      <PageHeader
        title="Visão geral"
        description={`Uso nos últimos ${days} dias, comparado aos ${days} dias anteriores.`}
      >
        <Tabs value={String(days)} onValueChange={(v) => setDays(Number(v) as typeof days)}>
          <TabsList>
            {PERIODS.map((p) => (
              <TabsTrigger key={p} value={String(p)} className="tabular-nums">
                {p} dias
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </PageHeader>

      {isError && !data ? (
        <Card className="shadow-none">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <AlertCircle className="text-muted-foreground size-6" />
            <p className="text-sm">Não foi possível carregar a visão geral.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="size-4" />
              Tentar de novo
            </Button>
          </CardContent>
        </Card>
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
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-card" />
        ))}
      </div>
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
