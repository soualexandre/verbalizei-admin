"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { dateInputInDays, dateInputToIso, personToast } from "@/lib/organizations";
import type { CreateOrganizationResult, OrgPersonResult } from "@/lib/types";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

/** Empresa do Times, turma de estudantes ou empresa de um cliente do parceiro (o parceiro entra como gestor). */
export type NewOrganizationMode = "COMPANY" | "GROUP" | "PARTNER";
type Mode = NewOrganizationMode;

const MODE_HELP: Record<Mode, string> = {
  COMPANY:
    "O gestor vira dono da empresa e acompanha o time no portal. Se o e-mail ainda não tiver conta, a gente cria e manda o link para definir a senha.",
  GROUP:
    "Uma turma de estudantes, com validade curta. Não vira Premium: os cenários da turma abrem sem gastar a cota de cada um. O responsável vira dono.",
  PARTNER:
    "A empresa do cliente de um parceiro. O cliente vira dono e o parceiro entra como gestor. Sem o e-mail do cliente, o parceiro fica como dono.",
};

const EMAIL = /\S+@\S+\.\S+/;

/**
 * Nova empresa, turma ou empresa para parceiro. Sem conta, a API cria e manda o
 * e-mail de definir a senha; dono e gestores recebem as boas-vindas do portal.
 */
export function NewOrganizationDialog({
  open,
  onOpenChange,
  initialMode = "COMPANY",
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initialMode?: Mode;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const [mode, setMode] = useState<Mode>("COMPANY");
  const [name, setName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [seats, setSeats] = useState("30");
  const [until, setUntil] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [partnerEmail, setPartnerEmail] = useState("");
  const [partnerContact, setPartnerContact] = useState("");
  const [challenge, setChallenge] = useState(true);

  useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    setName("");
    setOwnerEmail("");
    setOwnerName("");
    setSeats("30");
    setUntil(initialMode === "GROUP" ? dateInputInDays(14) : "");
    setPartnerName("");
    setPartnerEmail("");
    setPartnerContact("");
    setChallenge(true);
  }, [open, initialMode]);

  const changeMode = (m: Mode) => {
    setMode(m);
    // Turma tem validade curta: sugere 14 dias, editável.
    if (m === "GROUP" && !until) setUntil(dateInputInDays(14));
  };

  const isGroup = mode === "GROUP";
  const isPartner = mode === "PARTNER";
  const clientEmail = ownerEmail.trim();
  const pEmail = partnerEmail.trim();
  // No modo parceiro, sem o e-mail do cliente, o parceiro é o dono e a 2ª chamada não acontece.
  const owner = isPartner ? clientEmail || pEmail : clientEmail;
  const partnerAsManager = isPartner && !!clientEmail && clientEmail.toLowerCase() !== pEmail.toLowerCase();

  const mutation = useMutation({
    mutationFn: async () => {
      const created = await api.post<CreateOrganizationResult>("/admin/organizations", {
        name: name.trim(),
        ownerEmail: owner,
        ...(isPartner
          ? clientEmail && ownerName.trim()
            ? { ownerName: ownerName.trim() }
            : !clientEmail && partnerContact.trim()
              ? { ownerName: partnerContact.trim() }
              : {}
          : ownerName.trim() && { ownerName: ownerName.trim() }),
        seats: Number(seats) || 30,
        ...(until && { activeUntil: dateInputToIso(until) }),
        kind: isGroup ? "GROUP" : "COMPANY",
        ...(partnerName.trim() && { partnerName: partnerName.trim() }),
        ...(isGroup && { challenge }),
      });
      let partner: OrgPersonResult | null = null;
      let partnerError: string | null = null;
      if (partnerAsManager) {
        try {
          partner = await api.post<OrgPersonResult>(`/admin/organizations/${created.id}/members`, {
            email: pEmail,
            ...(partnerContact.trim() && { name: partnerContact.trim() }),
            role: "MANAGER",
          });
        } catch (e) {
          partnerError = e instanceof Error ? e.message : "erro desconhecido";
        }
      }
      return { created, partner, partnerError };
    },
    onSuccess: ({ created, partner, partnerError }) => {
      const what = created.kind === "GROUP" ? "Turma criada." : "Empresa criada.";
      const ownerWho = (isPartner && !clientEmail ? partnerContact.trim() : ownerName.trim()) || owner;
      toast.success(`${what} ${personToast(created, ownerWho, "OWNER")}`, { duration: 8000 });
      if (created.kind === "GROUP" && isGroup && challenge) {
        if (created.challengeId) toast.success("O Desafio de 14 dias já está aberto na turma.", { duration: 8000 });
        else toast.warning(`A turma foi criada, mas o Desafio de 14 dias não abriu: ${created.challengeError ?? "motivo não informado"}. O responsável pode abrir pelo portal.`, { duration: 15000 });
      }
      if (partner) toast.success(`Parceiro como gestor. ${personToast(partner, partnerContact.trim() || pEmail, "MANAGER")}`, { duration: 8000 });
      if (partnerError) toast.error(`A empresa foi criada, mas o parceiro não entrou como gestor: ${partnerError}. Ponha pelo "Pôr no time".`, { duration: 15000 });
      qc.invalidateQueries({ queryKey: ["organizations"] });
      onOpenChange(false);
      router.push(`/organizations/${created.id}`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : isGroup ? "Não deu para criar a turma." : "Não deu para criar a empresa."),
  });

  const valid =
    name.trim().length >= 2 &&
    Number(seats) >= 1 &&
    partnerName.trim().length <= 80 &&
    (isPartner
      ? EMAIL.test(pEmail) && partnerName.trim().length >= 2 && (!clientEmail || EMAIL.test(clientEmail))
      : EMAIL.test(clientEmail));

  const title = isGroup ? "Nova turma" : isPartner ? "Empresa para parceiro" : "Nova empresa";
  const submit = isGroup ? "Criar turma" : "Criar empresa";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{MODE_HELP[mode]}</DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => changeMode(v as Mode)}>
          <TabsList aria-label="O que criar">
            <TabsTrigger value="COMPANY">Empresa</TabsTrigger>
            <TabsTrigger value="GROUP">Turma</TabsTrigger>
            <TabsTrigger value="PARTNER">Para parceiro</TabsTrigger>
          </TabsList>
        </Tabs>

        <form
          id="nova-empresa"
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) mutation.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="org-name">{isGroup ? "Nome da turma" : isPartner ? "Nome da empresa do cliente" : "Nome da empresa"}</Label>
            <Input
              id="org-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isGroup ? "Liga de Oratória da UFMG" : "Clínica Sorriso"}
              required
            />
          </div>

          {isPartner && (
            <>
              <div className="space-y-2">
                <Label htmlFor="org-partner">Parceiro (método)</Label>
                <Input id="org-partner" value={partnerName} maxLength={80} onChange={(e) => setPartnerName(e.target.value)} placeholder="Escola Fala Bem" required />
                <p className="text-muted-foreground text-xs">Sai no certificado como &quot;Com método de …&quot;.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="org-partner-email">E-mail do parceiro</Label>
                  <Input id="org-partner-email" type="email" value={partnerEmail} onChange={(e) => setPartnerEmail(e.target.value)} placeholder="contato@parceiro.com" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="org-partner-contact">Nome de quem é o parceiro</Label>
                  <Input id="org-partner-contact" value={partnerContact} onChange={(e) => setPartnerContact(e.target.value)} placeholder="Opcional se já tem conta" />
                </div>
              </div>
            </>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="org-owner-email">{isGroup ? "E-mail do responsável" : isPartner ? "E-mail do cliente" : "E-mail do gestor"}</Label>
              <Input
                id="org-owner-email"
                type="email"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                placeholder={isPartner ? "Vazio = o parceiro fica como dono" : isGroup ? "responsavel@email.com" : "gestor@empresa.com"}
                required={!isPartner}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-owner-name">{isGroup ? "Nome do responsável" : isPartner ? "Nome do cliente" : "Nome do gestor"}</Label>
              <Input id="org-owner-name" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Opcional se já tem conta" disabled={isPartner && !clientEmail} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="org-seats">{isGroup ? "Vagas" : "Assentos"}</Label>
              <Input id="org-seats" type="number" min={1} max={5000} value={seats} onChange={(e) => setSeats(e.target.value)} />
              <p className="text-muted-foreground text-xs">{isGroup ? "Quantos participantes (o responsável não conta)." : "Quantas pessoas do time (o dono não conta)."}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-until">Válida até</Label>
              <Input id="org-until" type="date" value={until} onChange={(e) => setUntil(e.target.value)} />
              {isGroup ? (
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setUntil(dateInputInDays(14))}>14 dias</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setUntil(dateInputInDays(30))}>30 dias</Button>
                </div>
              ) : (
                <p className="text-muted-foreground text-xs">Vazio = sem validade. No piloto, 60 dias.</p>
              )}
            </div>
          </div>

          {!isPartner && (
            <div className="space-y-2">
              <Label htmlFor="org-partner">Parceiro (método)</Label>
              <Input id="org-partner" value={partnerName} maxLength={80} onChange={(e) => setPartnerName(e.target.value)} placeholder="Opcional" />
              <p className="text-muted-foreground text-xs">Se veio por uma escola, coach ou consultoria. Sai no certificado como &quot;Com método de …&quot;.</p>
            </div>
          )}

          {isGroup && (
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label htmlFor="org-challenge">Já abrir o Desafio de 14 dias</Label>
                <p className="text-muted-foreground text-xs">A turma começa com o desafio pronto. Quem entrar depois entra nele.</p>
              </div>
              <Switch id="org-challenge" checked={challenge} onCheckedChange={setChallenge} />
            </div>
          )}
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="submit" form="nova-empresa" disabled={!valid || mutation.isPending}>
            {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
            {submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
