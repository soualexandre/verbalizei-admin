"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  MoreHorizontal,
  ChevronRight,
  ListChecks,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Paginated, Unit } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { PaginationBar } from "@/components/pagination-bar";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UnitDialog } from "./unit-dialog";
import { toast } from "sonner";

export default function CurriculumPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [dialogUnit, setDialogUnit] = useState<Unit | null | undefined>(
    undefined,
  );
  const [deleting, setDeleting] = useState<Unit | null>(null);

  const params = new URLSearchParams({ page: String(page), limit: "20" });
  if (search) params.set("search", search);

  const { data, isLoading } = useQuery({
    queryKey: ["units", params.toString()],
    queryFn: () => api.get<Paginated<Unit>>(`/admin/units?${params}`),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/units/${id}`),
    onSuccess: () => {
      toast.success("Unidade excluída.");
      qc.invalidateQueries({ queryKey: ["units"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  return (
    <>
      <PageHeader
        title="Currículo"
        description="Unidades, módulos, lições e desafios da trilha de aprendizado."
      >
        <Button variant="outline" asChild>
          <Link href="/curriculum/challenges">
            <ListChecks className="size-4" />
            Banco de desafios
          </Link>
        </Button>
        <Button onClick={() => setDialogUnit(null)}>
          <Plus className="size-4" />
          Nova unidade
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              setSearch(searchInput.trim());
            }}
            className="relative max-w-sm"
          >
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              placeholder="Buscar unidade…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </form>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Segmentos</TableHead>
                <TableHead>Módulos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : !data?.data.length ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-muted-foreground py-10 text-center"
                  >
                    Nenhuma unidade cadastrada.
                  </TableCell>
                </TableRow>
              ) : (
                data.data.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="text-muted-foreground">
                      {u.order}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/curriculum/units/${u.id}`}
                        className="group flex items-center gap-2 font-medium hover:underline"
                      >
                        {u.color && (
                          <span
                            className="size-3 rounded-full"
                            style={{ backgroundColor: u.color }}
                          />
                        )}
                        {u.title}
                        <ChevronRight className="text-muted-foreground size-3 opacity-0 transition-opacity group-hover:opacity-100" />
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {u.segments?.length ? (
                          u.segments.map((s) => (
                            <Badge key={s} variant="outline" className="text-[10px]">
                              {s}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{u._count?.sessions ?? 0}</TableCell>
                    <TableCell>
                      <Badge variant={u.isActive ? "success" : "secondary"}>
                        {u.isActive ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/curriculum/units/${u.id}`}>
                              <ChevronRight className="size-4" />
                              Abrir módulos
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setDialogUnit(u)}>
                            <Pencil className="size-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => setDeleting(u)}
                          >
                            <Trash2 className="size-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {data && (
            <PaginationBar
              page={data.meta.page}
              totalPages={data.meta.totalPages}
              total={data.meta.total}
              onPageChange={setPage}
            />
          )}
        </CardContent>
      </Card>

      <UnitDialog
        unit={dialogUnit}
        open={dialogUnit !== undefined}
        onOpenChange={(o) => !o && setDialogUnit(undefined)}
        onSaved={() => qc.invalidateQueries({ queryKey: ["units"] })}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Excluir unidade"
        description={`Excluir "${deleting?.title}" e seus módulos/lições associados?`}
        confirmLabel="Excluir"
        variant="destructive"
        onConfirm={async () => {
          if (deleting) await deleteMutation.mutateAsync(deleting.id);
        }}
      />
    </>
  );
}
