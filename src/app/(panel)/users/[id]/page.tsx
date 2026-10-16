"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Dumbbell, WandSparkles } from "lucide-react";
import { api } from "@/lib/api";
import type { UserDetail, UserEnrichmentDetail, UserInteractions } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
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

  const { data, isLoading } = useQuery({
    queryKey: ["user-detail", id],
    queryFn: () => api.get<UserDetail>(`/admin/users/${id}/detail`),
  });

  return (
    <>
      <PageHeader title="Detalhes do usuário" description={`ID: ${id}`}>
        <Button variant="outline" asChild>
          <Link href="/users">
            <ArrowLeft className="size-4" />
            Voltar
          </Link>
        </Button>
      </PageHeader>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : !data ? (
        <p className="text-muted-foreground">Usuário não encontrado.</p>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Onboarding</CardTitle>
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

          <InteractionsCard value={data.interactions} />

          <TrainingQuotaCard userId={id} />

          <InferredProfileCard userId={id} />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Dumbbell className="size-4" />
                Cenários analisados
              </CardTitle>
              <CardDescription>
                Últimas {data.trainingAttempts.length} tentativas analisadas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {!data.trainingAttempts.length ? (
                <p className="text-muted-foreground text-sm">
                  Nenhuma tentativa de treino.
                </p>
              ) : (
                data.trainingAttempts.map((a) => (
                  <div key={a.id} className="rounded-md border p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {a.partLabel || "Treino"}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs">
                          {formatDateTime(a.createdAt)}
                        </span>
                        {a.overallScore != null && (
                          <Badge>{a.overallScore.toFixed(1)}</Badge>
                        )}
                      </div>
                    </div>
                    {a.positives.length > 0 && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">
                        ✓ {a.positives.join(" · ")}
                      </p>
                    )}
                    {a.improvements.length > 0 && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        ↑ {a.improvements.join(" · ")}
                      </p>
                    )}
                    {a.tip && (
                      <p className="text-muted-foreground mt-1 text-xs">
                        💡 {a.tip}
                      </p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

/** O que a pessoa fez no app, por tipo (a mesma conta da coluna Interações). */
function InteractionsCard({ value }: { value: UserInteractions }) {
  const items = [
    { label: "Cenários", value: value.scenarios },
    { label: "Gravações", hint: "inclui o 1º reconhecimento", value: value.recordings },
    { label: "Micro-treinos", value: value.micro },
    { label: "Jogos", value: value.games },
  ];
  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>Interações</CardTitle>
        <CardDescription className="tabular-nums">
          {value.total} no total, desde o cadastro.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {items.map((i) => (
            <div key={i.label} className="bg-muted/60 rounded-lg px-4 py-3">
              <dt className="text-muted-foreground text-xs" title={i.hint}>
                {i.label}
              </dt>
              <dd className="text-xl font-semibold tabular-nums">{i.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3">
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
