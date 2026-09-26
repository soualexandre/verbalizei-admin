"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  CalendarClock,
  Dumbbell,
  Gauge,
  History,
  Loader2,
  RefreshCw,
  Save,
  UserCheck,
  UserX,
} from "lucide-react";
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
  formatPeriodKey,
  formatRule,
  formatRuleShort,
  personLabel,
  quotaKeys,
} from "@/lib/training-quota";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { PaginationBar } from "@/components/pagination-bar";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
      <PageHeader
        title="Cota de treinos"
        description="Quantos treinos o plano gratuito pode fazer por período. Premium e admins não têm cota."
      />

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
        <div className="space-y-6">
          <Overview data={data} />
          <PolicyForm
            // Remount when the saved policy changes so the form re-seeds.
            key={`${data.policy.limit}-${data.policy.period}-${data.policy.updatedAt ?? "default"}`}
            policy={data.policy}
          />
        </div>
      )}

      <AuditHistory />
    </>
  );
}

function Overview({ data }: { data: AdminTrainingQuota }) {
  const { policy, current } = data;
  const atLimitShare =
    current.activeUsers > 0
      ? Math.round((current.usersAtLimit / current.activeUsers) * 100)
      : 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <StatCard
        className="sm:col-span-2 xl:col-span-1"
        label="Regra atual"
        icon={Gauge}
        value={<span className="text-xl">{formatRule(policy.limit, policy.period)}</span>}
        hint={
          policy.isDefault || !policy.updatedBy
            ? "Padrão do sistema (nunca alterada)"
            : `Alterada por ${personLabel(policy.updatedBy)} em ${formatDateTime(policy.updatedAt)}`
        }
      />
      <StatCard
        label="Período corrente"
        icon={CalendarClock}
        value={<span className="text-xl">{formatPeriodKey(current.periodKey)}</span>}
        hint={`Desde ${formatDate(current.periodStart)} · renova em ${formatDateTime(current.resetsAt)}`}
      />
      <StatCard
        label="Treinos consumidos"
        icon={Dumbbell}
        value={formatNumber(current.consumed)}
        hint="No período corrente, por usuários sem Premium"
      />
      <StatCard
        label="Usuários ativos"
        icon={UserCheck}
        value={formatNumber(current.activeUsers)}
        hint="Fizeram ao menos 1 treino no período"
      />
      <StatCard
        label="Bateram o limite"
        icon={UserX}
        value={formatNumber(current.usersAtLimit)}
        hint={
          current.activeUsers > 0
            ? `${atLimitShare}% dos usuários ativos`
            : "Nenhum usuário ativo no período"
        }
      />
    </div>
  );
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
    <Card>
      <CardHeader>
        <CardTitle>Alterar regra do plano gratuito</CardTitle>
        <CardDescription>
          A mudança vale na hora, inclusive para o período corrente. Treinos já
          consumidos continuam contando.
        </CardDescription>
      </CardHeader>
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="size-4" />
          Histórico de alterações
        </CardTitle>
        <CardDescription>
          Mudanças de regra e treinos extras concedidos, com autor e motivo.
        </CardDescription>
      </CardHeader>
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
                          variant={item.action === "POLICY_UPDATED" ? "secondary" : "success"}
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
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-80" />
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
  const body = (
    <div className="flex flex-col items-start gap-3">
      <p className="font-medium">{title}</p>
      <p className="text-muted-foreground text-sm">
        {error instanceof Error ? error.message : "Erro desconhecido."} Confira se a API
        está no ar e tente de novo.
      </p>
      <Button variant="outline" size="sm" onClick={onRetry} disabled={retrying}>
        <RefreshCw className={retrying ? "size-4 animate-spin" : "size-4"} />
        Tentar de novo
      </Button>
    </div>
  );
  if (inline) return body;
  return (
    <Card>
      <CardContent>{body}</CardContent>
    </Card>
  );
}
