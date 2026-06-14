"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MoreHorizontal,
  Search,
  Eye,
  Trash2,
  Pencil,
  Loader2,
  GitBranch,
} from "lucide-react";
import { api } from "@/lib/api";
import type {
  AdminUser,
  Paginated,
  UserPlan,
  UserRole,
  UserSegment,
} from "@/lib/types";
import { USER_SEGMENTS } from "@/lib/types";
import { formatDate, initials } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { PaginationBar } from "@/components/pagination-bar";
import {
  PlanBadge,
  RoleBadge,
  ActiveBadge,
} from "@/components/entity-badges";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { EditUserDialog } from "./edit-user-dialog";
import { toast } from "sonner";

const ALL = "__all__";

export default function UsersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [plan, setPlan] = useState<string>(ALL);
  const [role, setRole] = useState<string>(ALL);
  const [segment, setSegment] = useState<string>(ALL);
  const [includeMocks, setIncludeMocks] = useState(false);

  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState<AdminUser | null>(null);
  const [migrateOpen, setMigrateOpen] = useState(false);

  const params = new URLSearchParams({
    page: String(page),
    limit: "20",
    includeMocks: includeMocks ? "true" : "false",
  });
  if (search) params.set("search", search);
  if (plan !== ALL) params.set("plan", plan);
  if (role !== ALL) params.set("role", role);
  if (segment !== ALL) params.set("segment", segment);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["users", params.toString()],
    queryFn: () => api.get<Paginated<AdminUser>>(`/admin/users?${params}`),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/users/${id}`),
    onSuccess: () => {
      toast.success("Usuário removido.");
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const migrateMutation = useMutation({
    mutationFn: () =>
      api.post<{ stats: { total: number; updated: number; created: number } }>(
        "/admin/users/migrate-segment-units",
      ),
    onSuccess: (res) => {
      toast.success(
        `Migração concluída: ${res.stats.updated} atualizados, ${res.stats.created} criados de ${res.stats.total}.`,
      );
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  function applySearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function resetPageAnd(fn: () => void) {
    setPage(1);
    fn();
  }

  return (
    <>
      <PageHeader
        title="Usuários"
        description="Gerencie planos, papéis, status e migração de trilhas."
      >
        <Button variant="outline" onClick={() => setMigrateOpen(true)}>
          <GitBranch className="size-4" />
          Migrar trilhas
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <form onSubmit={applySearch} className="relative flex-1 min-w-56">
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                placeholder="Buscar por nome ou e-mail…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9"
              />
            </form>

            <Select value={plan} onValueChange={(v) => resetPageAnd(() => setPlan(v))}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Plano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos os planos</SelectItem>
                <SelectItem value="FREE">FREE</SelectItem>
                <SelectItem value="PREMIUM">PREMIUM</SelectItem>
              </SelectContent>
            </Select>

            <Select value={role} onValueChange={(v) => resetPageAnd(() => setRole(v))}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Papel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos os papéis</SelectItem>
                <SelectItem value="USER">USER</SelectItem>
                <SelectItem value="ADMIN">ADMIN</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={segment}
              onValueChange={(v) => resetPageAnd(() => setSegment(v))}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Segmento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos os segmentos</SelectItem>
                {USER_SEGMENTS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant={includeMocks ? "secondary" : "outline"}
              onClick={() => resetPageAnd(() => setIncludeMocks((v) => !v))}
            >
              {includeMocks ? "Com mocks" : "Sem mocks"}
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>XP</TableHead>
                <TableHead>Streak</TableHead>
                <TableHead>Criado</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={8}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : !data?.data.length ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-muted-foreground py-10 text-center"
                  >
                    Nenhum usuário encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                data.data.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                          {u.avatarUrl && <AvatarImage src={u.avatarUrl} alt="" />}
                          <AvatarFallback>
                            {initials(u.name, u.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="leading-tight">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {u.name || "—"}
                            </span>
                            {u.isMock && (
                              <span className="text-muted-foreground bg-muted rounded px-1 text-[10px]">
                                mock
                              </span>
                            )}
                          </div>
                          <p className="text-muted-foreground text-xs">
                            {u.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <PlanBadge plan={u.plan} />
                    </TableCell>
                    <TableCell>
                      <RoleBadge role={u.role} />
                    </TableCell>
                    <TableCell>
                      <ActiveBadge active={u.isActive} />
                    </TableCell>
                    <TableCell>{u.totalPoints}</TableCell>
                    <TableCell>{u.progress?.streak ?? 0}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(u.createdAt)}
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
                            <Link href={`/users/${u.id}`}>
                              <Eye className="size-4" />
                              Ver detalhes
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setEditing(u)}>
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

      {isFetching && !isLoading && (
        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          <Loader2 className="size-3 animate-spin" /> atualizando…
        </div>
      )}

      <EditUserDialog
        user={editing}
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        onSaved={() => qc.invalidateQueries({ queryKey: ["users"] })}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Excluir usuário"
        description={`Esta ação remove permanentemente ${deleting?.email} e todos os seus dados.`}
        confirmLabel="Excluir"
        variant="destructive"
        onConfirm={async () => {
          if (deleting) await deleteMutation.mutateAsync(deleting.id);
        }}
      />

      <ConfirmDialog
        open={migrateOpen}
        onOpenChange={setMigrateOpen}
        title="Migrar usuários para trilhas por segmento"
        description="Atribui cada usuário (não-mock, com onboarding completo) à unidade do seu segmento. Esta ação altera o progresso dos usuários."
        confirmLabel="Executar migração"
        onConfirm={async () => {
          await migrateMutation.mutateAsync();
        }}
      />
    </>
  );
}

export type { UserPlan, UserRole, UserSegment };
