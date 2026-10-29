"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AccessLogItem } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { Section } from "@/components/page-hero";
import { ErrorState } from "@/components/error-state";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const ACTION_LABEL: Record<string, string> = {
  recordings_list: "Viu a lista de gravações",
  recording_open: "Abriu uma gravação",
  evolution: "Viu a evolução",
};

/** Quem do admin olhou as gravações desta pessoa, e quando. */
export function AccessLogTab({ userId }: { userId: string }) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["user-access-log", userId],
    queryFn: () => api.get<{ items: AccessLogItem[] }>(`/admin/users/${userId}/access-log`),
  });

  return (
    <Section
      title="Acessos"
      description="Toda vez que alguém do admin abre uma gravação, a lista de gravações ou a evolução desta pessoa, fica registrado aqui. Mostra os 100 mais recentes."
    >
      <Card className="min-w-0 shadow-none">
        <CardContent className="pt-6">
          {isError ? (
            <ErrorState bare title="Não foi possível carregar os acessos." error={error} onRetry={() => refetch()} />
          ) : isLoading || !data ? (
            <div className="space-y-2" aria-busy="true">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 rounded-xl" />
              ))}
            </div>
          ) : !data.items.length ? (
            <p className="text-muted-foreground text-sm">Ninguém abriu as gravações desta pessoa ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quem</TableHead>
                  <TableHead>O quê</TableHead>
                  <TableHead>Quando</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <span className="block font-medium">{a.actor.name || a.actor.email || "Pessoa removida"}</span>
                      {a.actor.name && a.actor.email && <span className="text-muted-foreground block text-xs">{a.actor.email}</span>}
                    </TableCell>
                    <TableCell>
                      {ACTION_LABEL[a.action] ?? a.action}
                      {a.resourceId && <span className="text-muted-foreground block font-mono text-xs">{a.resourceId}</span>}
                    </TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums">{formatDateTime(a.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </Section>
  );
}
