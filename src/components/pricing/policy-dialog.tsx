"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CircleNotch, WarningCircle } from "@phosphor-icons/react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import type { AdminPricing, QuotaPeriod, UpdatePricingPayload } from "@/lib/types";
import {
  brtDateToEndIso,
  brtDateToStartIso,
  fieldLabel,
  getField,
  isoToBrtDate,
  moneyToInput,
  parseIntInput,
  parseMoneyInput,
  pricingKeys,
  setField,
  type PricingDraft,
} from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const REASON_MIN = 3;
const REASON_MAX = 500;

/** Um campo do diálogo, pelo caminho da API (o mesmo do erro de campo). */
export interface FieldSpec {
  path: string;
  label: string;
  kind: "money" | "int" | "period" | "switch" | "date-start" | "date-end" | "text";
  hint?: string;
  /** Vazio vale null (sem limite, sem desconto). */
  nullable?: boolean;
  placeholder?: string;
  /** Ocupa a linha inteira. */
  wide?: boolean;
}

export interface PolicyDialogSpec {
  title: string;
  description?: string;
  fields: FieldSpec[];
  /** O rascunho de partida, quando não é a política salva (nova promoção, remover…). */
  initial?: PricingDraft;
  /** Texto entre o cabeçalho e os campos. */
  body?: React.ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  successMessage?: string;
}

const initialRaw = (d: PricingDraft, f: FieldSpec): string => {
  const v = getField(d, f.path);
  if (f.kind === "money") return moneyToInput(v as number | null);
  if (f.kind === "int") return v == null ? "" : String(v);
  if (f.kind === "date-start" || f.kind === "date-end") return isoToBrtDate(v as string);
  if (f.kind === "text") return (v as string) ?? "";
  return "";
};

/**
 * Editar a política: os campos de um plano, o motivo (obrigatório) e salvar.
 * Salva a política inteira e os limites (PUT /admin/pricing); o erro de campo
 * da API aparece ao lado do campo ou, se o campo não está aqui, no topo.
 */
export function PolicyDialog({
  base,
  spec,
  onOpenChange,
}: {
  base: PricingDraft;
  spec: PolicyDialogSpec;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const start = spec.initial ?? base;
  const [draft, setDraft] = useState<PricingDraft>(start);
  const [raw, setRaw] = useState<Record<string, string>>(() =>
    Object.fromEntries(spec.fields.map((f) => [f.path, initialRaw(start, f)])),
  );
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<{ field: string | null; message: string } | null>(null);
  const [reason, setReason] = useState("");

  const update = (path: string, value: unknown) => {
    setDraft((d) => setField(d, path, value));
    if (apiError?.field === path) setApiError(null);
  };
  const setLocal = (path: string, msg: string | null) =>
    setLocalErrors((e) => {
      const next = { ...e };
      if (msg) next[path] = msg;
      else delete next[path];
      return next;
    });

  const onText = (f: FieldSpec, s: string) => {
    setRaw((r) => ({ ...r, [f.path]: s }));
    if (f.kind === "text") {
      update(f.path, s);
      return;
    }
    if (f.kind === "date-start" || f.kind === "date-end") {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return setLocal(f.path, "Escolha uma data.");
      setLocal(f.path, null);
      update(f.path, f.kind === "date-start" ? brtDateToStartIso(s) : brtDateToEndIso(s));
      return;
    }
    const v = f.kind === "money" ? parseMoneyInput(s) : parseIntInput(s);
    if (v === null && !f.nullable) return setLocal(f.path, "Campo obrigatório.");
    if (v !== null && Number.isNaN(v))
      return setLocal(f.path, f.kind === "money" ? "Escreva o valor em reais, como 69,90." : "Use um número inteiro.");
    setLocal(f.path, null);
    update(f.path, v);
  };

  const save = useMutation({
    mutationFn: (payload: UpdatePricingPayload) => api.put<AdminPricing>("/admin/pricing", payload),
    onSuccess: (res) => {
      qc.setQueryData(pricingKeys.view(), res);
      qc.invalidateQueries({ queryKey: pricingKeys.all });
      // A cota do Grátis e do Super mora na tela de cota também.
      qc.invalidateQueries({ queryKey: ["training-quota"] });
      toast.success(spec.successMessage ?? "Preços salvos. Valem em até 30 segundos.");
      onOpenChange(false);
    },
    onError: (e) => {
      const body = e instanceof ApiError ? (e.body as { field?: unknown } | null) : null;
      const field = body && typeof body.field === "string" ? body.field : null;
      setApiError({ field, message: e instanceof Error ? e.message : "Não deu para salvar." });
    },
  });

  const reasonLength = reason.trim().length;
  const changed = JSON.stringify(draft) !== JSON.stringify(base);
  const valid = Object.keys(localErrors).length === 0 && reasonLength >= REASON_MIN && changed;
  const paths = new Set(spec.fields.map((f) => f.path));
  const topError = apiError && (!apiError.field || !paths.has(apiError.field)) ? apiError : null;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{spec.title}</DialogTitle>
          {spec.description && <DialogDescription>{spec.description}</DialogDescription>}
        </DialogHeader>
        <form
          id="pricing-dialog"
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) save.mutate({ policy: draft.policy, limits: draft.limits, reason: reason.trim() });
          }}
        >
          {spec.body}
          {topError && (
            <p role="alert" className="text-destructive flex items-start gap-1.5 text-[13px] leading-snug">
              <WarningCircle weight="fill" className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                {topError.field && topError.field !== "reason" ? `${fieldLabel(topError.field)}: ` : ""}
                {topError.message}
              </span>
            </p>
          )}

          {spec.fields.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {spec.fields.map((f) => {
                const error = localErrors[f.path] ?? (apiError?.field === f.path ? apiError.message : null);
                const id = `pf-${f.path.replace(/\./g, "-")}`;
                return (
                  <div key={f.path} className={cn("space-y-1", (f.wide || f.kind === "switch") && "sm:col-span-2")}>
                    {f.kind === "switch" ? (
                      <div className="flex items-center justify-between gap-3">
                        <Label htmlFor={id} className="text-xs font-medium">
                          {f.label}
                        </Label>
                        <Switch id={id} checked={getField(draft, f.path) === true} onCheckedChange={(v) => update(f.path, v)} />
                      </div>
                    ) : (
                      <Label htmlFor={id} className="text-xs font-medium">
                        {f.label}
                      </Label>
                    )}
                    {f.kind === "period" ? (
                      <Select value={getField(draft, f.path) as QuotaPeriod} onValueChange={(v) => update(f.path, v)}>
                        <SelectTrigger id={id} className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="WEEK">Por semana</SelectItem>
                          <SelectItem value="MONTH">Por mês</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : f.kind === "switch" ? null : (
                      <div className="relative">
                        {f.kind === "money" && (
                          <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">R$</span>
                        )}
                        <Input
                          id={id}
                          type={f.kind === "date-start" || f.kind === "date-end" ? "date" : "text"}
                          inputMode={f.kind === "money" ? "decimal" : f.kind === "int" ? "numeric" : undefined}
                          value={raw[f.path] ?? ""}
                          placeholder={f.placeholder}
                          onChange={(e) => onText(f, e.target.value)}
                          className={cn(f.kind === "money" && "pl-9", f.kind !== "text" && "tabular-nums")}
                          aria-invalid={!!error}
                          aria-describedby={error || f.hint ? `${id}-hint` : undefined}
                        />
                      </div>
                    )}
                    {(error || f.hint) && (
                      <p id={`${id}-hint`} className={cn("text-[11px] leading-snug", error ? "text-destructive" : "text-muted-foreground")}>
                        {error ?? f.hint}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="pf-reason" className="text-xs font-medium">
              Motivo (obrigatório)
            </Label>
            <Textarea
              id="pf-reason"
              value={reason}
              maxLength={REASON_MAX}
              onChange={(e) => {
                setReason(e.target.value);
                if (apiError?.field === "reason") setApiError(null);
              }}
              placeholder="Ex.: teste de preço do Max depois da Black Friday"
              aria-invalid={apiError?.field === "reason"}
            />
            <p className={cn("text-[11px] leading-snug", apiError?.field === "reason" ? "text-destructive" : "text-muted-foreground")}>
              {apiError?.field === "reason" ? apiError.message : "Fica no histórico, com seu nome e a data."}
            </p>
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="pricing-dialog" variant={spec.destructive ? "destructive" : "default"} disabled={!valid || save.isPending}>
            {save.isPending && <CircleNotch className="size-4 animate-spin" aria-hidden />}
            {spec.confirmLabel ?? "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
