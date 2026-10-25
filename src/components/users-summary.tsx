"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { UsersSummary as Summary } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fmt, fmtPct } from "@/components/dashboard/format";

/**
 * Totalizadores da tela de Usuários (25/10/2026, pedido do usuário: bem
 * resumidos e pequenos). Seis números numa faixa, cada um com uma linha curta.
 * Falhou ao carregar: a faixa some, a lista segue.
 */
export function UsersSummary() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["users-summary"],
    queryFn: () => api.get<Summary>("/admin/users/summary"),
    staleTime: 60_000,
  });

  if (isError) return null;
  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6" aria-busy="true" aria-label="Carregando os totais">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[74px] rounded-xl" />
        ))}
      </div>
    );
  }

  const share = (n: number) => (data.total ? fmtPct(Math.round((n / data.total) * 100)) : "—");
  const items: Array<{ label: string; value: number; note: string; help?: string }> = [
    { label: "Cadastrados", value: data.total, note: "pessoas reais" },
    { label: "Novos (7 dias)", value: data.new7d, note: `${fmt(data.new30d)} em 30 dias` },
    { label: "Treinaram (7 dias)", value: data.active7d, note: `${share(data.active7d)} da base` },
    { label: "Pagantes", value: data.paying, note: `${share(data.paying)} · Starter e Ouro` },
    { label: "Fizeram o onboarding", value: data.onboarded, note: `${share(data.onboarded)} da base` },
    // Nenhuma interação: nem sala, treino curto, jogo, reconhecimento, roteiro ou cenário criado.
    ...(data.neverInteracted != null
      ? [{
          label: "Nunca interagiram",
          value: data.neverInteracted,
          note: `${share(data.neverInteracted)} da base`,
          help: "Nunca abriram uma sala nem fizeram treino curto, jogo, reconhecimento, gravação, lição, roteiro ou cenário próprio.",
        }]
      : data.neverTrained != null
        ? [{ label: "Nunca treinaram", value: data.neverTrained, note: `${share(data.neverTrained)} da base` }]
        : []),
  ];

  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6" aria-label="Totais de usuários">
      {items.map((it) => (
        <li key={it.label}>
          <Card className="gap-0.5 rounded-xl px-3.5 py-3 shadow-none" title={it.help}>
            <p className="text-muted-foreground truncate text-xs font-medium">{it.label}</p>
            <p className="text-xl font-semibold leading-tight tracking-tight tabular-nums">{fmt(it.value)}</p>
            <p className="text-muted-foreground truncate text-[11px] tabular-nums">{it.note}</p>
          </Card>
        </li>
      ))}
    </ul>
  );
}
