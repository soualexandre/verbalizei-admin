"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Pencil, Trash2, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import type { Lesson, Session } from "@/lib/types";
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
import { LessonDialog } from "../../lesson-dialog";
import { toast } from "sonner";

export default function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const qc = useQueryClient();
  const [dialog, setDialog] = useState<Lesson | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<Lesson | null>(null);

  const { data: session } = useQuery({
    queryKey: ["session", id],
    queryFn: () => api.get<Session>(`/admin/sessions/${id}/detail`),
  });

  const { data: lessons, isLoading } = useQuery({
    queryKey: ["lessons", id],
    queryFn: () => api.get<Lesson[]>(`/admin/sessions/${id}/lessons`),
  });

  const deleteMutation = useMutation({
    mutationFn: (lid: string) => api.delete(`/admin/lessons/${lid}`),
    onSuccess: () => {
      toast.success("Lição excluída.");
      qc.invalidateQueries({ queryKey: ["lessons", id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  return (
    <>
      <PageHeader
        title={session?.title ?? "Módulo"}
        description={
          session?.unit
            ? `Unidade: ${session.unit.title}`
            : "Lições deste módulo."
        }
      >
        <Button variant="outline" asChild>
          <Link
            href={
              session?.unitId
                ? `/curriculum/units/${session.unitId}`
                : "/curriculum"
            }
          >
            <ArrowLeft className="size-4" />
            Voltar
          </Link>
        </Button>
        <Button onClick={() => setDialog(null)}>
          <Plus className="size-4" />
          Nova lição
        </Button>
      </PageHeader>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Senioridade</TableHead>
                <TableHead>Desafios</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : !lessons?.length ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-muted-foreground py-10 text-center"
                  >
                    Nenhuma lição neste módulo.
                  </TableCell>
                </TableRow>
              ) : (
                lessons.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-muted-foreground">
                      {l.position}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/curriculum/lessons/${l.id}`}
                        className="font-medium hover:underline"
                      >
                        {l.type}
                      </Link>
                      {l.isPromotionLesson && (
                        <Badge variant="warning" className="ml-2 text-[10px]">
                          Promoção
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {l.seniorityLevel ? (
                        <Badge variant="outline">{l.seniorityLevel}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>{l._count?.challenges ?? 0}</TableCell>
                    <TableCell>
                      <Badge variant={l.isActive ? "success" : "secondary"}>
                        {l.isActive ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => setDialog(l)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => setDeleting(l)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="size-8" asChild>
                          <Link href={`/curriculum/lessons/${l.id}`}>
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

      <LessonDialog
        sessionId={id}
        lesson={dialog}
        open={dialog !== undefined}
        onOpenChange={(o) => !o && setDialog(undefined)}
        onSaved={() => qc.invalidateQueries({ queryKey: ["lessons", id] })}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Excluir lição"
        description={`Excluir a lição "${deleting?.type}"?`}
        confirmLabel="Excluir"
        variant="destructive"
        onConfirm={async () => {
          if (deleting) await deleteMutation.mutateAsync(deleting.id);
        }}
      />
    </>
  );
}
