"use client";

import { useEffect, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FilePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
  BILLING_FIELD_LABEL,
  centsToBrlInput,
  dateInputToNoonIso,
  defaultInvoiceDescription,
  formatCents,
  formatCnpj,
  isoToDateInput,
  parseBrlToCents,
} from "@/lib/organizations";
import type {
  AdminOrgBilling,
  AdminOrganizationDetail,
  BillingCycle,
  BusinessPlanKey,
  CreatedOrgInvoice,
  OrgInvoice,
  OrgInvoiceStatus,
  OrgQuote,
} from "@/lib/types";
import { BUSINESS_PLAN_NAME, BUSINESS_PLANS, CYCLE_LABEL } from "@/lib/pricing";
import { formatDate } from "@/lib/utils";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ErrorState } from "@/components/error-state";
import { Section } from "@/components/page-hero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QuoteSummary } from "@/components/pricing/quote-summary";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const INVOICE_MAX_BYTES = 5 * 1024 * 1024;

/** Valor do select para "sem plano da tabela" (o Radix não aceita valor vazio). */
const NO_PLAN = "NONE";

/** Contrato e nota fiscal da empresa: dados da nota (só leitura), preço combinado, aceite e notas anexadas. */
export function OrgBillingSection({ orgId, orgName }: { orgId: string; orgName: string }) {
  const qc = useQueryClient();
  const [attaching, setAttaching] = useState(false);
  const [toggling, setToggling] = useState<OrgInvoice | null>(null);

  const billing = useQuery({
    queryKey: ["organizations", orgId, "billing"],
    queryFn: () => api.get<AdminOrgBilling>(`/admin/organizations/${orgId}/billing`),
  });
  // O mesmo detalhe que a página já carregou (plano da tabela, pessoas, parceiro).
  const org = useQuery({
    queryKey: ["organizations", orgId],
    queryFn: () => api.get<AdminOrganizationDetail>(`/admin/organizations/${orgId}`),
  });
  const invoices = useQuery({
    queryKey: ["organizations", orgId, "invoices"],
    queryFn: () => api.get<{ items: OrgInvoice[] }>(`/admin/organizations/${orgId}/invoices`),
  });

  const setStatus = useMutation({
    mutationFn: ({ inv, status }: { inv: OrgInvoice; status: OrgInvoiceStatus }) =>
      api.patch<OrgInvoice>(`/admin/organizations/${orgId}/invoices/${inv.id}`, { status }),
    onSuccess: (r) => {
      toast.success(r.status === "CANCELED" ? `Nota ${r.number} cancelada.` : `Nota ${r.number} reativada.`);
      qc.invalidateQueries({ queryKey: ["organizations", orgId, "invoices"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não deu certo."),
  });

  return (
    <>
      <Section
        title="Contrato e nota fiscal"
        description="Os dados da nota são preenchidos pelo gestor no portal. Aqui o admin só define o preço e anexa as notas."
      >
        {billing.isError ? (
          <ErrorState title="Não deu para carregar o contrato" error={billing.error} onRetry={() => billing.refetch()} />
        ) : !billing.data ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <BillingDataCard data={billing.data} />
            <div className="space-y-4">
              <PriceCard
                // Recomeça o formulário quando o salvo muda.
                key={`${billing.data.monthlyPriceCents}-${org.data?.pricingPlan ?? "none"}-${org.data?.billingCycle ?? "none"}-${!!org.data}`}
                orgId={orgId}
                data={billing.data}
                org={org.data}
              />
              <ContractCard data={billing.data} />
            </div>
          </div>
        )}
      </Section>

      <Section
        title="Notas fiscais"
        description="O PDF da NFS-e emitida no emissor da prefeitura. O gestor baixa no portal e o e-mail da nota recebe o aviso."
        aside={
          <Button variant="outline" onClick={() => setAttaching(true)}>
            <FilePlus className="size-4" /> Anexar nota fiscal
          </Button>
        }
      >
        {invoices.isError ? (
          <ErrorState title="Não deu para carregar as notas" error={invoices.error} onRetry={() => invoices.refetch()} />
        ) : (
          <Card>
            <CardContent className="pt-6">
              {!invoices.data ? (
                <Skeleton className="h-24" />
              ) : invoices.data.items.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nenhuma nota anexada ainda.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Emissão</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Situação</TableHead>
                      <TableHead className="w-28" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.data.items.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium tabular-nums">{inv.number}</TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(inv.issuedAt)}</TableCell>
                        <TableCell>
                          {inv.description}
                          {(inv.periodFrom || inv.periodTo) && (
                            <p className="text-muted-foreground text-xs">
                              Período: {formatDate(inv.periodFrom)} a {formatDate(inv.periodTo)}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatCents(inv.amountCents)}</TableCell>
                        <TableCell>
                          <Badge variant={inv.status === "CANCELED" ? "secondary" : "success"}>
                            {inv.status === "CANCELED" ? "Cancelada" : "Emitida"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              // Link assinado de 10 min; abre a aba antes do await para o bloqueador de pop-up não barrar.
                              const tab = window.open("", "_blank");
                              try {
                                const { url } = await api.get<{ url: string }>(`/admin/organizations/${orgId}/invoices/${inv.id}/file`);
                                if (tab) tab.location.href = url;
                                else window.location.href = url;
                              } catch {
                                tab?.close();
                              }
                            }}
                          >
                            Baixar PDF
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setToggling(inv)}>
                            {inv.status === "CANCELED" ? "Reativar" : "Cancelar"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </Section>

      <AttachInvoiceDialog
        orgId={orgId}
        orgName={orgName}
        priceCents={billing.data?.monthlyPriceCents ?? null}
        open={attaching}
        onOpenChange={setAttaching}
      />

      <ConfirmDialog
        open={toggling !== null}
        onOpenChange={(o) => !o && setToggling(null)}
        title={toggling?.status === "CANCELED" ? `Reativar a nota ${toggling.number}?` : `Cancelar a nota ${toggling?.number ?? ""}?`}
        description={
          toggling?.status === "CANCELED"
            ? "A nota volta a aparecer como emitida no portal da empresa."
            : "A nota passa a aparecer como cancelada no portal. Cancele também no emissor da prefeitura."
        }
        confirmLabel={toggling?.status === "CANCELED" ? "Reativar" : "Cancelar a nota"}
        variant={toggling?.status === "CANCELED" ? "default" : "destructive"}
        onConfirm={async () => {
          if (toggling) await setStatus.mutateAsync({ inv: toggling, status: toggling.status === "CANCELED" ? "ISSUED" : "CANCELED" });
        }}
      />
    </>
  );
}

function BillingDataCard({ data }: { data: AdminOrgBilling }) {
  const rows: Array<{ label: string; value: string | null }> = [
    { label: BILLING_FIELD_LABEL.legalName, value: data.legalName },
    { label: BILLING_FIELD_LABEL.taxId, value: data.taxId ? formatCnpj(data.taxId) : null },
    { label: BILLING_FIELD_LABEL.billingEmail, value: data.billingEmail },
    { label: BILLING_FIELD_LABEL.billingAddress, value: data.billingAddress },
    { label: BILLING_FIELD_LABEL.municipalRegistration, value: data.municipalRegistration },
  ];
  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Dados da empresa para a nota</h3>
          {data.missing.length > 0 && (
            <Badge variant="warning">Falta: {data.missing.map((k) => BILLING_FIELD_LABEL[k] ?? k).join(", ")}</Badge>
          )}
        </div>
        <dl className="grid gap-3 text-sm">
          {rows.map((r) => (
            <div key={r.label} className="grid gap-0.5 sm:grid-cols-[10rem_1fr] sm:gap-3">
              <dt className="text-muted-foreground">{r.label}</dt>
              <dd className={r.value ? "break-words" : "text-muted-foreground"}>{r.value || "—"}</dd>
            </div>
          ))}
        </dl>
        <p className="text-muted-foreground text-xs">Preenchidos pelo gestor no portal, em Configurações.</p>
      </CardContent>
    </Card>
  );
}

/**
 * Preço da empresa (20/11/2026): o plano da tabela e o ciclo, o orçamento pela
 * tabela atual (aba Preços) e o preço mensal combinado, que o admin pode
 * preencher com o valor calculado ou digitar outro.
 */
function PriceCard({ orgId, data, org }: { orgId: string; data: AdminOrgBilling; org: AdminOrganizationDetail | undefined }) {
  const qc = useQueryClient();
  const savedPlan = org?.pricingPlan ?? NO_PLAN;
  const savedCycle: BillingCycle = org?.billingCycle ?? "ANNUAL";
  const [plan, setPlan] = useState<BusinessPlanKey | typeof NO_PLAN>(savedPlan);
  const [cycle, setCycle] = useState<BillingCycle>(savedCycle);
  const [value, setValue] = useState(centsToBrlInput(data.monthlyPriceCents));

  const cents = parseBrlToCents(value);
  const invalid = cents !== null && (Number.isNaN(cents) || cents > 100_000_000);
  const hasPlan = plan !== NO_PLAN;
  const effectiveCycle: BillingCycle = plan === "PILOTO" ? "MONTHLY" : cycle;
  const planChanged = !!org && plan !== savedPlan;
  const cycleChanged = !!org && hasPlan && effectiveCycle !== (org.billingCycle ?? null);
  const priceChanged = !invalid && cents !== data.monthlyPriceCents;
  const changed = !invalid && (priceChanged || planChanged || cycleChanged);

  const seats = org?.seats ?? 0;
  const params = new URLSearchParams({ plan: hasPlan ? plan : "", cycle: effectiveCycle, seats: String(seats), partner: String(!!org?.partnerName) });
  if (plan === "EMPRESA" && cents != null && !Number.isNaN(cents) && seats > 0) params.set("agreedPerSeat", String(Math.round(cents / seats) / 100));
  const quote = useQuery({
    queryKey: ["pricing", "quote", params.toString()],
    queryFn: () => api.get<OrgQuote>(`/admin/pricing/quote?${params.toString()}`),
    enabled: !!org && hasPlan,
    placeholderData: keepPreviousData,
  });
  const q = hasPlan ? (quote.data?.plan === plan ? quote.data : null) : null;
  const suggestedCents = q?.monthlyTotal != null ? Math.round(q.monthlyTotal * 100) : null;

  const save = useMutation({
    mutationFn: () =>
      api.patch(`/admin/organizations/${orgId}`, {
        ...(priceChanged && { monthlyPriceCents: cents }),
        ...(planChanged && { pricingPlan: hasPlan ? plan : null }),
        ...((planChanged || cycleChanged) && { billingCycle: hasPlan ? effectiveCycle : null }),
      }),
    onSuccess: () => {
      toast.success(
        planChanged
          ? hasPlan
            ? `Plano salvo: ${BUSINESS_PLAN_NAME[plan as BusinessPlanKey]}. O dono precisa aceitar o contrato novo no portal.`
            : "A empresa saiu do plano da tabela."
          : cents === null
            ? "Preço tirado do contrato."
            : `Preço salvo: ${formatCents(cents)} por mês.`,
      );
      qc.invalidateQueries({ queryKey: ["organizations", orgId] });
      qc.invalidateQueries({ queryKey: ["pricing"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não deu para salvar o preço."),
  });

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (changed) save.mutate();
          }}
        >
          {org && (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="org-plan" className="text-xs font-medium">Plano da tabela</Label>
                  <Select value={plan} onValueChange={(v) => setPlan(v as BusinessPlanKey | typeof NO_PLAN)}>
                    <SelectTrigger id="org-plan" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_PLAN}>Sem plano da tabela</SelectItem>
                      {BUSINESS_PLANS.map((k) => (
                        <SelectItem key={k} value={k}>
                          {BUSINESS_PLAN_NAME[k]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {hasPlan && plan !== "PILOTO" && (
                  <div className="space-y-1">
                    <Label htmlFor="org-cycle" className="text-xs font-medium">Ciclo</Label>
                    <Select value={cycle} onValueChange={(v) => setCycle(v as BillingCycle)}>
                      <SelectTrigger id="org-cycle" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ANNUAL">{CYCLE_LABEL.ANNUAL}</SelectItem>
                        <SelectItem value="MONTHLY">{CYCLE_LABEL.MONTHLY}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <p className="text-muted-foreground text-xs">
                Com plano da tabela, a empresa ganha o uso justo de conversas por pessoa e um contrato novo, que o dono precisa aceitar de novo no portal.
              </p>
              {hasPlan && (
                <div className="bg-muted/50 space-y-3 rounded-lg border p-3">
                  {quote.isError ? (
                    <ErrorState bare title="Não deu para calcular pela tabela." error={quote.error} onRetry={() => quote.refetch()} />
                  ) : !q ? (
                    <Skeleton className="h-16" />
                  ) : (
                    <QuoteSummary quote={q} />
                  )}
                  {q && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={suggestedCents == null || suggestedCents === cents}
                      onClick={() => suggestedCents != null && setValue(centsToBrlInput(suggestedCents))}
                    >
                      Usar o valor calculado
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="org-price" className="text-sm font-semibold">Preço mensal combinado</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">R$</span>
                <Input
                  id="org-price"
                  inputMode="decimal"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="990,00"
                  className="pl-9 tabular-nums"
                  aria-invalid={invalid}
                />
              </div>
              <Button type="submit" variant="outline" disabled={!changed || save.isPending}>
                {save.isPending && <Loader2 className="size-4 animate-spin" />}
                Salvar
              </Button>
            </div>
            <p className={invalid ? "text-destructive text-xs" : "text-muted-foreground text-xs"}>
              {invalid
                ? "Escreva o valor em reais, como 990 ou 990,00."
                : "Aparece no contrato que o dono da empresa aceita no portal. Pode ser diferente do calculado. Vazio tira o preço."}
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function ContractCard({ data }: { data: AdminOrgBilling }) {
  const c = data.contract;
  const accepted = c.acceptedVersion && c.acceptedAt;
  return (
    <Card>
      <CardContent className="space-y-2 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Contrato</h3>
          <Badge variant={!accepted ? "secondary" : c.needsAcceptance ? "warning" : "success"}>
            {!accepted ? "Não aceito" : c.needsAcceptance ? "Versão nova pendente" : "Aceito"}
          </Badge>
        </div>
        <p className="text-sm">
          {accepted
            ? `Aceito por ${c.acceptedBy || "o dono"} em ${formatDate(c.acceptedAt)} na versão ${c.acceptedVersion}.`
            : "O dono ainda não aceitou o contrato no portal."}
        </p>
        {accepted && c.needsAcceptance && (
          <p className="text-muted-foreground text-xs">A versão atual é a {c.currentVersion}: o portal pede o aceite de novo.</p>
        )}
        {!accepted && <p className="text-muted-foreground text-xs">Versão atual: {c.currentVersion}. Só o dono aceita, e só com os dados da nota completos.</p>}
      </CardContent>
    </Card>
  );
}

/** Anexar o PDF da nota: vai para o portal e, com e-mail da nota cadastrado, avisa a empresa. */
function AttachInvoiceDialog({
  orgId,
  orgName,
  priceCents,
  open,
  onOpenChange,
}: {
  orgId: string;
  orgName: string;
  priceCents: number | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [number, setNumber] = useState("");
  const [issuedAt, setIssuedAt] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setNumber("");
    setIssuedAt(isoToDateInput(new Date().toISOString()));
    setAmount(centsToBrlInput(priceCents));
    setDescription(defaultInvoiceDescription());
    setPeriodFrom("");
    setPeriodTo("");
  }, [open, priceCents]);

  const cents = parseBrlToCents(amount);
  const fileError = !file
    ? null
    : file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")
      ? "Envie a nota em PDF."
      : file.size > INVOICE_MAX_BYTES
        ? "O PDF pode ter até 5 MB."
        : null;
  const amountError = amount.trim() && (cents === null || Number.isNaN(cents) || cents < 1 || cents > 100_000_000) ? "Escreva o valor em reais, como 990 ou 990,00." : null;
  const periodError = periodFrom && periodTo && periodFrom > periodTo ? "O fim do período vem antes do começo." : null;
  const valid =
    !!file && !fileError && number.trim().length > 0 && !!issuedAt && cents !== null && !amountError && description.trim().length >= 2 && !periodError;

  const create = useMutation({
    mutationFn: () =>
      api.postForm<CreatedOrgInvoice>(`/admin/organizations/${orgId}/invoices`, {
        file,
        number: number.trim(),
        issuedAt: dateInputToNoonIso(issuedAt),
        amountCents: String(cents),
        description: description.trim(),
        periodFrom: dateInputToNoonIso(periodFrom),
        periodTo: dateInputToNoonIso(periodTo),
      }),
    onSuccess: (r) => {
      if (r.emailed) toast.success(`Nota ${r.number} anexada. A empresa recebeu o aviso por e-mail.`);
      else toast.warning(`Nota ${r.number} anexada. Sem e-mail da nota cadastrado: avise a empresa.`, { duration: 10000 });
      qc.invalidateQueries({ queryKey: ["organizations", orgId, "invoices"] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não deu para anexar a nota."),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Anexar nota fiscal da {orgName}</DialogTitle>
          <DialogDescription>O gestor baixa no portal. Com e-mail da nota cadastrado, a empresa recebe o aviso.</DialogDescription>
        </DialogHeader>
        <form
          id="anexar-nota"
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) create.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="inv-file">PDF da nota</Label>
            <Input
              id="inv-file"
              type="file"
              accept="application/pdf,.pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              aria-invalid={!!fileError}
              required
            />
            <p className={fileError ? "text-destructive text-xs" : "text-muted-foreground text-xs"}>{fileError ?? "Só PDF, até 5 MB."}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="inv-number">Número</Label>
              <Input id="inv-number" value={number} onChange={(e) => setNumber(e.target.value)} maxLength={40} placeholder="Ex.: 123" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inv-issued">Data de emissão</Label>
              <Input id="inv-issued" type="date" value={issuedAt} onChange={(e) => setIssuedAt(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="inv-amount">Valor (R$)</Label>
            <Input
              id="inv-amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="990,00"
              className="tabular-nums"
              aria-invalid={!!amountError}
              required
            />
            {amountError && <p className="text-destructive text-xs">{amountError}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="inv-description">Descrição</Label>
            <Input id="inv-description" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="inv-from">Período de (opcional)</Label>
              <Input id="inv-from" type="date" value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inv-to">Até (opcional)</Label>
              <Input id="inv-to" type="date" value={periodTo} onChange={(e) => setPeriodTo(e.target.value)} />
            </div>
          </div>
          {periodError && <p className="text-destructive text-xs">{periodError}</p>}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="submit" form="anexar-nota" disabled={!valid || create.isPending}>
            {create.isPending && <Loader2 className="size-4 animate-spin" />}
            Anexar nota
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
