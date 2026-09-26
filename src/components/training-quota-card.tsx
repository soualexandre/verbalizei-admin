"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Gauge, Gift, Infinity as InfinityIcon, Loader2, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type {
  CreateTrainingQuotaGrantPayload,
  TrainingQuotaGrantItem,
  TrainingQuotaStatus,
  TrainingQuotaUsageItem,
  UserTrainingQuota,
} from "@/lib/types";
import { cn, formatDateTime } from "@/lib/utils";
import {
  GRANT_AMOUNT_MAX,
  GRANT_AMOUNT_MIN,
  REASON_MAX,
  REASON_MIN,
  formatPeriodKey,
  personLabel,
  pluralTrainings,
  quotaKeys,
} from "@/lib/training-quota";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function TrainingQuotaCard({ userId }: { userId: string }) {
  const [grantOpen, setGrantOpen] = useState(false);
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: quotaKeys.user(userId),
    queryFn: () => api.get<UserTrainingQuota>(`/admin/users/${userId}/training-quota`),
  });

  const unlimited = data?.status.unlimited ?? false;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <Gauge className="size-4" />
            Cota de treinos
          </span>
          {data && !unlimited && (
            <Button size="sm" variant="outline" onClick={() => setGrantOpen(true)}>
              <Plus className="size-4" />
              Conceder treinos extras
            </Button>
          )}
        </CardTitle>
        <CardDescription>
          {data
            ? unlimited
              ? "Sem limite de treinos enquanto o acesso Premium/Admin estiver válido."
              : `${formatPeriodKey(data.status.periodKey)} · desde ${formatDateTime(data.status.periodStart)}`
            : "Uso do plano gratuito no período corrente."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isError ? (
          <div className="flex flex-col items-start gap-3">
            <p className="font-medium">Não foi possível carregar a cota deste usuário.</p>
            <p className="text-muted-foreground text-sm">
              {error instanceof Error ? error.message : "Erro desconhecido."}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={cn("size-4", isFetching && "animate-spin")} />
              Tentar de novo
            </Button>
          </div>
        ) : isLoading || !data ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <>
            <QuotaStatus status={data.status} />
            <div className="grid gap-6 lg:grid-cols-2">
              <UsageList usages={data.usages} currentPeriodKey={data.status.periodKey} />
              <GrantList grants={data.grants} currentPeriodKey={data.status.periodKey} />
            </div>
          </>
        )}
      </CardContent>

      {data && !unlimited && (
        <GrantDialog
          userId={userId}
          status={data.status}
          open={grantOpen}
          onOpenChange={setGrantOpen}
        />
      )}
    </Card>
  );
}

function QuotaStatus({ status }: { status: TrainingQuotaStatus }) {
  if (status.unlimited) {
    return (
      <div className="flex items-center gap-3 rounded-md border p-4">
        <div className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-full">
          <InfinityIcon className="size-4" />
        </div>
        <div>
          <p className="font-medium">Ilimitado (Premium/Admin)</p>
          <p className="text-muted-foreground text-sm">
            Os treinos deste usuário não consomem cota.
          </p>
        </div>
      </div>
    );
  }

  const total = status.limit + status.bonus;
  const remaining = status.remaining ?? Math.max(0, total - status.used);
  const pct = total > 0 ? Math.min(100, Math.round((status.used / total) * 100)) : 100;
  const exhausted = remaining === 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-2xl font-semibold tracking-tight">
            {status.used}
            <span className="text-muted-foreground text-base font-normal">
              {" "}
              / {status.limit}
              {status.bonus > 0 && ` + ${status.bonus} extra${status.bonus === 1 ? "" : "s"}`}
            </span>
          </p>
          <p className="text-muted-foreground text-sm">treinos usados neste período</p>
        </div>
        <div className="text-right">
          <Badge variant={exhausted ? "warning" : "success"}>
            {exhausted
              ? "Cota esgotada"
              : `${pluralTrainings(remaining)} restante${remaining === 1 ? "" : "s"}`}
          </Badge>
          <p className="text-muted-foreground mt-1 text-xs">
            Renova em {formatDateTime(status.resetsAt)}
          </p>
        </div>
      </div>
      <div
        className="bg-muted h-2 w-full overflow-hidden rounded-full"
        role="progressbar"
        aria-label="Uso da cota de treinos"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={Math.min(status.used, total)}
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width]",
            exhausted ? "bg-amber-500" : "bg-primary",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function UsageList({
  usages,
  currentPeriodKey,
}: {
  usages: TrainingQuotaUsageItem[];
  currentPeriodKey: string;
}) {
  const current = usages.filter((u) => u.periodKey === currentPeriodKey);
  const previous = usages.filter((u) => u.periodKey !== currentPeriodKey);

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium">Treinos consumidos</h3>
      {!usages.length ? (
        <p className="text-muted-foreground text-sm">Nenhum treino consumido ainda.</p>
      ) : (
        <>
          <UsageGroup
            label="Neste período"
            items={current}
            empty="Nenhum treino neste período."
          />
          {previous.length > 0 && (
            <UsageGroup label="Anteriores" items={previous} showPeriod />
          )}
        </>
      )}
    </section>
  );
}

function UsageGroup({
  label,
  items,
  empty,
  showPeriod = false,
}: {
  label: string;
  items: TrainingQuotaUsageItem[];
  empty?: string;
  showPeriod?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {label} · {items.length}
      </p>
      {!items.length ? (
        <p className="text-muted-foreground text-sm">{empty}</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {items.map((u) => (
            <li key={u.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span className="min-w-0 truncate">
                {u.scenarioTitle || (
                  <span className="text-muted-foreground italic">
                    {u.sessionId ? "Cenário sem título" : "Sessão apagada"}
                  </span>
                )}
              </span>
              <span className="text-muted-foreground shrink-0 text-xs">
                {showPeriod && `${formatPeriodKey(u.periodKey)} · `}
                {formatDateTime(u.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function GrantList({
  grants,
  currentPeriodKey,
}: {
  grants: TrainingQuotaGrantItem[];
  currentPeriodKey: string;
}) {
  return (
    <section className="space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-medium">
        <Gift className="size-4" />
        Extras concedidos
      </h3>
      {!grants.length ? (
        <p className="text-muted-foreground text-sm">Nenhum treino extra concedido.</p>
      ) : (
        <ul className="space-y-2">
          {grants.map((g) => (
            <li key={g.id} className="rounded-md border p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">+{pluralTrainings(g.amount)}</span>
                <span className="flex items-center gap-2">
                  {g.periodKey === currentPeriodKey ? (
                    <Badge variant="success">Período atual</Badge>
                  ) : (
                    <Badge variant="outline">{formatPeriodKey(g.periodKey)}</Badge>
                  )}
                </span>
              </div>
              <p className="mt-1 break-words">{g.reason}</p>
              <p className="text-muted-foreground mt-1 text-xs">
                Por {personLabel(g.grantedBy)} em {formatDateTime(g.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function GrantDialog({
  userId,
  status,
  open,
  onOpenChange,
}: {
  userId: string;
  status: TrainingQuotaStatus;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const [amountInput, setAmountInput] = useState("1");
  const [reason, setReason] = useState("");

  const amount = Number(amountInput);
  const amountValid =
    amountInput.trim() !== "" &&
    Number.isInteger(amount) &&
    amount >= GRANT_AMOUNT_MIN &&
    amount <= GRANT_AMOUNT_MAX;
  const reasonLength = reason.trim().length;
  const reasonValid = reasonLength >= REASON_MIN && reasonLength <= REASON_MAX;

  function reset() {
    setAmountInput("1");
    setReason("");
  }

  const mutation = useMutation({
    mutationFn: (payload: CreateTrainingQuotaGrantPayload) =>
      api.post<UserTrainingQuota>(`/admin/users/${userId}/training-quota/grants`, payload),
    onSuccess: (res, vars) => {
      toast.success(`${pluralTrainings(vars.amount)} extra${vars.amount === 1 ? "" : "s"} concedido${vars.amount === 1 ? "" : "s"}.`);
      qc.setQueryData(quotaKeys.user(userId), res);
      qc.invalidateQueries({ queryKey: quotaKeys.all });
      reset();
      onOpenChange(false);
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Não foi possível conceder os treinos."),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !mutation.isPending) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Conceder treinos extras</DialogTitle>
          <DialogDescription>
            Vale só para o período corrente ({formatPeriodKey(status.periodKey)}), que
            renova em {formatDateTime(status.resetsAt)}.
          </DialogDescription>
        </DialogHeader>

        <form
          id="grant-form"
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (amountValid && reasonValid) {
              mutation.mutate({ amount, reason: reason.trim() });
            }
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="grant-amount">Quantidade</Label>
            <Input
              id="grant-amount"
              type="number"
              inputMode="numeric"
              min={GRANT_AMOUNT_MIN}
              max={GRANT_AMOUNT_MAX}
              step={1}
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              aria-invalid={!amountValid}
            />
            <p
              className={
                amountValid ? "text-muted-foreground text-xs" : "text-destructive text-xs"
              }
            >
              De {GRANT_AMOUNT_MIN} a {GRANT_AMOUNT_MAX}.{" "}
              {amountValid &&
                `O limite do período passa de ${status.limit + status.bonus} para ${status.limit + status.bonus + amount}.`}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="grant-reason">Motivo (obrigatório)</Label>
            <Textarea
              id="grant-reason"
              placeholder="Ex.: saiu da sala por falha de áudio e perdeu o treino"
              value={reason}
              maxLength={REASON_MAX}
              onChange={(e) => setReason(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">
              Fica registrado no histórico. {reasonLength}/{REASON_MAX} caracteres
              {reasonLength > 0 && reasonLength < REASON_MIN ? ` · mínimo ${REASON_MIN}` : ""}.
            </p>
          </div>
        </form>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              reset();
              onOpenChange(false);
            }}
            disabled={mutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="grant-form"
            disabled={!amountValid || !reasonValid || mutation.isPending}
          >
            {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
            Conceder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
