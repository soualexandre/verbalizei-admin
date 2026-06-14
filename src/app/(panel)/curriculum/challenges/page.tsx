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
  ArrowLeft,
  Sparkles,
  ImageIcon,
} from "lucide-react";
import { api } from "@/lib/api";
import type {
  Challenge,
  ChallengeType,
  Paginated,
  Unit,
} from "@/lib/types";
import { CHALLENGE_TYPES } from "@/lib/types";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChallengeDialog } from "../challenge-dialog";
import { VariantsDialog } from "../variants-dialog";
import { ChallengeImageDialog } from "../challenge-image-dialog";
import { toast } from "sonner";

const ALL = "__all__";

export default function ChallengesPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [type, setType] = useState<string>(ALL);
  const [unitId, setUnitId] = useState<string>(ALL);

  const [editId, setEditId] = useState<string | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<Challenge | null>(null);
  const [variantsFor, setVariantsFor] = useState<Challenge | null>(null);
  const [imageFor, setImageFor] = useState<Challenge | null>(null);

  const { data: units } = useQuery({
    queryKey: ["units-all"],
    queryFn: () => api.get<Paginated<Unit>>("/admin/units?limit=100"),
  });

  const params = new URLSearchParams({ page: String(page), limit: "20" });
  if (search) params.set("search", search);
  if (type !== ALL) params.set("type", type);
  if (unitId !== ALL) params.set("unitId", unitId);

  const { data, isLoading } = useQuery({
    queryKey: ["challenges", params.toString()],
    queryFn: () => api.get<Paginated<Challenge>>(`/admin/challenges?${params}`),
  });

  const deleteMutation = useMutation({
    mutationFn: (cid: string) => api.delete(`/admin/challenges/${cid}`),
    onSuccess: () => {
      toast.success("Desafio excluído.");
      qc.invalidateQueries({ queryKey: ["challenges"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  return (
    <>
      <PageHeader
        title="Banco de desafios"
        description="Crie e gerencie todos os desafios da plataforma."
      >
        <Button variant="outline" asChild>
          <Link href="/curriculum">
            <ArrowLeft className="size-4" />
            Currículo
          </Link>
        </Button>
        <Button onClick={() => setEditId(null)}>
          <Plus className="size-4" />
          Novo desafio
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setPage(1);
                setSearch(searchInput.trim());
              }}
              className="relative flex-1 min-w-56"
            >
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                placeholder="Buscar por enunciado/tópico…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9"
              />
            </form>

            <Select
              value={type}
              onValueChange={(v) => {
                setPage(1);
                setType(v);
              }}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos os tipos</SelectItem>
                {CHALLENGE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={unitId}
              onValueChange={(v) => {
                setPage(1);
                setUnitId(v);
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Unidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas as unidades</SelectItem>
                {units?.data.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Enunciado</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Tópico</TableHead>
                <TableHead>XP</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : !data?.data.length ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-muted-foreground py-10 text-center"
                  >
                    Nenhum desafio encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                data.data.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="max-w-md">
                      <button
                        className="line-clamp-2 text-left font-medium hover:underline"
                        onClick={() => setEditId(c.id)}
                      >
                        {c.question || c.tongueTwister || c.textoAlvo || "(sem texto)"}
                      </button>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{c.type}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.topic || "—"}
                    </TableCell>
                    <TableCell>{c.xpReward}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setEditId(c.id)}>
                            <Pencil className="size-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setImageFor(c)}>
                            <ImageIcon className="size-4" />
                            Imagem
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setVariantsFor(c)}>
                            <Sparkles className="size-4" />
                            Gerar variantes (IA)
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => setDeleting(c)}
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

      <ChallengeDialog
        challengeId={editId ?? null}
        open={editId !== undefined}
        onOpenChange={(o) => !o && setEditId(undefined)}
        onSaved={() => qc.invalidateQueries({ queryKey: ["challenges"] })}
      />

      <VariantsDialog
        challenge={variantsFor}
        open={!!variantsFor}
        onOpenChange={(o) => !o && setVariantsFor(null)}
      />

      <ChallengeImageDialog
        challenge={imageFor}
        open={!!imageFor}
        onOpenChange={(o) => !o && setImageFor(null)}
        onChanged={() => qc.invalidateQueries({ queryKey: ["challenges"] })}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Excluir desafio"
        description="Esta ação é permanente e remove o desafio do banco."
        confirmLabel="Excluir"
        variant="destructive"
        onConfirm={async () => {
          if (deleting) await deleteMutation.mutateAsync(deleting.id);
        }}
      />
    </>
  );
}
