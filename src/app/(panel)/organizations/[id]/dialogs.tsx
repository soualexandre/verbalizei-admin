"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { KIND_LABEL, ROLE_LABEL, copyResultText, dateInputToIso, isoToDateInput, personToast } from "@/lib/organizations";
import type {
  AdminOrganizationDetail,
  AdminOrganizationSummary,
  CopyScenariosResult,
  OrgKind,
  OrgPersonResult,
  OrgRole,
} from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ROLE_HELP: Record<OrgRole, string> = {
  OWNER: "Administra a empresa no portal. Só há um dono: o atual vira gestor.",
  MANAGER: "Vê o painel e administra o time no portal.",
  MEMBER: "Treina os cenários da empresa no app. Não entra no portal.",
};

/** Pôr alguém no time: sem conta, a API cria e manda o "defina sua senha"; gestor e dono recebem as boas-vindas do portal. */
export function AddMemberDialog({
  org,
  open,
  onOpenChange,
  onSaved,
}: {
  org: AdminOrganizationDetail;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<OrgRole>("MANAGER");

  useEffect(() => {
    if (open) { setEmail(""); setName(""); setRole("MANAGER"); }
  }, [open]);

  const mutation = useMutation({
    mutationFn: () =>
      api.post<OrgPersonResult>(`/admin/organizations/${org.id}/members`, {
        email: email.trim(),
        ...(name.trim() && { name: name.trim() }),
        role,
      }),
    onSuccess: (r) => {
      toast.success(personToast(r, name.trim() || email.trim(), role), { duration: 8000 });
      onSaved();
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não deu para pôr no time."),
  });
  const valid = /\S+@\S+\.\S+/.test(email.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Pôr no time da {org.name}</DialogTitle>
          <DialogDescription>Se o e-mail ainda não tiver conta, a gente cria e manda o link para definir a senha.</DialogDescription>
        </DialogHeader>
        <form id="por-no-time" className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (valid) mutation.mutate(); }}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="m-email">E-mail</Label>
              <Input id="m-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="pessoa@empresa.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="m-name">Nome</Label>
              <Input id="m-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Opcional se já tem conta" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Papel</Label>
            <Select value={role} onValueChange={(v) => setRole(v as OrgRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["MANAGER", "MEMBER", "OWNER"] as const).map((r) => (
                  <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">{ROLE_HELP[role]}</p>
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="submit" form="por-no-time" disabled={!valid || mutation.isPending}>
            {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
            Pôr no time
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Nome, tipo, parceiro, meta, assentos, validade e se o acesso está ativo ou pausado. */
export function EditOrganizationDialog({
  org,
  open,
  onOpenChange,
  onSaved,
}: {
  org: AdminOrganizationDetail;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(org.name);
  const [goal, setGoal] = useState(String(org.weeklyGoal));
  const [seats, setSeats] = useState(String(org.seats));
  const [until, setUntil] = useState(isoToDateInput(org.activeUntil));
  const [active, setActive] = useState(org.status === "ACTIVE");
  const [kind, setKind] = useState<OrgKind>(org.kind ?? "COMPANY");
  const [partner, setPartner] = useState(org.partnerName ?? "");

  useEffect(() => {
    if (!open) return;
    setName(org.name);
    setGoal(String(org.weeklyGoal));
    setSeats(String(org.seats));
    setUntil(isoToDateInput(org.activeUntil));
    setActive(org.status === "ACTIVE");
    setKind(org.kind ?? "COMPANY");
    setPartner(org.partnerName ?? "");
  }, [open, org]);

  const mutation = useMutation({
    mutationFn: () =>
      api.patch(`/admin/organizations/${org.id}`, {
        name: name.trim(),
        weeklyGoal: Number(goal),
        seats: Number(seats),
        activeUntil: dateInputToIso(until),
        status: active ? "ACTIVE" : "PAUSED",
        kind,
        partnerName: partner.trim(),
      }),
    onSuccess: () => {
      toast.success("Empresa atualizada.");
      onSaved();
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não deu para salvar."),
  });
  const valid = name.trim().length >= 2 && Number(seats) >= 1 && Number(goal) >= 1 && Number(goal) <= 14 && partner.trim().length <= 80;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar empresa</DialogTitle>
          <DialogDescription>Mudanças de validade e de acesso valem na hora para todo o time.</DialogDescription>
        </DialogHeader>
        <form id="editar-empresa" className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (valid) mutation.mutate(); }}>
          <div className="space-y-2">
            <Label htmlFor="e-name">Nome</Label>
            <Input id="e-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as OrgKind)}>
                <SelectTrigger aria-label="Tipo"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["COMPANY", "GROUP"] as const).map((k) => (
                    <SelectItem key={k} value={k}>{KIND_LABEL[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">{kind === "GROUP" ? "Turma não vira Premium: os cenários dela abrem sem gastar a cota." : "O time treina como Premium até a validade."}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="e-partner">Parceiro (método)</Label>
              <Input id="e-partner" value={partner} maxLength={80} onChange={(e) => setPartner(e.target.value)} placeholder="Sem parceiro" />
              <p className="text-muted-foreground text-xs">Vazio tira o parceiro do certificado.</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="e-seats">Assentos</Label>
              <Input id="e-seats" type="number" min={1} max={5000} value={seats} onChange={(e) => setSeats(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="e-goal">Meta semanal</Label>
              <Input id="e-goal" type="number" min={1} max={14} value={goal} onChange={(e) => setGoal(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="e-until">Válida até</Label>
              <Input id="e-until" type="date" value={until} onChange={(e) => setUntil(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label htmlFor="e-active">Acesso ativo</Label>
              <p className="text-muted-foreground text-xs">Pausado, o time deixa de ver os cenários e volta ao plano pessoal.</p>
            </div>
            <Switch id="e-active" checked={active} onCheckedChange={setActive} />
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="submit" form="editar-empresa" disabled={!valid || mutation.isPending}>
            {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Copiar os cenários ativos de outra empresa (o método do parceiro). Rascunho por
 * padrão, para o gestor revisar e publicar; o que já existe com o mesmo título é pulado.
 */
export function CopyScenariosDialog({
  org,
  open,
  onOpenChange,
  onCopied,
}: {
  org: AdminOrganizationDetail;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCopied: () => void;
}) {
  const [sourceId, setSourceId] = useState("");
  const [as, setAs] = useState<"DRAFT" | "ACTIVE">("DRAFT");
  const [result, setResult] = useState<CopyScenariosResult | null>(null);

  useEffect(() => {
    if (open) { setSourceId(""); setAs("DRAFT"); setResult(null); }
  }, [open]);

  const { data, isLoading } = useQuery({
    queryKey: ["organizations"],
    queryFn: () => api.get<{ items: AdminOrganizationSummary[] }>("/admin/organizations"),
    enabled: open,
  });
  const sources = (data?.items ?? []).filter((o) => o.id !== org.id);
  const source = sources.find((o) => o.id === sourceId);

  const mutation = useMutation({
    mutationFn: () =>
      api.post<CopyScenariosResult>(`/admin/organizations/${org.id}/scenarios/copy-from/${sourceId}`, { activate: as === "ACTIVE" }),
    onSuccess: (r) => {
      setResult(r);
      onCopied();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não deu para copiar os cenários."),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Copiar cenários para a {org.name}</DialogTitle>
          <DialogDescription>
            Traz os cenários ativos de outra empresa, com objetivos, régua e pessoas da sala. O que já existe aqui com o mesmo título fica de fora.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <p className="text-sm" role="status">{copyResultText(result)}</p>
        ) : (
          <form id="copiar-cenarios" className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (sourceId) mutation.mutate(); }}>
            <div className="space-y-2">
              <Label>Copiar de</Label>
              <Select value={sourceId} onValueChange={setSourceId} disabled={isLoading}>
                <SelectTrigger aria-label="Empresa de origem"><SelectValue placeholder={isLoading ? "Carregando…" : "Escolha a empresa"} /></SelectTrigger>
                <SelectContent>
                  {sources.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name} · {o.scenarios === 1 ? "1 cenário" : `${o.scenarios} cenários`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!isLoading && sources.length === 0 && <p className="text-muted-foreground text-xs">Não há outra empresa para copiar.</p>}
            </div>
            <div className="space-y-2">
              <Label>Como chegam</Label>
              <Select value={as} onValueChange={(v) => setAs(v as "DRAFT" | "ACTIVE")}>
                <SelectTrigger aria-label="Como chegam"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Como rascunho</SelectItem>
                  <SelectItem value="ACTIVE">Já ativos</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                {as === "DRAFT" ? "O gestor revisa e publica no portal. O time só vê depois." : "O time já vê os cenários no app."}
              </p>
            </div>
            {source && (
              <p className="text-muted-foreground text-sm">
                Vai copiar os cenários ativos da {source.name} para a {org.name}, {as === "DRAFT" ? "como rascunho" : "já ativos"}.
              </p>
            )}
          </form>
        )}

        <DialogFooter>
          {result ? (
            <Button onClick={() => onOpenChange(false)}>Fechar</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" form="copiar-cenarios" disabled={!sourceId || mutation.isPending}>
                {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
                Copiar cenários
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
