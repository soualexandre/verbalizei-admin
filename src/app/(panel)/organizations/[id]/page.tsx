"use client";

import { OrgLogo } from "@/components/org-logo";
import { use, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Copy, ExternalLink, Pencil, RefreshCw, UserPlus, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { ROLE_LABEL, inviteUrl, validityText } from "@/lib/organizations";
import type { AdminOrganizationDetail, AdminOrganizationMember, OrgRole } from "@/lib/types";
import { formatDate, formatDateTime, initials } from "@/lib/utils";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ErrorState } from "@/components/error-state";
import { HeroStat, HeroStats, HeroStatsSkeleton, PageHero, Section } from "@/components/page-hero";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmt } from "@/components/dashboard/format";
import { AddMemberDialog, EditOrganizationDialog } from "./dialogs";

type Pending =
  | { kind: "role"; member: AdminOrganizationMember; role: OrgRole }
  | { kind: "remove"; member: AdminOrganizationMember }
  | { kind: "invite" }
  | null;

/** Uma empresa: dados, gestores e time (papéis, posse, tirar), convite e cenários. */
export default function OrganizationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState<Pending>(null);
  const { data: org, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["organizations", id],
    queryFn: () => api.get<AdminOrganizationDetail>(`/admin/organizations/${id}`),
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["organizations"] });
  };

  const action = useMutation({
    mutationFn: async (p: NonNullable<Pending>) => {
      if (p.kind === "role") return api.patch(`/admin/organizations/${id}/members/${p.member.userId}`, { role: p.role });
      if (p.kind === "remove") return api.delete(`/admin/organizations/${id}/members/${p.member.userId}`);
      return api.post(`/admin/organizations/${id}/invite-code`);
    },
    onSuccess: (_r, p) => {
      toast.success(p.kind === "role" ? "Papel atualizado." : p.kind === "remove" ? "Pessoa tirada do time." : "Convite trocado: o link antigo deixou de valer.");
      refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não deu certo."),
  });

  if (isError) {
    return <ErrorState title="Não deu para carregar a empresa" error={error} onRetry={() => refetch()} />;
  }

  const managers = org?.members.filter((m) => m.role !== "MEMBER") ?? [];
  const team = org?.members.filter((m) => m.role === "MEMBER") ?? [];
  const sessions = org?.members.reduce((s, m) => s + m.sessions30d, 0) ?? 0;
  const link = org ? inviteUrl(org.inviteCode) : "";

  return (
    <div className="space-y-12">
      <div className="space-y-3">
        <Link href="/organizations" className="text-muted-foreground inline-flex items-center gap-1 text-sm hover:underline">
          <ArrowLeft className="size-4" /> Empresas
        </Link>
        <PageHero
          title={org?.name ?? "Empresa"}
          description={
            org && (
              <span className="inline-flex flex-wrap items-center gap-2">
                <OrgLogo id={org.id} name={org.name} logoVersion={org.logoVersion} decorative />
                <Badge variant={org.active ? "success" : org.status === "PAUSED" ? "secondary" : "warning"}>{validityText(org)}</Badge>
                <span>Criada em {formatDate(org.createdAt)} · meta de {org.weeklyGoal} treinos por semana</span>
              </span>
            )
          }
          actions={
            org && (
              <>
                <Button variant="outline" asChild>
                  <a href={org.portalUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="size-4" /> Portal do gestor</a>
                </Button>
                <Button variant="outline" onClick={() => setEditing(true)}><Pencil className="size-4" /> Editar</Button>
                <Button onClick={() => setAdding(true)}><UserPlus className="size-4" /> Pôr no time</Button>
              </>
            )
          }
        >
          {isLoading || !org ? (
            <HeroStatsSkeleton count={4} />
          ) : (
            <HeroStats cols={4}>
              <HeroStat label="Assentos em uso" value={`${org.seatsUsed} de ${org.seats}`} note={org.seatsUsed >= org.seats ? "Time completo" : `${org.seats - org.seatsUsed} livres`} />
              <HeroStat label="Gestores" value={fmt(managers.length)} note="dono e gestores" />
              <HeroStat label="Atendentes" value={fmt(team.length)} />
              <HeroStat label="Treinos em 30 dias" value={fmt(sessions)} note={`${fmt(org.scenarios.length)} cenários da empresa`} />
            </HeroStats>
          )}
        </PageHero>
      </div>

      {org && (
        <>
          <Section title="Gestores" description="Quem entra no portal: o dono e os gestores. Recebem o relatório toda segunda.">
            <MembersTable members={managers} onRole={(member, role) => setPending({ kind: "role", member, role })} onRemove={(member) => setPending({ kind: "remove", member })} empty="Sem gestores. Ponha o dono no time." />
          </Section>

          <Section title="Atendentes" description="Quem treina os cenários da empresa no app. Entram pelo link de convite ou por aqui.">
            <MembersTable members={team} onRole={(member, role) => setPending({ kind: "role", member, role })} onRemove={(member) => setPending({ kind: "remove", member })} empty="Ninguém do time entrou ainda. Mande o link de convite para o gestor." />
          </Section>

          <Section title="Convite" description="O link que o gestor manda para o time. Trocar invalida o anterior.">
            <Card>
              <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center">
                <Input readOnly value={link} onFocus={(e) => e.currentTarget.select()} className="font-mono text-sm" aria-label="Link de convite" />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => navigator.clipboard.writeText(link).then(() => toast.success("Link copiado."), () => toast.error("Copie à mão."))}
                  >
                    <Copy className="size-4" /> Copiar
                  </Button>
                  <Button variant="outline" onClick={() => setPending({ kind: "invite" })}><RefreshCw className="size-4" /> Trocar</Button>
                </div>
              </CardContent>
            </Card>
          </Section>

          <Section title="Cenários da empresa" description="Montados pelo gestor no editor do app e trazidos para o time no portal.">
            <Card>
              <CardContent className="pt-6">
                {org.scenarios.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Nenhum cenário ainda.</p>
                ) : (
                  <ul className="divide-y">
                    {org.scenarios.map((s) => (
                      <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                        <span className="font-medium">{s.title}</span>
                        <span className="text-muted-foreground text-xs">{s.status === "ACTIVE" ? "Ativo" : s.status} · {formatDate(s.createdAt)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </Section>

          <AddMemberDialog org={org} open={adding} onOpenChange={setAdding} onSaved={refresh} />
          <EditOrganizationDialog org={org} open={editing} onOpenChange={setEditing} onSaved={refresh} />
        </>
      )}

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(o) => !o && setPending(null)}
        title={
          pending?.kind === "role"
            ? pending.role === "OWNER"
              ? `Passar a posse para ${pending.member.name || pending.member.email}?`
              : `Mudar ${pending.member.name || pending.member.email} para ${ROLE_LABEL[pending.role]}?`
            : pending?.kind === "remove"
              ? `Tirar ${pending.member.name || pending.member.email} do time?`
              : "Trocar o link de convite?"
        }
        description={
          pending?.kind === "role"
            ? pending.role === "OWNER"
              ? "O dono atual vira gestor."
              : pending.role === "MEMBER"
                ? "A pessoa deixa de entrar no portal e passa a só treinar."
                : "A pessoa passa a ver o painel e administrar o time."
            : pending?.kind === "remove"
              ? "Deixa de ver os cenários da empresa e libera o assento. O histórico fica no relatório."
              : "O link antigo deixa de funcionar. Quem já entrou continua no time."
        }
        confirmLabel={pending?.kind === "remove" ? "Tirar do time" : "Confirmar"}
        variant={pending?.kind === "remove" ? "destructive" : "default"}
        onConfirm={async () => {
          if (pending) await action.mutateAsync(pending);
        }}
      />
    </div>
  );
}

function MembersTable({
  members,
  onRole,
  onRemove,
  empty,
}: {
  members: AdminOrganizationMember[];
  onRole: (m: AdminOrganizationMember, role: OrgRole) => void;
  onRemove: (m: AdminOrganizationMember) => void;
  empty: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        {members.length === 0 ? (
          <p className="text-muted-foreground text-sm">{empty}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pessoa</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Treinos (30 dias)</TableHead>
                <TableHead>Último acesso</TableHead>
                <TableHead>No time desde</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.userId}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8"><AvatarFallback>{initials(m.name, m.email)}</AvatarFallback></Avatar>
                      <div className="leading-tight">
                        <Link href={`/users/${m.userId}`} className="font-medium hover:underline">{m.name || "—"}</Link>
                        <p className="text-muted-foreground text-xs">{m.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {m.role === "OWNER" ? (
                      <Badge>Dono</Badge>
                    ) : (
                      <Select value={m.role} onValueChange={(v) => v !== m.role && onRole(m, v as OrgRole)}>
                        <SelectTrigger className="h-9 w-36" aria-label={`Papel de ${m.name || m.email}`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MANAGER">{ROLE_LABEL.MANAGER}</SelectItem>
                          <SelectItem value="MEMBER">{ROLE_LABEL.MEMBER}</SelectItem>
                          <SelectItem value="OWNER">Dono (passar a posse)</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums">{fmt(m.sessions30d)}</TableCell>
                  <TableCell className="text-muted-foreground">{m.lastLoginAt ? formatDateTime(m.lastLoginAt) : "Nunca entrou"}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(m.joinedAt)}</TableCell>
                  <TableCell>
                    {m.role !== "OWNER" && (
                      <Button variant="ghost" size="icon" className="size-8" onClick={() => onRemove(m)} aria-label={`Tirar ${m.name || m.email} do time`}>
                        <UserMinus className="size-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
