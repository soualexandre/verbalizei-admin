"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { dateInputToIso, personToast } from "@/lib/organizations";
import type { OrgPersonResult } from "@/lib/types";
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

/**
 * Nova empresa com o gestor (dono). Sem conta, a API cria e manda o e-mail de
 * definir a senha; o gestor recebe as boas-vindas com o link do portal.
 */
export function NewOrganizationDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [seats, setSeats] = useState("30");
  const [until, setUntil] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      api.post<{ id: string } & OrgPersonResult>("/admin/organizations", {
        name: name.trim(),
        ownerEmail: ownerEmail.trim(),
        ...(ownerName.trim() && { ownerName: ownerName.trim() }),
        seats: Number(seats) || 30,
        ...(until && { activeUntil: dateInputToIso(until) }),
      }),
    onSuccess: (r) => {
      toast.success(`Empresa criada. ${personToast(r, ownerName.trim() || ownerEmail.trim(), "OWNER")}`, { duration: 8000 });
      qc.invalidateQueries({ queryKey: ["organizations"] });
      onOpenChange(false);
      router.push(`/organizations/${r.id}`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não deu para criar a empresa."),
  });

  const valid = name.trim().length >= 2 && /\S+@\S+\.\S+/.test(ownerEmail.trim()) && Number(seats) >= 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova empresa</DialogTitle>
          <DialogDescription>
            O gestor vira dono da empresa e acompanha o time no portal. Se o e-mail ainda não tiver conta, a gente cria e manda o link para definir a senha.
          </DialogDescription>
        </DialogHeader>

        <form
          id="nova-empresa"
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) mutation.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="org-name">Nome da empresa</Label>
            <Input id="org-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Clínica Sorriso" required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="org-owner-email">E-mail do gestor</Label>
              <Input id="org-owner-email" type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} placeholder="gestor@empresa.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-owner-name">Nome do gestor</Label>
              <Input id="org-owner-name" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Opcional se já tem conta" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="org-seats">Assentos</Label>
              <Input id="org-seats" type="number" min={1} max={5000} value={seats} onChange={(e) => setSeats(e.target.value)} />
              <p className="text-muted-foreground text-xs">Quantas pessoas do time (o dono não conta).</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-until">Válida até</Label>
              <Input id="org-until" type="date" value={until} onChange={(e) => setUntil(e.target.value)} />
              <p className="text-muted-foreground text-xs">Vazio = sem validade. No piloto, 60 dias.</p>
            </div>
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="submit" form="nova-empresa" disabled={!valid || mutation.isPending}>
            {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
            Criar empresa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
