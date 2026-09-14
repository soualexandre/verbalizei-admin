"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { api } from "@/lib/api";
import type {
  EnrichmentListStatus,
  EnrichmentReason,
  EnrichmentSummary,
  EnrichmentUserRow,
  Paginated,
  UserEnrichmentDetail,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  ConfidenceMeter,
  EnrichmentProfile,
  REASON_LABEL,
  STATUS_LABEL,
  StatusText,
} from "@/components/profile-enrichment";
import { EnrichmentActions } from "@/components/enrichment-actions";
import { PaginationBar } from "@/components/pagination-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const ALL = "__all__";
const COLUMNS = 6;

export function EnrichmentTable({
  segments,
  disabled,
  onChanged,
}: {
  segments: EnrichmentSummary["inferredSegments"];
  disabled: boolean;
  onChanged: () => void;
}) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>(ALL);
  const [reason, setReason] = useState<string>(ALL);
  const [segment, setSegment] = useState<string>(ALL);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const params = new URLSearchParams({ page: String(page), limit: "20" });
  if (status !== ALL) params.set("status", status);
  if (reason !== ALL) params.set("reason", reason);
  if (segment !== ALL) params.set("segment", segment);
  if (search) params.set("search", search);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["enrichment-users", params.toString()],
    queryFn: () => api.get<Paginated<EnrichmentUserRow>>(`/admin/enrichment/users?${params}`),
    placeholderData: (prev) => prev,
  });

  const reset = (fn: () => void) => {
    setPage(1);
    setExpanded(null);
    fn();
  };

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              reset(() => setSearch(searchInput.trim()));
            }}
            className="relative min-w-56 flex-1"
          >
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              placeholder="Buscar por nome, e-mail ou ocupação…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
              aria-label="Buscar usuários"
            />
          </form>

          <Select value={status} onValueChange={(v) => reset(() => setStatus(v))}>
            <SelectTrigger className="w-44" aria-label="Status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos os status</SelectItem>
              {(Object.keys(STATUS_LABEL) as EnrichmentListStatus[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={reason} onValueChange={(v) => reset(() => setReason(v))}>
            <SelectTrigger className="w-44" aria-label="Motivo">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos os motivos</SelectItem>
              {(Object.keys(REASON_LABEL) as EnrichmentReason[]).map((r) => (
                <SelectItem key={r} value={r}>
                  {REASON_LABEL[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={segment} onValueChange={(v) => reset(() => setSegment(v))}>
            <SelectTrigger className="w-48" aria-label="Segmento inferido">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos os segmentos</SelectItem>
              {segments.map((s) => (
                <SelectItem key={s.key} value={s.key}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className={cn("transition-opacity", isFetching && !isLoading && "opacity-70")}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Perfil inferido</TableHead>
                <TableHead>Ocupação</TableHead>
                <TableHead>Confiança</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10">
                  <span className="sr-only">Detalhes</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={COLUMNS}>
                      <Skeleton className="h-9 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : !data?.data.length ? (
                <TableRow>
                  <TableCell colSpan={COLUMNS} className="text-muted-foreground py-10 text-center">
                    {status === ALL && reason === ALL && segment === ALL && !search
                      ? "Nenhum usuário precisa de enriquecimento."
                      : "Nenhum usuário com esses filtros."}
                  </TableCell>
                </TableRow>
              ) : (
                data.data.map((row) => {
                  const open = expanded === row.user.id;
                  const e = row.enrichment;
                  return (
                    <Fragment key={row.user.id}>
                      <TableRow
                        className={cn("cursor-pointer", open && "bg-muted/50")}
                        onClick={() => setExpanded(open ? null : row.user.id)}
                      >
                        <TableCell className="max-w-64">
                          <p className="truncate font-medium">{row.user.name || "—"}</p>
                          <p className="text-muted-foreground truncate text-xs">{row.user.email}</p>
                          <p className="text-muted-foreground mt-0.5 text-xs">
                            {row.reasons.map((r) => REASON_LABEL[r]).join(" · ")}
                          </p>
                        </TableCell>
                        <TableCell className="max-w-72">
                          {e?.inferredSegmentLabel ? (
                            <>
                              <p className="font-medium">{e.inferredSegmentLabel}</p>
                              <p className="text-muted-foreground truncate text-xs">
                                {[e.inferredObjectiveLabel, e.inferredAudienceLabel]
                                  .filter(Boolean)
                                  .join(" · ") || "Foco e papel sem evidência"}
                              </p>
                            </>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-56">
                          {e?.occupation ? (
                            <>
                              <p className="truncate">{e.occupation}</p>
                              {e.industry && (
                                <p className="text-muted-foreground truncate text-xs">{e.industry}</p>
                              )}
                            </>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <ConfidenceMeter value={e?.confidence ?? null} />
                        </TableCell>
                        <TableCell>
                          <StatusText status={row.status} />
                          {e?.appliedAt && (
                            <p className="text-muted-foreground mt-0.5 text-xs">Segmento aplicado</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            aria-expanded={open}
                            aria-label={open ? "Fechar detalhes" : "Ver detalhes"}
                            onClick={(ev) => {
                              ev.stopPropagation();
                              setExpanded(open ? null : row.user.id);
                            }}
                          >
                            {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                          </Button>
                        </TableCell>
                      </TableRow>
                      {open && (
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={COLUMNS} className="bg-muted/30 p-0 whitespace-normal">
                            <RowDetail
                              userId={row.user.id}
                              disabled={disabled}
                              onChanged={onChanged}
                            />
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {data && data.meta.total > 0 && (
          <PaginationBar
            page={data.meta.page}
            totalPages={data.meta.totalPages}
            total={data.meta.total}
            onPageChange={(p) => {
              setPage(p);
              setExpanded(null);
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}

function RowDetail({
  userId,
  disabled,
  onChanged,
}: {
  userId: string;
  disabled: boolean;
  onChanged: () => void;
}) {
  const detail = useQuery({
    queryKey: ["user-enrichment", userId],
    queryFn: () => api.get<UserEnrichmentDetail>(`/admin/enrichment/users/${userId}`),
  });

  return (
    <div className="space-y-4 px-4 py-4 sm:px-6">
      {detail.isLoading || !detail.data ? (
        <Skeleton className="h-32" />
      ) : (
        <>
          {detail.data.enrichment ? (
            <EnrichmentProfile
              enrichment={detail.data.enrichment}
              signals={detail.data.enrichment.signals}
            />
          ) : (
            <p className="text-muted-foreground text-sm">
              Ainda não processado. Reprocesse para inferir o perfil deste usuário agora.
            </p>
          )}
          <EnrichmentActions
            userId={userId}
            detail={detail.data}
            disabled={disabled}
            onChanged={onChanged}
          >
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/users/${userId}`}>Abrir usuário</Link>
            </Button>
          </EnrichmentActions>
        </>
      )}
    </div>
  );
}
