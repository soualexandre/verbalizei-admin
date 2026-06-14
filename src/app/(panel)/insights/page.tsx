"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Lightbulb,
  Sparkles,
  Users,
  CalendarDays,
  BookOpen,
  Target,
  Mic,
} from "lucide-react";
import { api } from "@/lib/api";
import type { TodayInsight } from "@/lib/types";
import { formatNumber } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function InsightsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["insights-today"],
    queryFn: () => api.get<TodayInsight>("/admin/insights/today"),
  });

  const metrics = data?.metrics;

  return (
    <>
      <PageHeader
        title="Insights IA"
        description="Diagnóstico diário de retenção gerado por IA a partir das métricas dos últimos 7 dias."
      />

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32" />
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </div>
      ) : (
        <>
          {metrics && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard
                label="DAU"
                value={formatNumber(metrics.dailyActiveUsers)}
                hint="Usuários ativos hoje"
                icon={Users}
              />
              <StatCard
                label="WAU"
                value={formatNumber(metrics.weeklyActiveUsers)}
                hint="Usuários ativos (7d)"
                icon={CalendarDays}
              />
              <StatCard
                label="Novos usuários (7d)"
                value={formatNumber(metrics.newUsersLast7d)}
                icon={Users}
              />
              <StatCard
                label="Lições concluídas (7d)"
                value={formatNumber(metrics.lessonsCompletedLast7d)}
                icon={BookOpen}
              />
              <StatCard
                label="Acurácia desafios (7d)"
                value={`${metrics.challengeAccuracyLast7d ?? 0}%`}
                icon={Target}
              />
              <StatCard
                label="Nota média de voz (7d)"
                value={metrics.avgVoiceScoreLast7d ?? 0}
                icon={Mic}
              />
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="text-primary size-4" />
                Diagnóstico
              </CardTitle>
              <CardDescription>
                Resumo executivo automático.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">
                {data?.summary || "Sem diagnóstico disponível no momento."}
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="size-4 text-amber-500" />
                  Sinais de risco
                </CardTitle>
              </CardHeader>
              <CardContent>
                <InsightList items={data?.riskSignals} empty="Nenhum sinal de risco identificado." />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="size-4 text-emerald-500" />
                  Estratégias de retenção
                </CardTitle>
              </CardHeader>
              <CardContent>
                <InsightList
                  items={data?.retentionStrategies}
                  empty="Nenhuma estratégia sugerida."
                />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </>
  );
}

function InsightList({
  items,
  empty,
}: {
  items?: string[];
  empty: string;
}) {
  if (!items?.length) {
    return <p className="text-muted-foreground text-sm">{empty}</p>;
  }
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-sm">
          <span className="text-muted-foreground">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
