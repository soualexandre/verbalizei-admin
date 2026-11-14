"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipProps } from "recharts";
import { PencilSimple, Plus, Warning, WarningCircle } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import {
  compact,
  featureLabel,
  providerLabel,
  UNIT_LABEL,
  usd,
  type BillingItem,
  type BillingOverview,
  type BillingStatus,
} from "@/lib/billing";
import { cn } from "@/lib/utils";
import { ErrorState } from "@/components/error-state";
import { HeroStat, HeroStats, HeroStatsSkeleton, PageHero, Section } from "@/components/page-hero";
import { ItemDialog } from "@/components/billing/item-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/**
 * Custos (14/11/2026): tudo o que envolve billing num lugar só. O mês
 * corrente (Brasília), em US$: custos fixos da infraestrutura, o consumo das
 * APIs pagas com cota, orçamento e aviso, o gasto por dia e quem chama cada
 * API. O sininho do menu usa os mesmos avisos.
 */

const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** Cor fixa por provedor (a cor segue o provedor, nunca a posição no ranking). */
const PROVIDER_COLOR: Record<string, string> = {
  openrouter: "var(--chart-1)",
  google: "var(--chart-2)",
  recall: "var(--chart-3)",
  deepgram: "var(--chart-4)",
};
const colorOf = (p: string) => PROVIDER_COLOR[p] ?? "var(--chart-5)";

const STATUS: Record<BillingStatus, { label: string; variant: "success" | "warning" | "destructive" | "secondary" }> = {
  ok: { label: "No limite", variant: "success" },
  near: { label: "Perto", variant: "warning" },
  over: { label: "Estourou", variant: "destructive" },
  unset: { label: "Sem limite", variant: "secondary" },
};

export default function BillingPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["billing"],
    queryFn: () => api.get<BillingOverview>("/admin/billing"),
  });
  const [editing, setEditing] = useState<{ item: BillingItem | null; kind: "FIXED" | "USAGE" } | null>(null);

  const month = data ? MONTHS[Number(data.month.key.slice(5)) - 1] : null;

  return (
    <>
      <PageHero
        title="Custos"
        description={
          data
            ? `${month} até hoje (dia ${Math.ceil(data.month.elapsedDays)} de ${data.month.days}). Valores em US$, estimados pelo uso registrado.`
            : "O mês corrente, em US$."
        }
        actions={
          <Button size="sm" onClick={() => setEditing({ item: null, kind: "FIXED" })}>
            <Plus weight="bold" /> Novo custo
          </Button>
        }
      >
        {data ? <Totals data={data} /> : isLoading ? <HeroStatsSkeleton count={4} /> : null}
      </PageHero>

      {isError && !data ? (
        <ErrorState title="Não foi possível carregar os custos." error={error} onRetry={() => refetch()} />
      ) : isLoading || !data ? (
        <Skeleton className="h-72 rounded-card" />
      ) : (
        <>
          {data.alerts.length > 0 && (
            <ul className="rounded-card bg-card divide-y border" aria-label="Avisos">
              {data.alerts.map((a) => (
                <li key={a.id} className="flex items-start gap-2.5 px-4 py-2 text-[13px] sm:items-center">
                  {a.level === "critical" ? (
                    <WarningCircle weight="fill" className="text-destructive mt-0.5 size-4 shrink-0 sm:mt-0" aria-hidden />
                  ) : (
                    <Warning weight="fill" className="text-lime-600 mt-0.5 size-4 shrink-0 sm:mt-0" aria-hidden />
                  )}
                  <span className="min-w-0 sm:flex sm:gap-2.5">
                    <span className="block font-medium">{a.title}</span>
                    <span className="text-muted-foreground block sm:truncate">{a.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}

          <Section
            title="APIs: cotas e orçamentos"
            description="Consumo do mês de cada API paga contra a cota e o orçamento. O aviso olha a previsão do mês, para avisar antes de estourar."
            aside={
              <Button variant="ghost" size="sm" onClick={() => setEditing({ item: null, kind: "USAGE" })}>
                <Plus /> API
              </Button>
            }
          >
            <UsageTable items={data.items.filter((i) => i.kind === "USAGE")} onEdit={(item) => setEditing({ item, kind: "USAGE" })} />
          </Section>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
            <Section className="min-w-0" title="Gasto por dia" description="Gasto das APIs em cada dia do mês, por provedor.">
              <div className="rounded-card bg-card border p-4">
                <DailyChart data={data} />
              </div>
            </Section>
            <Section className="min-w-0" title="Por provedor" description="O gasto das APIs no mês, por quem cobra.">
              <ul className="rounded-card bg-card divide-y border">
                {data.byProvider.length === 0 && <li className="text-muted-foreground px-4 py-6 text-center text-xs">Nenhuma chamada paga no mês.</li>}
                {data.byProvider.map((p) => (
                  <li key={p.provider} className="flex items-center gap-2.5 px-4 py-2 text-[13px]">
                    <span className="size-2 shrink-0 rounded-full" style={{ background: colorOf(p.provider) }} aria-hidden />
                    <span className="flex-1 font-medium">{providerLabel(p.provider)}</span>
                    <span className="text-muted-foreground tabular-nums">{p.calls.toLocaleString("pt-BR")} chamadas</span>
                    <span className="w-20 text-right font-medium tabular-nums">{usd(p.usd)}</span>
                  </li>
                ))}
              </ul>
            </Section>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Section className="min-w-0" title="Quem chama as APIs" description="Cada uso do produto que gera chamada paga. 'Sem item' = gasto que nenhum item de API acompanha.">
              <div className="rounded-card bg-card border px-2 py-1">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Uso</TableHead>
                      <TableHead>Provedor</TableHead>
                      <TableHead className="text-right">Chamadas</TableHead>
                      <TableHead className="text-right">Gasto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.byFeature.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-muted-foreground py-6 text-center text-xs">
                          Nenhuma chamada no mês.
                        </TableCell>
                      </TableRow>
                    )}
                    {data.byFeature.map((f) => (
                      <TableRow key={`${f.provider}:${f.feature}`}>
                        <TableCell className="font-medium">
                          {featureLabel(f.feature)}
                          {!f.covered && (
                            <Badge variant="warning" className="ml-1.5">
                              sem item
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{providerLabel(f.provider)}</TableCell>
                        <TableCell className="text-right tabular-nums">{f.calls.toLocaleString("pt-BR")}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">{usd(f.usd)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Section>
            <Section className="min-w-0" title="Quem mais gasta" description="As pessoas com mais gasto de API no mês.">
              <div className="rounded-card bg-card border px-2 py-1">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pessoa</TableHead>
                      <TableHead className="text-right">Chamadas</TableHead>
                      <TableHead className="text-right">Gasto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.topUsers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-muted-foreground py-6 text-center text-xs">
                          Ninguém gerou gasto no mês.
                        </TableCell>
                      </TableRow>
                    )}
                    {data.topUsers.map((u) => (
                      <TableRow key={u.userId}>
                        <TableCell className="max-w-56">
                          <a href={`/users/${u.userId}`} className="block truncate font-medium hover:underline">
                            {u.name || u.email || "Sem nome"}
                          </a>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{u.calls.toLocaleString("pt-BR")}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">{usd(u.usd)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Section>
          </div>

          <Section
            title="Infraestrutura"
            description="Custos fixos por mês (servidor, banco, armazenamento, hospedagem). Preencha o valor da fatura de cada um."
            aside={
              <Button variant="ghost" size="sm" onClick={() => setEditing({ item: null, kind: "FIXED" })}>
                <Plus /> Fixo
              </Button>
            }
          >
            <ul className="rounded-card bg-card divide-y border">
              {data.items
                .filter((i) => i.kind === "FIXED")
                .map((i) => (
                  <li key={i.id} className={cn("flex items-center gap-3 px-4 py-2 text-[13px]", !i.active && "opacity-50")}>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{i.name}</span>
                      {i.notes && <span className="text-muted-foreground block truncate text-xs">{i.notes}</span>}
                    </span>
                    <span className="text-muted-foreground hidden sm:inline">{providerLabel(i.provider)}</span>
                    <span className={cn("w-24 text-right tabular-nums", i.spentUsd ? "font-medium" : "text-muted-foreground")}>
                      {i.spentUsd ? usd(i.spentUsd) : "a preencher"}
                    </span>
                    <EditButton onClick={() => setEditing({ item: i, kind: "FIXED" })} label={i.name} />
                  </li>
                ))}
            </ul>
          </Section>
        </>
      )}

      {editing && (
        <ItemDialog
          key={editing.item?.id ?? `new-${editing.kind}`}
          open
          onOpenChange={(v) => !v && setEditing(null)}
          item={editing.item}
          kind={editing.kind}
        />
      )}
    </>
  );
}

function Totals({ data }: { data: BillingOverview }) {
  const t = data.totals;
  const prev = t.previousUsageUsd;
  const diff = prev > 0 ? Math.round(((t.usageForecastUsd - prev) / prev) * 100) : null;
  return (
    <HeroStats cols={4}>
      <HeroStat label="Gasto no mês" value={usd(t.spentUsd)} note="Fixos + APIs até hoje" help="Custos fixos do mês somados ao consumo das APIs até agora." />
      <HeroStat
        label="Previsão do mês"
        value={usd(t.forecastUsd)}
        note="No ritmo atual"
        help="Fixos + consumo das APIs projetado pelo ritmo médio dos dias corridos."
      />
      <HeroStat
        label="APIs"
        value={usd(t.usageUsd)}
        trend={diff == null ? undefined : { direction: diff > 2 ? "up" : diff < -2 ? "down" : "flat", text: `${diff > 0 ? "+" : ""}${diff}%` }}
        // Gasto subindo é atenção (lima), caindo é bom sinal (verde).
        trendTone={diff == null ? undefined : diff > 2 ? "down" : diff < -2 ? "up" : "flat"}
        note={prev > 0 ? `Mês passado: ${usd(prev)}` : `Previsão: ${usd(t.usageForecastUsd)}`}
        help="Consumo das APIs pagas no mês. A variação compara a previsão deste mês com o total do mês passado."
      />
      <HeroStat
        label="Infraestrutura"
        value={usd(t.fixedUsd)}
        note={t.fixedMissing ? `${t.fixedMissing} sem valor` : "Por mês"}
        help="Soma dos custos fixos ativos."
      />
    </HeroStats>
  );
}

function EditButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <Button variant="ghost" size="icon" className="size-7" onClick={onClick} aria-label={`Editar ${label}`}>
      <PencilSimple className="size-4" />
    </Button>
  );
}

function Meter({ pct, status }: { pct: number | null; status: BillingStatus }) {
  if (pct == null) return <div className="bg-muted h-1.5 w-full rounded-full" />;
  return (
    <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full" role="meter" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div
        className={cn(
          "h-full rounded-full",
          status === "over" ? "bg-destructive" : status === "near" ? "bg-lime-600" : "bg-brand",
        )}
        style={{ width: `${Math.min(100, pct)}%` }}
      />
    </div>
  );
}

function UsageTable({ items, onEdit }: { items: BillingItem[]; onEdit: (i: BillingItem) => void }) {
  return (
    <div className="rounded-card bg-card border px-2 py-1">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>API</TableHead>
            <TableHead className="w-[28%]">Cota do mês</TableHead>
            <TableHead className="text-right">Gasto</TableHead>
            <TableHead className="text-right">Previsão / orçamento</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((i) => {
            const unit = i.unitType ? UNIT_LABEL[i.unitType] ?? i.unitType : "";
            const s = i.active ? STATUS[i.status] : { label: "Desligado", variant: "secondary" as const };
            return (
              <TableRow key={i.id} className={cn(!i.active && "opacity-50")}>
                <TableCell>
                  <span className="block font-medium">{i.name}</span>
                  <span className="text-muted-foreground text-xs">{i.calls ? `${i.calls.toLocaleString("pt-BR")} chamadas` : providerLabel(i.provider)}</span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Meter pct={i.quotaPct} status={i.status} />
                    <span className="text-muted-foreground text-[11px] tabular-nums">
                      {compact(i.usedUnits)}
                      {i.quotaUnits ? ` de ${compact(i.quotaUnits)}` : ""} {unit}
                      {i.quotaPct != null && ` · ${Math.round(i.quotaPct)}%`}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">{usd(i.spentUsd)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {usd(i.forecastUsd)}
                  <span className="text-muted-foreground"> / {i.budgetUsd != null ? usd(i.budgetUsd, 0) : "—"}</span>
                </TableCell>
                <TableCell>
                  <Badge variant={s.variant}>{s.label}</Badge>
                </TableCell>
                <TableCell>
                  <EditButton onClick={() => onEdit(i)} label={i.name} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

const shortDay = (d: string) => `${Number(d.slice(8))}/${Number(d.slice(5, 7))}`;

function DailyChart({ data }: { data: BillingOverview }) {
  const providers = data.byProvider.map((p) => p.provider);
  const rows = data.byDay.map((d) => ({ day: d.day, ...d.providers }));
  if (!rows.length) return <p className="text-muted-foreground py-14 text-center text-xs">Sem gasto de API no mês.</p>;
  return (
    <>
      <div className="h-[180px] w-full">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={rows} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="day" tickFormatter={shortDay} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} minTickGap={12} />
            <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={44} tickFormatter={(v: number) => `$${v}`} />
            <Tooltip
              cursor={{ fill: "var(--muted)" }}
              content={({ active, payload, label }: TooltipProps<number, string>) => {
                if (!active || !payload?.length) return null;
                const total = payload.reduce((t, p) => t + Number(p.value ?? 0), 0);
                return (
                  <div className="bg-card min-w-40 rounded-lg border px-3 py-2 text-xs shadow-md">
                    <p className="mb-1 font-semibold">{shortDay(String(label))}</p>
                    {payload.map((p) => (
                      <div key={String(p.dataKey)} className="flex items-center justify-between gap-4 tabular-nums">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <span className="size-2 rounded-full" style={{ background: colorOf(String(p.dataKey)) }} />
                          {providerLabel(String(p.dataKey))}
                        </span>
                        <span className="font-medium">{usd(Number(p.value ?? 0))}</span>
                      </div>
                    ))}
                    <p className="mt-1.5 flex justify-between border-t pt-1.5 font-medium tabular-nums">
                      <span>Total</span>
                      <span>{usd(total)}</span>
                    </p>
                  </div>
                );
              }}
            />
            {providers.map((p, i) => (
              <Bar
                key={p}
                dataKey={p}
                stackId="d"
                fill={colorOf(p)}
                stroke="var(--card)"
                strokeWidth={1}
                radius={i === providers.length - 1 ? [3, 3, 0, 0] : 0}
                maxBarSize={22}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
        {data.byProvider.map((p) => (
          <li key={p.provider} className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <span className="size-2 rounded-full" style={{ background: colorOf(p.provider) }} aria-hidden />
            {providerLabel(p.provider)} <span className="text-foreground font-medium tabular-nums">{usd(p.usd)}</span>
          </li>
        ))}
      </ul>
    </>
  );
}
