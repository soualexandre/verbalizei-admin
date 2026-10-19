"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import type { DayActivity } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { fmt, KINDS } from "./format";

const KIND = Object.fromEntries(KINDS.map((k) => [k.key, k]));
const hour = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
const longDay = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

/**
 * Quem treinou num dia do gráfico de ativos e em quê, na ordem da hora.
 * A régua é a mesma do gráfico (GET /admin/overview/day).
 */
export function DayActivityDialog({ day, onClose }: { day: string | null; onClose: () => void }) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["overview-day", day],
    queryFn: () => api.get<DayActivity>(`/admin/overview/day?day=${day}`),
    enabled: !!day,
  });
  const interactions = data?.users.reduce((t, u) => t + u.count, 0) ?? 0;

  return (
    <Dialog open={!!day} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="first-letter:uppercase">
            {day ? longDay.format(new Date(`${day}T00:00:00Z`)) : ""}
          </DialogTitle>
          <DialogDescription className="tabular-nums">
            {data
              ? data.users.length
                ? `${fmt(data.users.length)} ${data.users.length === 1 ? "pessoa treinou" : "pessoas treinaram"}, ${fmt(interactions)} ${interactions === 1 ? "interação" : "interações"}.`
                : "Ninguém treinou neste dia."
              : "Quem treinou e em quê."}
          </DialogDescription>
        </DialogHeader>

        {isError ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <AlertCircle className="text-muted-foreground size-6" />
            <p className="text-sm">Não foi possível carregar o dia.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="size-4" />
              Tentar de novo
            </Button>
          </div>
        ) : isLoading || !data ? (
          <div className="space-y-3" aria-busy="true" aria-label="Carregando">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        ) : (
          <ul className="divide-y">
            {data.users.map((u) => (
              <li key={u.id} className="py-3 first:pt-0">
                <div className="flex items-center gap-3">
                  <Avatar className="size-8">
                    {u.avatarUrl && <AvatarImage src={u.avatarUrl} alt="" />}
                    <AvatarFallback className="text-xs">{initials(u.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <Link href={`/users/${u.id}`} className="block truncate text-sm font-medium hover:underline">
                      {u.name || u.email}
                    </Link>
                    <p className="text-muted-foreground truncate text-xs">{u.email}</p>
                  </div>
                  <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                    {fmt(u.count)} {u.count === 1 ? "interação" : "interações"}
                  </span>
                </div>
                <ol className="mt-2 space-y-1 pl-11">
                  {u.items.map((it, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground w-10 shrink-0 text-xs tabular-nums">{hour.format(new Date(it.at))}</span>
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ background: KIND[it.kind]?.color }}
                        title={KIND[it.kind]?.label}
                      />
                      <span className="min-w-0 flex-1 truncate" title={it.label}>
                        <span className="sr-only">{KIND[it.kind]?.label}: </span>
                        {it.label}
                      </span>
                      {it.score != null && <span className="shrink-0 text-xs tabular-nums">nota {it.score}</span>}
                      {it.xp != null && <span className="text-muted-foreground shrink-0 text-xs tabular-nums">+{fmt(it.xp)} XP</span>}
                    </li>
                  ))}
                </ol>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

function initials(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
}
