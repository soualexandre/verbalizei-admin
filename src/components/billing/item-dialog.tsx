"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { BillingItem } from "@/lib/billing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useMoney } from "@/components/billing/money";

type Kind = "FIXED" | "USAGE";

interface Form {
  name: string;
  provider: string;
  kind: Kind;
  monthlyUsd: string;
  source: "ai-usage" | "audio-minutes" | "google-tts";
  usageProvider: string;
  usageFeature: string;
  usdPerUnit: string;
  quotaUnits: string;
  unitType: string;
  alertPct: string;
  active: boolean;
  notes: string;
}

const toForm = (i: BillingItem | null, kind: Kind): Form => ({
  name: i?.name ?? "",
  provider: i?.provider ?? "",
  kind: i?.kind ?? kind,
  monthlyUsd: i?.kind === "FIXED" ? String(i.spentUsd || "") : i?.budgetUsd != null ? String(i.budgetUsd) : "",
  source: (i?.source as Form["source"]) ?? "ai-usage",
  usageProvider: i?.usageProvider ?? "",
  usageFeature: i?.usageFeature ?? "",
  usdPerUnit: i?.usdPerUnit != null ? String(i.usdPerUnit) : "",
  quotaUnits: i?.quotaUnits != null ? String(i.quotaUnits) : "",
  unitType: i?.unitType ?? "",
  alertPct: String(i?.alertPct ?? 80),
  active: i?.active ?? true,
  notes: i?.notes ?? "",
});

const n = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));

function Field({ label, hint, children, className }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1", className)}>
      <Label className="text-xs font-medium">{label}</Label>
      {children}
      {hint && <p className="text-muted-foreground text-[11px] leading-snug">{hint}</p>}
    </div>
  );
}

/** Criar ou editar um custo: fixo (valor do mês) ou por uso (cota, orçamento e aviso). */
export function ItemDialog({
  open,
  onOpenChange,
  item,
  kind = "FIXED",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item: BillingItem | null;
  kind?: Kind;
}) {
  // O provedor cobra em dólar: o campo segue em US$, com o valor em real embaixo.
  const money = useMoney();
  const inBrl = (raw: string, digits = 2) => {
    const n = Number(raw.replace(",", "."));
    return money.rate && raw.trim() && Number.isFinite(n) ? `≈ ${money(n, digits)}` : undefined;
  };
  const qc = useQueryClient();
  const [f, setF] = useState<Form>(() => toForm(item, kind));
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));
  const usage = f.kind === "USAGE";

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name: f.name,
        provider: f.provider,
        kind: f.kind,
        monthlyUsd: n(f.monthlyUsd),
        source: usage ? f.source : undefined,
        usageProvider: usage && f.source === "ai-usage" ? f.usageProvider || null : usage && f.source === "google-tts" ? "google" : null,
        usageFeature: usage && f.source === "ai-usage" ? f.usageFeature || null : usage && f.source === "google-tts" ? "tts" : null,
        usdPerUnit: usage && f.source === "audio-minutes" ? n(f.usdPerUnit) : null,
        quotaUnits: usage ? n(f.quotaUnits) : null,
        unitType: usage ? f.unitType || null : null,
        alertPct: Number(f.alertPct) || 80,
        active: f.active,
        notes: f.notes || null,
      };
      return item ? api.patch(`/admin/billing/items/${item.id}`, body) : api.post("/admin/billing/items", body);
    },
    onSuccess: () => {
      toast.success(item ? "Custo atualizado." : "Custo criado.");
      qc.invalidateQueries({ queryKey: ["billing"] });
      qc.invalidateQueries({ queryKey: ["admin-notifications"] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não deu certo."),
  });

  const remove = useMutation({
    mutationFn: () => api.delete(`/admin/billing/items/${item!.id}`),
    onSuccess: () => {
      toast.success("Custo removido.");
      qc.invalidateQueries({ queryKey: ["billing"] });
      qc.invalidateQueries({ queryKey: ["admin-notifications"] });
      onOpenChange(false);
    },
  });

  const valid = f.name.trim() && f.provider.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{item ? "Editar custo" : "Novo custo"}</DialogTitle>
        </DialogHeader>
        <form
          className="grid grid-cols-2 gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) save.mutate();
          }}
        >
          {!item && (
            <div className="bg-muted col-span-2 grid grid-cols-2 gap-0.5 rounded-lg p-0.5" role="radiogroup" aria-label="Tipo">
              {(["FIXED", "USAGE"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={f.kind === k}
                  onClick={() => set("kind", k)}
                  className={cn("h-7 rounded-md text-[13px] font-medium", f.kind === k ? "bg-card shadow-sm" : "text-muted-foreground")}
                >
                  {k === "FIXED" ? "Fixo por mês" : "Por uso (API)"}
                </button>
              ))}
            </div>
          )}
          <Field label="Nome" className="col-span-2">
            <Input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Servidor (OCI)" required />
          </Field>
          <Field label="Provedor">
            <Input value={f.provider} onChange={(e) => set("provider", e.target.value)} placeholder="oci" required />
          </Field>
          <Field label={usage ? "Orçamento do mês (US$)" : "Valor do mês (US$)"} hint={inBrl(f.monthlyUsd)}>
            <Input inputMode="decimal" value={f.monthlyUsd} onChange={(e) => set("monthlyUsd", e.target.value)} placeholder="0,00" />
          </Field>

          {usage && (
            <>
              <Field label="Consumo vem de" className="col-span-2">
                <select
                  value={f.source}
                  onChange={(e) => set("source", e.target.value as Form["source"])}
                  className="border-input bg-card h-9 w-full rounded-lg border px-2.5 text-[13px]"
                >
                  <option value="ai-usage">Chamadas registradas pela API</option>
                  <option value="audio-minutes">Minutos de áudio analisados</option>
                  <option value="google-tts">Google TTS: custo real (preço e cota grátis da API do Google)</option>
                </select>
              </Field>
              {f.source === "google-tts" ? (
                <p className="text-muted-foreground col-span-2 text-xs">
                  Conta só a voz gerada no Google (o cache não custa), por tipo de voz, e desconta a cota grátis do mês. O preço vem do catálogo do Google.
                </p>
              ) : f.source === "ai-usage" ? (
                <>
                  <Field label="Filtro: provedor" hint="Como a API grava (google, openrouter…)">
                    <Input value={f.usageProvider} onChange={(e) => set("usageProvider", e.target.value)} placeholder="google" />
                  </Field>
                  <Field label="Filtro: uso" hint="Vazio = todos (tts, participant-turn…)">
                    <Input value={f.usageFeature} onChange={(e) => set("usageFeature", e.target.value)} placeholder="tts" />
                  </Field>
                </>
              ) : (
                <Field label="US$ por minuto" className="col-span-2" hint={inBrl(f.usdPerUnit, 4)}>
                  <Input inputMode="decimal" value={f.usdPerUnit} onChange={(e) => set("usdPerUnit", e.target.value)} placeholder="0,0043" />
                </Field>
              )}
              <Field label="Cota do mês">
                <Input inputMode="numeric" value={f.quotaUnits} onChange={(e) => set("quotaUnits", e.target.value)} placeholder="4000000" />
              </Field>
              <Field label="Unidade">
                <select
                  value={f.unitType}
                  onChange={(e) => set("unitType", e.target.value)}
                  className="border-input bg-card h-9 w-full rounded-lg border px-2.5 text-[13px]"
                >
                  <option value="">—</option>
                  <option value="chars">caracteres</option>
                  <option value="tokens">tokens</option>
                  <option value="minutes">minutos</option>
                  <option value="calls">chamadas</option>
                </select>
              </Field>
              <Field label="Avisar a partir de (%)">
                <Input inputMode="numeric" value={f.alertPct} onChange={(e) => set("alertPct", e.target.value)} />
              </Field>
            </>
          )}

          <Field label="Nota" className="col-span-2">
            <Input value={f.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Plano, conta, vencimento…" />
          </Field>
          <label className="col-span-2 flex items-center gap-2 text-[13px]">
            <Switch checked={f.active} onCheckedChange={(v) => set("active", v)} />
            Contar este custo
          </label>

          <DialogFooter className="col-span-2 mt-1 flex-row items-center gap-2 sm:justify-between">
            {item ? (
              <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => remove.mutate()} disabled={remove.isPending}>
                Remover
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!valid || save.isPending}>
                Salvar
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
