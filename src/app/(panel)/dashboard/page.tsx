"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Crown,
  TrendingUp,
  DollarSign,
  Activity,
  UserPlus,
  CreditCard,
  Repeat,
} from "lucide-react";
import { api } from "@/lib/api";
import type { DashboardData } from "@/lib/types";
import { formatCurrency, formatNumber } from "@/lib/utils";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function DashboardPage() {
  const [includeMocks, setIncludeMocks] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", includeMocks],
    queryFn: () =>
      api.get<DashboardData>(
        `/admin/dashboard?includeMocks=${includeMocks ? "true" : "false"}`,
      ),
  });

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Visão geral de usuários, receita e métricas SaaS."
      >
        <div className="flex items-center gap-2">
          <Switch
            id="mocks"
            checked={includeMocks}
            onCheckedChange={setIncludeMocks}
          />
          <Label htmlFor="mocks" className="text-muted-foreground">
            Incluir mocks
          </Label>
        </div>
      </PageHeader>

      {isLoading || !data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-muted-foreground text-sm font-semibold uppercase tracking-wide">
              Usuários
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Total de usuários"
                value={formatNumber(data.users.total)}
                hint={`${formatNumber(data.users.admin)} administradores`}
                icon={Users}
              />
              <StatCard
                label="Premium"
                value={formatNumber(data.users.premium)}
                hint={`${formatNumber(data.users.free)} no plano gratuito`}
                icon={Crown}
              />
              <StatCard
                label="Conversão"
                value={`${data.users.conversionRate}%`}
                hint="Premium / total"
                icon={TrendingUp}
              />
              <StatCard
                label="Novos (30d)"
                value={formatNumber(data.users.newMonth)}
                hint="Cadastros no mês"
                icon={UserPlus}
              />
              <StatCard
                label="Ativos (7d)"
                value={formatNumber(data.users.activeWeek)}
                hint="Login na última semana"
                icon={Activity}
              />
              <StatCard
                label="Ativos (30d)"
                value={formatNumber(data.users.activeMonth)}
                hint="Login no último mês"
                icon={Activity}
              />
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-muted-foreground text-sm font-semibold uppercase tracking-wide">
              Pagamentos
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Receita total"
                value={formatCurrency(data.payments.totalRevenue)}
                hint="Pagamentos aprovados"
                icon={DollarSign}
              />
              <StatCard
                label="Pagamentos"
                value={formatNumber(data.payments.total)}
                hint={`${formatNumber(data.payments.approved)} aprovados`}
                icon={CreditCard}
              />
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-muted-foreground text-sm font-semibold uppercase tracking-wide">
              Métricas SaaS
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="MRR"
                value={formatCurrency(data.saas.mrr)}
                hint="Receita recorrente mensal"
                icon={Repeat}
              />
              <StatCard
                label="ARR"
                value={formatCurrency(data.saas.arr)}
                hint="Receita recorrente anual"
                icon={Repeat}
              />
              <StatCard
                label="ARPU"
                value={formatCurrency(data.saas.arpu)}
                hint="Receita média por usuário"
              />
              <StatCard
                label="LTV"
                value={formatCurrency(data.saas.ltv)}
                hint="Valor de tempo de vida"
              />
              <StatCard
                label="Churn mensal"
                value={`${data.saas.churnRateMonthly}%`}
                hint={`${formatNumber(data.saas.churnedSubscribers30d)} cancelaram (30d)`}
              />
              <StatCard
                label="Assinantes ativos"
                value={formatNumber(data.saas.activeSubscribers)}
                hint="Premium vigente"
                icon={Crown}
              />
            </div>
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Composição da base</CardTitle>
              <CardDescription>
                Distribuição entre planos gratuito e premium.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PlanBar
                premium={data.users.premium}
                free={data.users.free}
                total={data.users.total}
              />
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}

function PlanBar({
  premium,
  free,
  total,
}: {
  premium: number;
  free: number;
  total: number;
}) {
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);
  return (
    <div className="space-y-3">
      <div className="bg-muted flex h-3 w-full overflow-hidden rounded-full">
        <div
          className="bg-primary h-full"
          style={{ width: `${pct(premium)}%` }}
        />
        <div
          className="bg-muted-foreground/30 h-full"
          style={{ width: `${pct(free)}%` }}
        />
      </div>
      <div className="text-muted-foreground flex gap-6 text-sm">
        <span className="flex items-center gap-2">
          <span className="bg-primary size-3 rounded-full" />
          Premium · {formatNumber(premium)} ({pct(premium).toFixed(1)}%)
        </span>
        <span className="flex items-center gap-2">
          <span className="bg-muted-foreground/30 size-3 rounded-full" />
          Free · {formatNumber(free)} ({pct(free).toFixed(1)}%)
        </span>
      </div>
    </div>
  );
}
