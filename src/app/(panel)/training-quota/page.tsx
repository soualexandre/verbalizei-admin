"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type {
  AdminTrainingQuota,
  QuotaPeriod,
  TrainingQuotaAuditPage,
  TrainingQuotaPolicy,
  UpdateTrainingQuotaPayload,
} from "@/lib/types";
import { formatDate, formatDateTime, formatNumber } from "@/lib/utils";
import {
  AUDIT_ACTION_LABEL,
  PERIOD_LABEL,
  QUOTA_LIMIT_MAX,
  QUOTA_LIMIT_MIN,
  REASON_MAX,
  REASON_MIN,
  formatAuditChange,
  formatDrillRule,
  formatPeriodKey,
  formatRule,
  formatRuleShort,
  personLabel,
  quotaKeys,
  type AdminDrillQuota,
  type UpdateDrillQuotaPayload,
} from "@/lib/training-quota";
import { ErrorState } from "@/components/error-state";
import { HeroStat, HeroStats, InsightList, PageHero, Section, type InsightTone, HeroStatsSkeleton } from "@/components/page-hero";
import { PaginationBar } from "@/components/pagination-bar";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const AUDIT_PAGE_SIZE = 20;

export default function TrainingQuotaPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: quotaKeys.overview(),
    queryFn: () => api.get<AdminTrainingQuota>("/admin/training-quota"),
  });

  return (
    <>
      <PageHero
        title="Cota de treinos"
        description={
          data
            ? `Quantos treinos o plano gratuito pode fazer por período; Premium e admins não têm cota. Período atual: ${formatPeriodKey(data.current.periodKey)}, desde ${formatDate(data.current.periodStart)}, renova em ${formatDateTime(data.current.resetsAt)}.`
            : "Quantos treinos o plano gratuito pode fazer por período. Premium e admins não têm cota."
        }
      >
        {data ? (
          <QuotaStats data={data} />
        ) : isLoading ? (
          <HeroStatsSkeleton count={4} />
        ) : null}
      </PageHero>

      {isError ? (
        <ErrorCard
          title="Não foi possível carregar a cota de treinos."
          error={error}
          onRetry={() => refetch()}
          retrying={isFetching}
        />
      ) : isLoading || !data ? (
        <OverviewSkeleton />
      ) : (
        <Section
          title="Alterar a regra do plano gratuito"
          description="A mudança vale na hora, inclusive para o período corrente. Treinos já consumidos continuam contando."
        >
          <PolicyForm
            // Remount when the saved policy changes so the form re-seeds.
            key={`${data.policy.limit}-${data.policy.period}-${data.policy.updatedAt ?? "default"}`}
            policy={data.policy}
          />
        </Section>
      )}

      <Section
        title="Treinos curtos por dia"
        description="Quantos treinos curtos diferentes o plano gratuito faz por dia (horário de Brasília). Refazer o mesmo treino no mesmo dia não conta de novo. Planos pagos não têm limite."
      >
        <DrillQuotaCard />
      </Section>

      <Section
        title="Histórico de alterações"
        description="Mudanças de regra e treinos extras concedidos, com autor e motivo."
      >
        <AuditHistory />
      </Section>

      {data && (
        <Section title="O que os números dizem" description="O período corrente em frases.">
          <InsightList items={quotaInsights(data)} />
        </Section>
      )}
    </>
  );
}

/** Os totais da faixa: a regra vigente e o uso no período corrente. */
function QuotaStats({ data }: { data: AdminTrainingQuota }) {
  const { policy, current } = data;
  const atLimitShare =
    current.activeUsers > 0
      ? Math.round((current.usersAtLimit / current.activeUsers) * 100)
      : 0;

  return (
    <HeroStats cols={4}>
      <HeroStat
        label="Regra atual"
        value={formatRuleShort(policy.limit, policy.period)}
        note={
          policy.isDefault || !policy.updatedBy
            ? "Padrão do sistema, nunca alterada"
            : `Por ${personLabel(policy.updatedBy)} em ${formatDate(policy.updatedAt)}`
        }
        help={`${formatRule(policy.limit, policy.period)} no plano gratuito.${
          policy.isDefault || !policy.updatedBy
            ? ""
            : ` Alterada por ${personLabel(policy.updatedBy)} em ${formatDateTime(policy.updatedAt)}.`
        }`}
      />
      <HeroStat
        label="Treinos consumidos"
        value={formatNumber(current.consumed)}
        note="no período, sem Premium"
        help="Treinos descontados da cota no período corrente, por usuários sem Premium."
      />
      <HeroStat
        label="Usaram a cota"
        value={formatNumber(current.activeUsers)}
        note="ao menos 1 treino no período"
        help="Pessoas com ao menos 1 treino descontado no período corrente."
      />
      <HeroStat
        label="Bateram o limite"
        value={formatNumber(current.usersAtLimit)}
        note={current.activeUsers > 0 ? `${atLimitShare}% de quem usou a cota` : "Ninguém usou a cota ainda"}
        help="Pessoas que já usaram todos os treinos do período e só voltam a treinar na renovação."
      />
    </HeroStats>
  );
}

/** As frases do fim da tela, a partir dos mesmos números da faixa. */
function quotaInsights(data: AdminTrainingQuota): Array<{ text: string; tone: InsightTone }> {
  const { policy, current } = data;
  const items: Array<{ text: string; tone: InsightTone }> = [];
  if (current.activeUsers === 0) {
    items.push({ text: `Ninguém do plano gratuito treinou em ${formatPeriodKey(current.periodKey).toLowerCase()} até agora.`, tone: "brand" });
    return items;
  }
  const avg = current.consumed / current.activeUsers;
  items.push({
    text: `Quem usou a cota fez em média ${avg.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ${avg === 1 ? "treino" : "treinos"}, de ${policy.limit} ${policy.limit === 1 ? "permitido" : "permitidos"}.`,
    tone: "brand",
  });
  const share = Math.round((current.usersAtLimit / current.activeUsers) * 100);
  items.push(
    current.usersAtLimit === 0
      ? { text: "Ninguém bateu o limite neste período: a cota não está travando o uso.", tone: "green" }
      : {
          text: `${formatNumber(current.usersAtLimit)} ${current.usersAtLimit === 1 ? "pessoa bateu" : "pessoas bateram"} o limite (${share}% de quem usou a cota) e só ${current.usersAtLimit === 1 ? "volta" : "voltam"} a treinar em ${formatDateTime(current.resetsAt)}, ou assinando o Premium.`,
          tone: share >= 30 ? "lime" : "brand",
        },
  );
  return items;
}

function PolicyForm({ policy }: { policy: TrainingQuotaPolicy }) {
  const qc = useQueryClient();
  const [limitInput, setLimitInput] = useState(String(policy.limit));
  const [period, setPeriod] = useState<QuotaPeriod>(policy.period);
  const [reason, setReason] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const limit = Number(limitInput);
  const limitValid =
    limitInput.trim() !== "" &&
    Number.isInteger(limit) &&
    limit >= QUOTA_LIMIT_MIN &&
    limit <= QUOTA_LIMIT_MAX;
  const reasonLength = reason.trim().length;
  const reasonValid = reasonLength >= REASON_MIN && reasonLength <= REASON_MAX;
  const changed = limit !== policy.limit || period !== policy.period;
  const canSubmit = limitValid && reasonValid && changed;

  const mutation = useMutation({
    mutationFn: (payload: UpdateTrainingQuotaPayload) =>
      api.patch<AdminTrainingQuota>("/admin/training-quota", payload),
    onSuccess: (res) => {
      toast.success(`Regra atualizada: ${formatRule(res.policy.limit, res.policy.period)}.`);
      qc.setQueryData(quotaKeys.overview(), res);
      qc.invalidateQueries({ queryKey: quotaKeys.all });
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Não foi possível atualizar a regra."),
  });

  return (
    <Card className="shadow-none">
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) setConfirmOpen(true);
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:max-w-xl">
            <div className="space-y-2">
              <Label htmlFor="quota-limit">Treinos por período</Label>
              <Input
                id="quota-limit"
                type="number"
                inputMode="numeric"
                min={QUOTA_LIMIT_MIN}
                max={QUOTA_LIMIT_MAX}
                step={1}
                value={limitInput}
                onChange={(e) => setLimitInput(e.target.value)}
                aria-invalid={!limitValid}
              />
              <p
                className={
                  limitValid ? "text-muted-foreground text-xs" : "text-destructive text-xs"
                }
              >
                Número inteiro de {QUOTA_LIMIT_MIN} a {QUOTA_LIMIT_MAX}. Zero bloqueia
                os treinos gratuitos.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quota-period">Período</Label>
              <Select value={period} onValueChange={(v) => setPeriod(v as QuotaPeriod)}>
                <SelectTrigger id="quota-period" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WEEK">{PERIOD_LABEL.WEEK}</SelectItem>
                  <SelectItem value="MONTH">{PERIOD_LABEL.MONTH}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                Semana: segunda a domingo. Mês: dia 1 ao último dia. Horário de
                Brasília.
              </p>
            </div>
          </div>

          <div className="space-y-2 lg:max-w-xl">
            <Label htmlFor="quota-reason">Motivo (obrigatório)</Label>
            <Textarea
              id="quota-reason"
              placeholder="Ex.: teste de conversão com limite maior durante a campanha de setembro"
              value={reason}
              maxLength={REASON_MAX}
              onChange={(e) => setReason(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">
              Fica registrado no histórico. {reasonLength}/{REASON_MAX} caracteres
              {reasonLength > 0 && reasonLength < REASON_MIN
                ? ` · mínimo ${REASON_MIN}`
                : ""}
              .
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={!canSubmit || mutation.isPending}>
              {mutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Salvar regra
            </Button>
            {!changed && (
              <span className="text-muted-foreground text-sm">
                Igual à regra atual.
              </span>
            )}
          </div>
        </form>
      </CardContent>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Confirmar nova regra"
        description="A nova regra vale imediatamente para todos os usuários do plano gratuito, inclusive no período corrente."
        confirmLabel="Aplicar agora"
        onConfirm={async () => {
          try {
            await mutation.mutateAsync({ limit, period, reason: reason.trim() });
            setReason("");
          } catch {
            // Error toast comes from the mutation's onError.
          }
        }}
      >
        <div className="space-y-3 text-sm">
          <div className="bg-muted flex items-center justify-center gap-3 rounded-md p-3 font-medium">
            <span className="text-muted-foreground">
              {formatRuleShort(policy.limit, policy.period)}
            </span>
            <ArrowRight className="text-muted-foreground size-4" />
            <span>{limitValid ? formatRuleShort(limit, period) : "—"}</span>
          </div>
          <p className="text-muted-foreground">
            {period !== policy.period
              ? "Trocar o período muda também quando a cota renova. "
              : ""}
            Quem já usou mais do que o novo limite fica sem treinos até a
            renovação.
          </p>
          <p className="text-muted-foreground break-words">
            <span className="text-foreground font-medium">Motivo:</span> {reason.trim()}
          </p>
        </div>
      </ConfirmDialog>
    </Card>
  );
}

/** Treinos curtos por dia do FREE (docs/cota-de-treinos.md, 30/10/2026). */
function DrillQuotaCard() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: quotaKeys.drill(),
    queryFn: () => api.get<AdminDrillQuota>("/admin/drill-quota"),
  });
  if (isError)
    return (
      <ErrorCard
        title="Não foi possível carregar os treinos curtos."
        error={error}
        onRetry={() => refetch()}
        retrying={isFetching}
      />
    );
  if (isLoading || !data) return <Skeleton className="h-48 rounded-card" />;
  return (
    <DrillQuotaForm
      key={`${data.policy.perDay ?? "none"}-${data.policy.updatedAt ?? "default"}`}
      policy={data.policy}
    />
  );
}

function DrillQuotaForm({ policy }: { policy: AdminDrillQuota["policy"] }) {
  const qc = useQueryClient();
  const [perDayInput, setPerDayInput] = useState(
    policy.perDay === null ? "" : String(policy.perDay),
  );
  const [reason, setReason] = useState("");

  const blank = perDayInput.trim() === "";
  const parsed = Number(perDayInput);
  const perDay: number | null = blank ? null : parsed;
  const valid =
    blank ||
    (Number.isInteger(parsed) && parsed >= QUOTA_LIMIT_MIN && parsed <= QUOTA_LIMIT_MAX);
  const reasonLength = reason.trim().length;
  const reasonValid = reasonLength >= REASON_MIN && reasonLength <= REASON_MAX;
  const changed = perDay !== policy.perDay;
  const canSubmit = valid && reasonValid && changed;

  const mutation = useMutation({
    mutationFn: (payload: UpdateDrillQuotaPayload) =>
      api.patch<AdminDrillQuota>("/admin/drill-quota", payload),
    onSuccess: (res) => {
      toast.success(`Treinos curtos: ${formatDrillRule(res.policy.perDay)}.`);
      qc.setQueryData(quotaKeys.drill(), res);
      qc.invalidateQueries({ queryKey: quotaKeys.all });
      setReason("");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar."),
  });

  return (
    <Card className="shadow-none">
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) mutation.mutate({ perDay, reason: reason.trim() });
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:max-w-xl">
            <div className="space-y-2">
              <Label htmlFor="drill-per-day">Treinos curtos por dia</Label>
              <Input
                id="drill-per-day"
                type="number"
                inputMode="numeric"
                min={QUOTA_LIMIT_MIN}
                max={QUOTA_LIMIT_MAX}
                step={1}
                placeholder="sem limite"
                value={perDayInput}
                onChange={(e) => setPerDayInput(e.target.value)}
                aria-invalid={!valid}
              />
              <p className={valid ? "text-muted-foreground text-xs" : "text-destructive text-xs"}>
                Vazio = sem limite. Número inteiro de {QUOTA_LIMIT_MIN} a {QUOTA_LIMIT_MAX}.
                Hoje: {formatDrillRule(policy.perDay)}
                {policy.isDefault || !policy.updatedBy
                  ? " (padrão do sistema)"
                  : `, por ${personLabel(policy.updatedBy)} em ${formatDate(policy.updatedAt)}`}
                .
              </p>
            </div>
          </div>
          <div className="space-y-2 lg:max-w-xl">
            <Label htmlFor="drill-reason">Motivo (obrigatório)</Label>
            <Textarea
              id="drill-reason"
              placeholder="Ex.: teste de conversão com 2 treinos curtos por dia"
              value={reason}
              maxLength={REASON_MAX}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={!canSubmit || mutation.isPending}>
              {mutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Salvar
            </Button>
            {!changed && (
              <span className="text-muted-foreground text-sm">Igual à regra atual.</span>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function AuditHistory() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: quotaKeys.audit(page),
    queryFn: () =>
      api.get<TrainingQuotaAuditPage>(
        `/admin/training-quota/audit?page=${page}&pageSize=${AUDIT_PAGE_SIZE}`,
      ),
    placeholderData: (prev) => prev,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / (data.pageSize || AUDIT_PAGE_SIZE))) : 1;

  return (
    <Card className="shadow-none">
      <CardContent className="space-y-4">
        {isError ? (
          <ErrorCard
            inline
            title="Não foi possível carregar o histórico."
            error={error}
            onRetry={() => refetch()}
            retrying={isFetching}
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ação</TableHead>
                  <TableHead>Alteração</TableHead>
                  <TableHead>Alvo</TableHead>
                  <TableHead>Autor</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6}>
                        <Skeleton className="h-8 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : !data?.items.length ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-muted-foreground py-10 text-center"
                    >
                      Nenhuma alteração registrada ainda.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Badge
                          variant={item.action === "GRANT_CREATED" ? "success" : "secondary"}
                        >
                          {AUDIT_ACTION_LABEL[item.action] ?? item.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium whitespace-nowrap">
                        {formatAuditChange(item)}
                      </TableCell>
                      <TableCell>
                        {item.targetUser ? (
                          <Link
                            href={`/users/${item.targetUser.id}`}
                            className="hover:text-primary underline-offset-4 hover:underline"
                          >
                            <span className="block leading-tight">
                              {personLabel(item.targetUser)}
                            </span>
                            {item.targetUser.name && (
                              <span className="text-muted-foreground block text-xs">
                                {item.targetUser.email}
                              </span>
                            )}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">Plano gratuito</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="block leading-tight">{personLabel(item.actor)}</span>
                        {item.actor.name && (
                          <span className="text-muted-foreground block text-xs">
                            {item.actor.email}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs whitespace-normal break-words">
                        {item.reason || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {formatDateTime(item.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {data && data.total > 0 && (
              <PaginationBar
                page={data.page}
                totalPages={totalPages}
                total={data.total}
                onPageChange={setPage}
              />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function OverviewSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando a regra">
      <Skeleton className="h-80 rounded-card" />
    </div>
  );
}

function ErrorCard({
  title,
  error,
  onRetry,
  retrying,
  inline = false,
}: {
  title: string;
  error: unknown;
  onRetry: () => void;
  retrying: boolean;
  inline?: boolean;
}) {
  const body = <ErrorState bare title={title} error={error} onRetry={onRetry} retrying={retrying} />;
  if (inline) return body;
  return (
    <Card>
      <CardContent>{body}</CardContent>
    </Card>
  );
}
