"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Dumbbell, FileBarChart, WandSparkles } from "lucide-react";
import { api } from "@/lib/api";
import type { AdminUser, Paginated, UserDetail, UserEnrichmentDetail } from "@/lib/types";
import { formatDate, formatDateTime } from "@/lib/utils";
import { HeroStat, HeroStats, InsightList, PageHero, Section, type InsightTone, HeroStatsSkeleton } from "@/components/page-hero";
import { fmt, fmtPct } from "@/components/dashboard/format";
import { EnrichmentActions } from "@/components/enrichment-actions";
import { TrainingQuotaCard } from "@/components/training-quota-card";
import {
  ConfidenceMeter,
  EnrichmentProfile,
  REASON_LABEL,
} from "@/components/profile-enrichment";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["user-detail", id],
    queryFn: () => api.get<UserDetail>(`/admin/users/${id}/detail`),
  });

  // O detalhe da API não traz nome e e-mail: usa a linha da lista de
  // Usuários, se ela já foi carregada nesta sessão (sem pedido novo).
  const listed = useMemo(() => {
    for (const [, page] of qc.getQueriesData<Paginated<AdminUser>>({ queryKey: ["users"] })) {
      const found = page?.data?.find((u) => u.id === id);
      if (found) return found;
    }
    return null;
  }, [qc, id]);

  const title = listed ? listed.name || listed.email : "Detalhes do usuário";
  const description = listed
    ? [
        listed.name ? listed.email : null,
        `plano ${listed.plan}`,
        data?.onboarding.segment ? `segmento ${data.onboarding.segment}` : null,
        `cadastro em ${formatDate(listed.createdAt)}`,
      ]
        .filter(Boolean)
        .join(" · ")
    : `ID: ${id}`;

  return (
    <>
      <PageHero
        title={title}
        description={description}
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/feedback-evaluations?tab=relatorio&userId=${id}`}>
                <FileBarChart className="size-4" />
                Relatório de avaliações
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/users">
                <ArrowLeft className="size-4" />
                Voltar
              </Link>
            </Button>
          </>
        }
      >
        {data ? <UserStats detail={data} /> : isLoading ? <HeroStatsSkeleton count={6} /> : null}
      </PageHero>

      {isLoading ? (
        <div className="space-y-4" aria-busy="true" aria-label="Carregando o usuário">
          <Skeleton className="h-40 rounded-card" />
          <Skeleton className="h-40 rounded-card" />
        </div>
      ) : !data ? (
        <p className="text-muted-foreground">Usuário não encontrado.</p>
      ) : (
        <div className="space-y-12">
          <Section title="Perfil e cota" description="O que a pessoa respondeu ao entrar, o que inferimos dela e quantos treinos ainda tem.">
            <div className="space-y-4">
              <Card className="shadow-none">
                <CardHeader>
                  <CardTitle className="text-base">Onboarding</CardTitle>
                  <CardDescription>
                    Segmento:{" "}
                    {data.onboarding.segment ? (
                      <Badge variant="secondary">{data.onboarding.segment}</Badge>
                    ) : (
                      "—"
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {data.onboarding.data ? (
                    <OnboardingAnswers data={data.onboarding.data} />
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      Sem dados de onboarding.
                    </p>
                  )}
                </CardContent>
              </Card>

              <TrainingQuotaCard userId={id} />

              <InferredProfileCard userId={id} />
            </div>
          </Section>

          <Section
            title="Cenários analisados"
            description={
              data.trainingAttempts.length
                ? `As últimas ${data.trainingAttempts.length} tentativas analisadas, da mais recente para a mais antiga.`
                : undefined
            }
          >
            <Card className="shadow-none">
              <CardContent className={data.trainingAttempts.length ? "pt-2" : "pt-6"}>
                {!data.trainingAttempts.length ? (
                  <p className="text-muted-foreground text-sm">
                    Nenhuma tentativa de treino.
                  </p>
                ) : (
                  <ul className="divide-y">
                    {data.trainingAttempts.map((a) => (
                      <li key={a.id} className="space-y-1.5 py-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="flex items-center gap-2 text-sm font-medium">
                            <Dumbbell className="text-muted-foreground size-4" aria-hidden />
                            {a.partLabel || "Treino"}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground text-xs">
                              {formatDateTime(a.createdAt)}
                            </span>
                            {a.overallScore != null && (
                              <Badge title="Nota geral da análise">{a.overallScore.toFixed(1)}</Badge>
                            )}
                          </div>
                        </div>
                        {a.positives.length > 0 && (
                          <p className="text-sm">
                            <span className="text-green-ink font-semibold">Foi bem: </span>
                            {a.positives.join(" · ")}
                          </p>
                        )}
                        {a.improvements.length > 0 && (
                          <p className="text-sm">
                            <span className="text-brand-ink font-semibold">A melhorar: </span>
                            {a.improvements.join(" · ")}
                          </p>
                        )}
                        {a.tip && (
                          <p className="text-muted-foreground text-sm">
                            Dica: {a.tip}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </Section>

          <UserInsights detail={data} />
        </div>
      )}
    </>
  );
}

/** A nota média das análises carregadas (só as que têm nota). */
function averageScore(attempts: UserDetail["trainingAttempts"]): { avg: number; count: number } | null {
  const scored = attempts.map((a) => a.overallScore).filter((n): n is number => n != null);
  if (!scored.length) return null;
  return { avg: scored.reduce((a, b) => a + b, 0) / scored.length, count: scored.length };
}

const fmtScore = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Os totais da pessoa na faixa: o que fez no app, por tipo, e a nota média. */
function UserStats({ detail }: { detail: UserDetail }) {
  const v = detail.interactions;
  const score = averageScore(detail.trainingAttempts);
  const share = (n: number) => (v.total ? `${fmtPct(Math.round((n / v.total) * 100))} das interações` : "nenhuma ainda");
  return (
    <HeroStats cols={6}>
      <HeroStat
        label="Interações"
        value={fmt(v.total)}
        note="desde o cadastro"
        help="Tudo o que a pessoa fez no app: cenários, gravações, treinos curtos e jogos (a mesma conta da coluna Interações da lista)."
      />
      <HeroStat label="Cenários" value={fmt(v.scenarios)} note={share(v.scenarios)} help="Sessões de cenário concluídas ou com alguma gravação." />
      <HeroStat
        label="Gravações"
        value={fmt(v.recordings)}
        note={share(v.recordings)}
        help="Análises avulsas: o 1º treino de reconhecimento e “Analisar um áudio”."
      />
      <HeroStat label="Treinos curtos" value={fmt(v.micro)} note={share(v.micro)} help="Treinos curtos concluídos e desafios de voz das lições." />
      <HeroStat label="Jogos" value={fmt(v.games)} note={share(v.games)} help="Rodadas de jogos terminadas." />
      <HeroStat
        label="Nota média"
        value={score ? fmtScore(score.avg) : "—"}
        note={score ? `em ${fmt(score.count)} ${score.count === 1 ? "análise" : "análises"} recentes` : "sem cenário analisado"}
        help="Média da nota geral dos cenários analisados listados abaixo."
      />
    </HeroStats>
  );
}


/** Os itens que mais se repetem numa lista de listas, com quantas vezes. */
function mostFrequent(lists: string[][], take = 2): Array<{ text: string; count: number }> {
  const counts = new Map<string, number>();
  for (const list of lists) for (const item of new Set(list)) counts.set(item, (counts.get(item) ?? 0) + 1);
  return [...counts.entries()]
    .filter(([, n]) => n > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, take)
    .map(([text, count]) => ({ text, count }));
}

/**
 * Os insights da pessoa: o que ela mais treina e o que se repete nas análises
 * (pontos fortes e o que melhorar). Só aparece quando há dado para isso.
 */
function UserInsights({ detail }: { detail: UserDetail }) {
  const v = detail.interactions;
  const attempts = detail.trainingAttempts;
  const items: Array<{ text: React.ReactNode; tone: InsightTone }> = [];

  if (v.total > 0) {
    const kinds = [
      { label: "cenários", n: v.scenarios },
      { label: "gravações", n: v.recordings },
      { label: "treinos curtos", n: v.micro },
      { label: "jogos", n: v.games },
    ].sort((a, b) => b.n - a.n);
    const top = kinds[0];
    items.push({
      text: (
        <>
          Treina mais com <strong>{top.label}</strong>: {fmt(top.n)} de {fmt(v.total)} interações ({fmtPct(Math.round((top.n / v.total) * 100))}).
        </>
      ),
      tone: "brand",
    });
  } else {
    items.push({ text: "Ainda não fez nenhuma interação no app: vale um lembrete para o primeiro treino.", tone: "lime" });
  }

  const scored = attempts.filter((a) => a.overallScore != null);
  if (scored.length >= 2) {
    // A lista vem da mais recente para a mais antiga.
    const latest = scored[0].overallScore!;
    const oldest = scored[scored.length - 1].overallScore!;
    const diff = latest - oldest;
    items.push({
      text:
        Math.abs(diff) < 0.05
          ? `A nota se manteve em ${fmtScore(latest)} da análise mais antiga para a mais recente.`
          : `A nota ${diff > 0 ? "subiu" : "caiu"} de ${fmtScore(oldest)} para ${fmtScore(latest)} da análise mais antiga para a mais recente.`,
      tone: diff > 0 ? "green" : diff < 0 ? "lime" : "brand",
    });
  }

  for (const p of mostFrequent(attempts.map((a) => a.positives))) {
    items.push({ text: `Ponto forte que se repete: “${p.text}” (em ${fmt(p.count)} análises).`, tone: "green" });
  }
  for (const p of mostFrequent(attempts.map((a) => a.improvements))) {
    items.push({ text: `O que mais volta para melhorar: “${p.text}” (em ${fmt(p.count)} análises).`, tone: "lime" });
  }

  return (
    <Section title="O que os números dizem" description="O que a pessoa mais treina e o que se repete nas análises dela.">
      <InsightList items={items} />
    </Section>
  );
}

/** Nomes das respostas do onboarding (o resto aparece com a chave crua). */
const ONBOARDING_LABEL: Record<string, string> = {
  objective: "Objetivo",
  audience: "Público",
  obstacle: "Dificuldade",
  careerStage: "Momento de carreira",
  firstRoom: "Primeira sala",
  persona: "Persona",
  occupation: "Ocupação",
  sector: "Setor",
  skipped: "Pulou o onboarding",
};

function answerText(value: unknown): string {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (Array.isArray(value)) return value.map(answerText).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/** As respostas do onboarding em lista, no lugar do JSON cru. */
function OnboardingAnswers({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data).filter(([, v]) => v != null && v !== "");
  if (!entries.length) {
    return <p className="text-muted-foreground text-sm">Sem respostas.</p>;
  }
  return (
    <dl className="divide-y text-sm">
      {entries.map(([key, value]) => (
        <div key={key} className="grid gap-1 py-2 sm:grid-cols-[12rem_1fr]">
          <dt className="text-muted-foreground">{ONBOARDING_LABEL[key] ?? key}</dt>
          <dd className="break-words">{answerText(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

function InferredProfileCard({ userId }: { userId: string }) {
  const { data } = useQuery({
    queryKey: ["user-enrichment", userId],
    queryFn: () => api.get<UserEnrichmentDetail>(`/admin/enrichment/users/${userId}`),
  });

  // Perfil completo e sem inferência guardada: nada a mostrar.
  if (!data || (data.reasons.length === 0 && !data.enrichment)) return null;

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3 text-base">
          <span className="flex items-center gap-2">
            <WandSparkles className="size-4" />
            Perfil inferido
          </span>
          {data.enrichment?.confidence != null && (
            <ConfidenceMeter value={data.enrichment.confidence} />
          )}
        </CardTitle>
        <CardDescription>
          {data.reasons.length
            ? `Enriquecido porque: ${data.reasons.map((r) => REASON_LABEL[r].toLowerCase()).join(", ")}.`
            : "O usuário completou o perfil depois do enriquecimento; o declarado vale."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.enrichment ? (
          <EnrichmentProfile enrichment={data.enrichment} signals={data.enrichment.signals} />
        ) : (
          <p className="text-muted-foreground text-sm">Ainda não processado.</p>
        )}
        <EnrichmentActions userId={userId} detail={data} />
      </CardContent>
    </Card>
  );
}
