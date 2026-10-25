"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { UsersSummary as Summary } from "@/lib/types";
import { HeroStat, HeroStats, HeroStatsSkeleton } from "@/components/page-hero";
import { fmt, fmtPct } from "@/components/dashboard/format";

/**
 * Totalizadores da tela de Usuários, dentro da faixa azul (PageHero), no
 * padrão do admin desde 25/10/2026. Seis números, cada um com uma linha curta
 * e o que quer dizer ao passar o mouse. Falhou ao carregar: os totais somem,
 * a lista segue.
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
      <HeroStatsSkeleton count={6} />
    );
  }

  const share = (n: number) => (data.total ? fmtPct(Math.round((n / data.total) * 100)) : "—");
  const items: Array<{ label: string; value: number; note: string; help: string }> = [
    {
      label: "Cadastrados",
      value: data.total,
      note: "pessoas reais",
      help: "Todas as contas, sem usuários de teste e administradores.",
    },
    {
      label: "Novos (7 dias)",
      value: data.new7d,
      note: `${fmt(data.new30d)} em 30 dias`,
      help: "Contas criadas nos últimos 7 dias; embaixo, nos últimos 30.",
    },
    {
      label: "Treinaram (7 dias)",
      value: data.active7d,
      note: `${share(data.active7d)} da base`,
      help: "Pessoas que treinaram ao menos uma vez nos últimos 7 dias (cenário, gravação, treino curto ou jogo).",
    },
    {
      label: "Pagantes",
      value: data.paying,
      note: `${share(data.paying)} · Starter e Ouro`,
      help: "Assinantes dos planos Starter e Ouro.",
    },
    {
      label: "Fizeram o onboarding",
      value: data.onboarded,
      note: `${share(data.onboarded)} da base`,
      help: "Responderam as perguntas de boas-vindas até o fim.",
    },
    // Nenhuma interação: nem sala, treino curto, jogo, reconhecimento, roteiro ou cenário criado.
    ...(data.neverInteracted != null
      ? [{
          label: "Nunca interagiram",
          value: data.neverInteracted,
          note: `${share(data.neverInteracted)} da base`,
          help: "Nunca abriram uma sala nem fizeram treino curto, jogo, reconhecimento, gravação, lição, roteiro ou cenário próprio.",
        }]
      : data.neverTrained != null
        ? [{
            label: "Nunca treinaram",
            value: data.neverTrained,
            note: `${share(data.neverTrained)} da base`,
            help: "Nunca fizeram um treino desde o cadastro.",
          }]
        : []),
  ];

  return (
    <HeroStats cols={items.length >= 6 ? 6 : 5}>
      {items.map((it) => (
        <HeroStat key={it.label} label={it.label} value={fmt(it.value)} note={it.note} help={it.help} />
      ))}
    </HeroStats>
  );
}
