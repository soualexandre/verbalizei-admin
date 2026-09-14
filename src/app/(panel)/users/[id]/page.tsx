"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Mic, Dumbbell, WandSparkles } from "lucide-react";
import { api } from "@/lib/api";
import type { UserDetail, UserEnrichmentDetail } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { EnrichmentActions } from "@/components/enrichment-actions";
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
                <pre className="bg-muted max-h-80 overflow-auto rounded-md p-4 text-xs">
                  {JSON.stringify(data.onboarding.data, null, 2)}
                </pre>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Sem dados de onboarding.
                </p>
              )}
            </CardContent>
          </Card>

          <InferredProfileCard userId={id} />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="size-4" />
                Gravações recentes
              </CardTitle>
              <CardDescription>
                Últimas {data.recordings.length} gravações de voz.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {!data.recordings.length ? (
                <p className="text-muted-foreground text-sm">
                  Nenhuma gravação.
                </p>
              ) : (
                data.recordings.map((r) => (
                  <div key={r.id} className="rounded-md border p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-muted-foreground text-xs">
                        {formatDateTime(r.createdAt)}
                      </span>
                      {r.averageScore != null && (
                        <Badge>{r.averageScore.toFixed(1)}</Badge>
                      )}
                    </div>
                    <div className="text-muted-foreground flex flex-wrap gap-3 text-xs">
                      <Metric label="Clareza" value={r.clarity} />
                      <Metric label="Ritmo" value={r.pace} />
                      <Metric label="Volume" value={r.volume} />
                      <Metric label="Pronúncia" value={r.pronunciation} />
                    </div>
                    {r.suggestions.length > 0 && (
                      <ul className="mt-2 space-y-1 text-xs">
                        {r.suggestions.map((s, i) => (
                          <li key={i}>• {s}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Dumbbell className="size-4" />
                Treinos de oratória
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

function Metric({ label, value }: { label: string; value: number | null }) {
  return (
    <span>
      {label}: <strong>{value != null ? value.toFixed(1) : "—"}</strong>
    </span>
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
