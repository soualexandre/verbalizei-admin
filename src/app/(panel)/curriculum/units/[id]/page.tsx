"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  ChevronRight,
  Lock,
  Unlock,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Session, Unit } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SessionDialog } from "../../session-dialog";
import { toast } from "sonner";

export default function UnitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const qc = useQueryClient();
  const [dialog, setDialog] = useState<Session | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<Session | null>(null);

  const { data: unit } = useQuery({
    queryKey: ["unit", id],
    queryFn: () => api.get<Unit>(`/admin/units/${id}`),
  });

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["sessions", id],
    queryFn: () => api.get<Session[]>(`/admin/units/${id}/sessions`),
  });

  const deleteMutation = useMutation({
    mutationFn: (sid: string) => api.delete(`/admin/sessions/${sid}`),
    onSuccess: () => {
      toast.success("Módulo excluído.");
      qc.invalidateQueries({ queryKey: ["sessions", id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  return (
    <>
      <PageHeader
        title={unit?.title ?? "Unidade"}
        description="Módulos (sessions) que compõem esta unidade."
      >
        <Button variant="outline" asChild>
          <Link href="/curriculum">
            <ArrowLeft className="size-4" />
            Voltar
          </Link>
        </Button>
        <Button onClick={() => setDialog(null)}>
          <Plus className="size-4" />
          Novo módulo
        </Button>
      </PageHeader>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Lições</TableHead>
                <TableHead>Acesso</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : !sessions?.length ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-muted-foreground py-10 text-center"
                  >
                    Nenhum módulo nesta unidade.
                  </TableCell>
                </TableRow>
              ) : (
                sessions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-muted-foreground">
                      {s.order}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/curriculum/sessions/${s.id}`}
                        className="font-medium hover:underline"
                      >
                        {s.title}
                      </Link>
                      {s.description && (
                        <p className="text-muted-foreground line-clamp-1 text-xs">
                          {s.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>{s._count?.lessons ?? 0}</TableCell>
                    <TableCell>
                      {s.isFree ? (
                        <Badge variant="success" className="gap-1">
                          <Unlock className="size-3" /> Grátis
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <Lock className="size-3" /> Premium
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => setDialog(s)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => setDeleting(s)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="size-8" asChild>
                          <Link href={`/curriculum/sessions/${s.id}`}>
                            <ChevronRight className="size-4" />
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <SessionDialog
        unitId={id}
        session={dialog}
        open={dialog !== undefined}
        onOpenChange={(o) => !o && setDialog(undefined)}
        onSaved={() => qc.invalidateQueries({ queryKey: ["sessions", id] })}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Excluir módulo"
        description={`Excluir "${deleting?.title}" e suas lições?`}
        confirmLabel="Excluir"
        variant="destructive"
        onConfirm={async () => {
          if (deleting) await deleteMutation.mutateAsync(deleting.id);
        }}
      />
    </>
  );
}
