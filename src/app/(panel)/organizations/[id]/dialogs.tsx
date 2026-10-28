"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { ROLE_LABEL, dateInputToIso, isoToDateInput, personToast } from "@/lib/organizations";
import type { AdminOrganizationDetail, OrgPersonResult, OrgRole } from "@/lib/types";
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

/** Nome, meta, assentos, validade e se o acesso está ativo ou pausado. */
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

  useEffect(() => {
    if (!open) return;
    setName(org.name);
    setGoal(String(org.weeklyGoal));
    setSeats(String(org.seats));
    setUntil(isoToDateInput(org.activeUntil));
    setActive(org.status === "ACTIVE");
  }, [open, org]);

  const mutation = useMutation({
    mutationFn: () =>
      api.patch(`/admin/organizations/${org.id}`, {
        name: name.trim(),
        weeklyGoal: Number(goal),
        seats: Number(seats),
        activeUntil: dateInputToIso(until),
        status: active ? "ACTIVE" : "PAUSED",
      }),
    onSuccess: () => {
      toast.success("Empresa atualizada.");
      onSaved();
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não deu para salvar."),
  });
  const valid = name.trim().length >= 2 && Number(seats) >= 1 && Number(goal) >= 1 && Number(goal) <= 14;

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
