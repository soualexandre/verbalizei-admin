"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import type { AdminOrgBilling, CreatedOrgInvoice, OrgInvoice, OrgInvoiceStatus } from "@/lib/types";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const INVOICE_MAX_BYTES = 5 * 1024 * 1024;

/** Contrato e nota fiscal da empresa: dados da nota (só leitura), preço combinado, aceite e notas anexadas. */
export function OrgBillingSection({ orgId, orgName }: { orgId: string; orgName: string }) {
  const qc = useQueryClient();
  const [attaching, setAttaching] = useState(false);
  const [toggling, setToggling] = useState<OrgInvoice | null>(null);

  const billing = useQuery({
    queryKey: ["organizations", orgId, "billing"],
    queryFn: () => api.get<AdminOrgBilling>(`/admin/organizations/${orgId}/billing`),
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
              <PriceCard orgId={orgId} data={billing.data} />
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

function PriceCard({ orgId, data }: { orgId: string; data: AdminOrgBilling }) {
  const qc = useQueryClient();
  const [value, setValue] = useState(centsToBrlInput(data.monthlyPriceCents));
  useEffect(() => setValue(centsToBrlInput(data.monthlyPriceCents)), [data.monthlyPriceCents]);

  const cents = parseBrlToCents(value);
  const invalid = cents !== null && (Number.isNaN(cents) || cents > 100_000_000);
  const changed = !invalid && cents !== data.monthlyPriceCents;

  const save = useMutation({
    mutationFn: () => api.patch(`/admin/organizations/${orgId}`, { monthlyPriceCents: cents }),
    onSuccess: () => {
      toast.success(cents === null ? "Preço tirado do contrato." : `Preço salvo: ${formatCents(cents)} por mês.`);
      qc.invalidateQueries({ queryKey: ["organizations", orgId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não deu para salvar o preço."),
  });

  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <Label htmlFor="org-price" className="text-sm font-semibold">Preço mensal combinado</Label>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (changed) save.mutate();
          }}
        >
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
        </form>
        <p className={invalid ? "text-destructive text-xs" : "text-muted-foreground text-xs"}>
          {invalid ? "Escreva o valor em reais, como 990 ou 990,00." : "Aparece no contrato que o dono da empresa aceita no portal. Vazio tira o preço."}
        </p>
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
