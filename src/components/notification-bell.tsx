"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Bell, EnvelopeSimple, WarningCircle, Warning } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import type { BillingAlert } from "@/lib/billing";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const SEEN_KEY = "vb_admin_seen_alerts";

function readSeen(): string[] {
  try {
    return JSON.parse(window.localStorage.getItem(SEEN_KEY) ?? "[]");
  } catch {
    return [];
  }
}

/**
 * O sininho (14/11/2026): cotas e orçamentos perto do fim ou estourados, e
 * pedidos de empresas sem resposta. Confere a cada 5 min. O que já foi visto
 * fica guardado no navegador; um aviso que piora (perto → estourou) volta
 * como novo, porque o id muda.
 */
export function NotificationBell({ inquiries = 0, className }: { inquiries?: number; className?: string }) {
  const { data } = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: () => api.get<{ alerts: BillingAlert[] }>("/admin/notifications"),
    refetchInterval: 5 * 60_000,
    refetchIntervalInBackground: true,
  });
  const alerts = useMemo(() => data?.alerts ?? [], [data]);
  const [seen, setSeen] = useState<string[]>([]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- o navegador só existe depois de montar
  useEffect(() => setSeen(readSeen()), []);

  const unseen = alerts.filter((a) => !seen.includes(a.id)).length + (inquiries > 0 ? 1 : 0);
  const critical = alerts.some((a) => a.level === "critical" && !seen.includes(a.id));

  const markSeen = () => {
    const ids = alerts.map((a) => a.id);
    setSeen(ids);
    try {
      window.localStorage.setItem(SEEN_KEY, JSON.stringify(ids));
    } catch {
      /* navegação privada */
    }
  };

  const empty = alerts.length === 0 && inquiries === 0;

  return (
    <DropdownMenu onOpenChange={(open) => !open && markSeen()}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={unseen ? `Notificações: ${unseen} novas` : "Notificações"}
          className={cn(
            "text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring/50 relative flex size-8 items-center justify-center rounded-md outline-none focus-visible:ring-2",
            className,
          )}
        >
          <Bell className="size-[18px]" weight={unseen ? "fill" : "regular"} aria-hidden />
          {unseen > 0 && (
            <span
              aria-hidden
              className={cn(
                "absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white tabular-nums ring-2 ring-card",
                critical ? "bg-destructive" : "bg-brand",
              )}
            >
              {unseen > 9 ? "9+" : unseen}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={6} className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-[13px] font-semibold">Notificações</p>
          {!empty && <span className="text-muted-foreground text-[11px] tabular-nums">{alerts.length + (inquiries > 0 ? 1 : 0)}</span>}
        </div>
        {empty ? (
          <p className="text-muted-foreground px-3 py-6 text-center text-xs">Nada pedindo atenção agora.</p>
        ) : (
          <ul className="max-h-80 divide-y overflow-y-auto">
            {alerts.map((a) => {
              const isNew = !seen.includes(a.id);
              const Icon = a.level === "critical" ? WarningCircle : Warning;
              return (
                <li key={a.id}>
                  <Link href={a.href} className="hover:bg-muted/60 flex gap-2.5 px-3 py-2.5">
                    <Icon
                      weight="fill"
                      className={cn("mt-0.5 size-4 shrink-0", a.level === "critical" ? "text-destructive" : "text-lime-600")}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-[13px] font-medium leading-snug">
                        {a.title}
                        {isNew && <span className="bg-brand size-1.5 shrink-0 rounded-full" aria-label="novo" />}
                      </span>
                      <span className="text-muted-foreground block text-xs leading-snug">{a.detail}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
            {inquiries > 0 && (
              <li>
                <Link href="/company-inquiries" className="hover:bg-muted/60 flex gap-2.5 px-3 py-2.5">
                  <EnvelopeSimple weight="fill" className="text-brand mt-0.5 size-4 shrink-0" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium leading-snug">
                      {inquiries === 1 ? "1 empresa sem resposta" : `${inquiries} empresas sem resposta`}
                    </span>
                    <span className="text-muted-foreground block text-xs leading-snug">Pedidos de conversa pelo site.</span>
                  </span>
                </Link>
              </li>
            )}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
