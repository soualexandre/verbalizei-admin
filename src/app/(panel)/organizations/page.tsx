"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";
import { validityText } from "@/lib/organizations";
import type { AdminOrganizationSummary } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { ErrorState } from "@/components/error-state";
import { HeroStat, HeroStats, HeroStatsSkeleton, PageHero, Section } from "@/components/page-hero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmt } from "@/components/dashboard/format";
import { NewOrganizationDialog } from "./new-organization-dialog";

/** Empresas (B2B): cada cliente com o gestor, os assentos, a validade e o uso nos últimos 30 dias. */
export default function OrganizationsPage() {
  const [creating, setCreating] = useState(false);
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["organizations"],
    queryFn: () => api.get<{ items: AdminOrganizationSummary[] }>("/admin/organizations"),
  });
  const items = data?.items ?? [];
  const active = items.filter((o) => o.active);
  const seatsUsed = active.reduce((s, o) => s + o.seatsUsed, 0);
  const seats = active.reduce((s, o) => s + o.seats, 0);
  const sessions = items.reduce((s, o) => s + o.sessions30d, 0);

  return (
    <div className="space-y-12">
      <PageHero
        title="Empresas"
        description="Os clientes do Verbalizei para Empresas: quem administra cada time, os assentos, a validade e quanto o time treinou."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" /> Nova empresa
          </Button>
        }
      >
        {isLoading ? (
          <HeroStatsSkeleton count={4} />
        ) : !isError ? (
          <HeroStats cols={4}>
            <HeroStat label="Empresas ativas" value={fmt(active.length)} note={`${fmt(items.length)} no total`} />
            <HeroStat label="Assentos em uso" value={fmt(seatsUsed)} note={`de ${fmt(seats)} contratados nas ativas`} />
            <HeroStat label="Treinos do time em 30 dias" value={fmt(sessions)} help="Sessões abertas nos cenários das empresas" />
            <HeroStat label="Gestores" value={fmt(items.reduce((s, o) => s + o.managers, 0))} note="donos e gestores" />
          </HeroStats>
        ) : null}
      </PageHero>

      <Section title="Todas as empresas" description="Abra uma empresa para pôr gestores e atendentes, mudar papéis, assentos e validade.">
        {isError ? (
          <ErrorState title="Não deu para carregar as empresas" error={error} onRetry={() => refetch()} />
        ) : (
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead>Assentos</TableHead>
                    <TableHead>Treinos (30 dias)</TableHead>
                    <TableHead>Cenários</TableHead>
                    <TableHead>Criada</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell>
                      </TableRow>
                    ))
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-muted-foreground py-10 text-center">
                        Nenhuma empresa ainda. Crie a primeira com o gestor do piloto.
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell>
                          <Link href={`/organizations/${o.id}`} className="font-medium hover:underline">{o.name}</Link>
                          <p className="text-muted-foreground text-xs">{o.owner ? `${o.owner.name ?? ""} ${o.owner.email ? `· ${o.owner.email}` : ""}`.trim() : "Sem dono"}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant={o.active ? "success" : o.status === "PAUSED" ? "secondary" : "warning"}>{validityText(o)}</Badge>
                        </TableCell>
                        <TableCell className="tabular-nums">{o.seatsUsed} de {o.seats}</TableCell>
                        <TableCell className="tabular-nums">{fmt(o.sessions30d)}</TableCell>
                        <TableCell className="tabular-nums">{fmt(o.scenarios)}</TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(o.createdAt)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </Section>

      <NewOrganizationDialog open={creating} onOpenChange={setCreating} />
    </div>
  );
}
