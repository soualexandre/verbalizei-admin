"use client";

import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Headphones } from "lucide-react";
import { api } from "@/lib/api";
import type { RecordingKind, RecordingListItem, RecordingsPage } from "@/lib/types";
import { cn, formatDateTime } from "@/lib/utils";
import { fmt } from "@/components/dashboard/format";
import { PaginationBar } from "@/components/pagination-bar";
import { Section } from "@/components/page-hero";
import { ErrorState } from "@/components/error-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  errorLabel,
  fillersTone,
  fmtDuration,
  fmtNum,
  fmtSeconds,
  KIND_LABEL,
  KIND_ORDER,
  kindLabel,
  paceTone,
  pauseTone,
  STATUS_LABEL,
  TONE_TEXT,
} from "./metric-ranges";
import { RecordingDialog } from "./recording-dialog";

const PAGE_SIZE = 20;

/** Todas as gravações da pessoa, por tipo, com as medidas principais. Clicar abre a gravação inteira. */
export function RecordingsTab({ userId }: { userId: string }) {
  const [kind, setKind] = useState<RecordingKind | "">("");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["user-recordings", userId, kind, page],
    queryFn: () =>
      api.get<RecordingsPage>(
        `/admin/users/${userId}/recordings?${new URLSearchParams({
          ...(kind ? { kind } : {}),
          page: String(page),
          pageSize: String(PAGE_SIZE),
        })}`,
      ),
    placeholderData: keepPreviousData,
  });

  const counts = data?.counts ?? {};
  const all = Object.values(counts).reduce<number>((a, b) => a + (b ?? 0), 0);
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  const chips: Array<{ key: RecordingKind | ""; label: string; n: number }> = [
    { key: "", label: "Todas", n: all },
    ...KIND_ORDER.filter((k) => (counts[k] ?? 0) > 0 || k === kind).map((k) => ({ key: k, label: KIND_LABEL[k], n: counts[k] ?? 0 })),
  ];

  return (
    <Section
      title="Gravações"
      description="Tudo o que a pessoa gravou, da mais recente para a mais antiga. Clique numa linha para ouvir e ver a análise inteira."
    >
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por tipo">
        {chips.map((c) => (
          <button
            key={c.key || "all"}
            type="button"
            aria-pressed={kind === c.key}
            onClick={() => {
              setKind(c.key);
              setPage(1);
            }}
            className={cn(
              "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors",
              kind === c.key ? "bg-primary text-primary-foreground border-transparent" : "bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {c.label}
            <span className={cn("tabular-nums", kind === c.key ? "opacity-80" : "text-muted-foreground")}>{fmt(c.n)}</span>
          </button>
        ))}
      </div>

      <Card className="min-w-0 shadow-none">
        <CardContent className="pt-6">
          {isError ? (
            <ErrorState bare title="Não foi possível carregar as gravações." error={error} onRetry={() => refetch()} />
          ) : isLoading ? (
            <div className="space-y-2" aria-busy="true" aria-label="Carregando as gravações">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 rounded-xl" />
              ))}
            </div>
          ) : !data?.items.length ? (
            <p className="text-muted-foreground text-sm">Nenhuma gravação {kind ? "deste tipo" : "ainda"}.</p>
          ) : (
            <div className={cn("space-y-4", isFetching && "opacity-70")}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quando</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead className="text-right">Duração</TableHead>
                    <TableHead className="text-right">Nota</TableHead>
                    <TableHead className="text-right" title="Palavras por minuto; bom entre 110 e 160">Ritmo</TableHead>
                    <TableHead className="text-right" title="Muletas por minuto; bom até 2">Muletas/min</TableHead>
                    <TableHead className="text-right" title="Maior pausa; bom até 1,5 s">Maior pausa</TableHead>
                    <TableHead>Situação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((r) => (
                    <RecordingRow key={r.id} row={r} onOpen={() => setOpenId(r.id)} />
                  ))}
                </TableBody>
              </Table>
              {totalPages > 1 && <PaginationBar page={page} totalPages={totalPages} total={data.total} onPageChange={setPage} />}
            </div>
          )}
        </CardContent>
      </Card>

      <RecordingDialog userId={userId} jobId={openId} onClose={() => setOpenId(null)} />
    </Section>
  );
}

function RecordingRow({ row, onOpen }: { row: RecordingListItem; onOpen: () => void }) {
  const m = row.metrics ?? ({} as RecordingListItem["metrics"]);
  const failed = row.status === "FAILED";
  return (
    <TableRow
      tabIndex={0}
      role="button"
      aria-label={`Abrir gravação de ${formatDateTime(row.createdAt)}`}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className="cursor-pointer"
    >
      <TableCell className="whitespace-nowrap tabular-nums">{formatDateTime(row.createdAt)}</TableCell>
      <TableCell className="whitespace-nowrap">{kindLabel(row.kind)}</TableCell>
      <TableCell className="max-w-[16rem]">
        <span className="flex items-center gap-1.5">
          {row.hasAudio && <Headphones className="text-muted-foreground size-3.5 shrink-0" aria-label="Tem áudio" />}
          <span className="truncate">{row.title || "Sem título"}</span>
        </span>
      </TableCell>
      <TableCell className="text-right tabular-nums whitespace-nowrap">{fmtDuration(row.durationSeconds)}</TableCell>
      <TableCell className="text-right font-semibold tabular-nums">{row.overallScore != null ? Math.round(row.overallScore) : "—"}</TableCell>
      <TableCell className={cn("text-right tabular-nums", TONE_TEXT[paceTone(m.wpm)])}>{fmtNum(m.wpm, 0)}</TableCell>
      <TableCell className={cn("text-right tabular-nums", TONE_TEXT[fillersTone(m.fillersPerMinute)])}>{fmtNum(m.fillersPerMinute)}</TableCell>
      <TableCell className={cn("text-right tabular-nums whitespace-nowrap", TONE_TEXT[pauseTone(m.longestPause)])}>{fmtSeconds(m.longestPause)}</TableCell>
      <TableCell className="whitespace-nowrap">
        {failed ? (
          <Badge variant="destructive" title={row.errorCode ?? undefined}>
            {errorLabel(row.errorCode) ?? "Falhou"}
          </Badge>
        ) : row.status === "COMPLETED" ? (
          <Badge variant="success">{STATUS_LABEL.COMPLETED}</Badge>
        ) : (
          <Badge variant="secondary">{STATUS_LABEL[row.status] ?? row.status}</Badge>
        )}
      </TableCell>
    </TableRow>
  );
}
