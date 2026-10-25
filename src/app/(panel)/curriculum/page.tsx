"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ImageIcon,
  MoreHorizontal,
  Pencil,
  Search,
  Sparkles,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Challenge, SkillGapRef } from "@/lib/types";
import { ErrorState } from "@/components/error-state";
import { HeroStat, HeroStats, InsightList, PageHero, Section, type InsightTone, HeroStatsSkeleton } from "@/components/page-hero";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChallengeDialog, formatLabel } from "./challenge-dialog";
import { VariantsDialog } from "./variants-dialog";
import { ChallengeImageDialog } from "./challenge-image-dialog";

interface DrillGroup {
  key: string;
  gap: SkillGapRef | null;
  drills: Challenge[];
}

/**
 * Micro-treinos: os drills de 30–60 s que a recomendação serve a partir do
 * gap detectado na fala (Challenge com isDrill = true, semeados por
 * seed-microlearning.ts). A trilha antiga Unit → Session → Lesson saiu do
 * admin: nenhum app usa mais. A API já devolve na ordem do gap mais urgente
 * para o menos, e dentro do gap na ordem do pacote; aqui só agrupamos.
 */
export default function MicroTrainingsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [variantsFor, setVariantsFor] = useState<Challenge | null>(null);
  const [imageFor, setImageFor] = useState<Challenge | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["drills"],
    queryFn: () => api.get<Challenge[]>("/admin/challenges/drills"),
  });

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const map = new Map<string, DrillGroup>();
    for (const d of data ?? []) {
      if (q && !matches(d, q)) continue;
      const key = d.gap?.id ?? "__sem_gap__";
      const g = map.get(key) ?? { key, gap: d.gap ?? null, drills: [] };
      g.drills.push(d);
      map.set(key, g);
    }
    return [...map.values()];
  }, [data, search]);

  const stats = useMemo(() => (data ? drillStats(data) : null), [data]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["drills"] });
    qc.invalidateQueries({ queryKey: ["challenge"] });
  };

  return (
    <>
      <PageHero
        title="Micro-treinos"
        description="Os treinos curtos (30 a 60 segundos) que o app recomenda a partir do ponto fraco detectado na fala de cada pessoa, agrupados pelo ponto que cada um treina."
        actions={
          <div className="relative w-full sm:w-72">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              placeholder="Buscar por enunciado ou tópico…"
              aria-label="Buscar micro-treinos"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        }
      >
        {stats ? (
          <HeroStats cols={4}>
            <HeroStat
              label="Micro-treinos ativos"
              value={stats.total}
              note={stats.noGap ? `${stats.noGap} sem ponto de fala definido` : "todos ligados a um ponto de fala"}
              help="Treinos curtos ativos, que a recomendação pode servir hoje."
            />
            <HeroStat
              label="Pontos de fala cobertos"
              value={stats.gaps}
              note={stats.gaps ? `média de ${fmtAvg(stats.withGap / stats.gaps)} treinos por ponto` : "Nenhum ponto coberto"}
              help="Quantos pontos fracos da fala (ritmo, vícios de linguagem, pausas…) têm ao menos um micro-treino."
            />
            <HeroStat
              label="Formato mais usado"
              value={stats.topFormat ? formatLabel(stats.topFormat.format) : "—"}
              note={stats.topFormat ? `${stats.topFormat.n} de ${stats.total} · ${stats.formats} ${stats.formats === 1 ? "formato" : "formatos"} no total` : "Sem formato definido"}
              help="O tipo de treino mais comum entre os micro-treinos (cenário, leitura, jogo, reconhecimento)."
            />
            <HeroStat
              label="Com imagem"
              value={stats.total ? `${Math.round((stats.withImage / stats.total) * 100)}%` : "—"}
              note={`${stats.withImage} de ${stats.total} treinos`}
              help="Micro-treinos que já têm imagem de capa."
            />
          </HeroStats>
        ) : isLoading ? (
          <HeroStatsSkeleton count={4} />
        ) : null}
      </PageHero>

      {isError && !data ? (
        <ErrorState title="Não foi possível carregar os micro-treinos." onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="space-y-4" aria-busy="true" aria-label="Carregando micro-treinos">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-card" />
          ))}
        </div>
      ) : !groups.length ? (
        <Card className="shadow-none">
          <CardContent className="text-muted-foreground py-10 text-center text-sm">
            {search.trim()
              ? "Nenhum micro-treino encontrado para essa busca."
              : "Nenhum micro-treino ativo. Rode o seed de micro-treinos na API."}
          </CardContent>
        </Card>
      ) : (
        <Section
          title="Por ponto de fala"
          description={
            search.trim()
              ? `${groups.reduce((n, g) => n + g.drills.length, 0)} micro-treinos encontrados. Clique no enunciado para editar.`
              : "Do ponto mais urgente para o menos, e dentro dele na ordem em que o app serve. Clique no enunciado para editar."
          }
        >
        <div className="space-y-4">
          {groups.map((g) => (
            <Card key={g.key} className="gap-3 shadow-none">
              <CardHeader className="flex flex-row items-baseline justify-between gap-2">
                <CardTitle className="text-base">
                  {g.gap?.label ?? "Sem gap"}
                  {g.gap?.slug && (
                    <span className="text-muted-foreground ml-2 font-mono text-xs font-normal">
                      {g.gap.slug}
                    </span>
                  )}
                </CardTitle>
                <span className="text-muted-foreground text-sm tabular-nums">
                  {g.drills.length} {g.drills.length === 1 ? "drill" : "drills"}
                </span>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10 text-right">#</TableHead>
                      <TableHead>Enunciado</TableHead>
                      <TableHead className="w-36">Formato</TableHead>
                      <TableHead className="w-64">Alvo</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {g.drills.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="text-muted-foreground text-right tabular-nums">
                          {d.drillOrder ?? "—"}
                        </TableCell>
                        <TableCell className="max-w-md whitespace-normal">
                          <button
                            className="line-clamp-2 text-left font-medium hover:underline"
                            onClick={() => setEditId(d.id)}
                          >
                            {d.question || d.topic || "(sem enunciado)"}
                          </button>
                          {d.question && d.topic && (
                            <p className="text-muted-foreground mt-0.5 text-xs">
                              {d.topic}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          {d.drillFormat ? (
                            <Badge variant="secondary">
                              {formatLabel(d.drillFormat)}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-64 text-sm whitespace-normal">
                          <Target drill={d} />
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                aria-label="Ações"
                              >
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => setEditId(d.id)}>
                                <Pencil className="size-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => setImageFor(d)}>
                                <ImageIcon className="size-4" />
                                Imagem
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => setVariantsFor(d)}>
                                <Sparkles className="size-4" />
                                Gerar variantes (IA)
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
        </Section>
      )}

      {stats && stats.insights.length > 0 && !search.trim() && (
        <Section title="O que os números dizem" description="O catálogo de micro-treinos em frases.">
          <InsightList items={stats.insights} />
        </Section>
      )}

      <ChallengeDialog
        challengeId={editId}
        open={editId !== null}
        onOpenChange={(o) => !o && setEditId(null)}
        onSaved={invalidate}
      />

      <VariantsDialog
        challenge={variantsFor}
        open={!!variantsFor}
        onOpenChange={(o) => !o && setVariantsFor(null)}
      />

      <ChallengeImageDialog
        challenge={imageFor}
        open={!!imageFor}
        onOpenChange={(o) => !o && setImageFor(null)}
        onChanged={invalidate}
      />
    </>
  );
}

function fmtAvg(n: number) {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

/** Os totais da faixa e as frases dos insights, a partir da lista que a tela já carrega. */
function drillStats(drills: Challenge[]) {
  const byGap = new Map<string, { label: string; n: number }>();
  const byFormat = new Map<string, number>();
  let noGap = 0;
  let withImage = 0;
  for (const d of drills) {
    if (d.gap) {
      const g = byGap.get(d.gap.id) ?? { label: d.gap.label, n: 0 };
      g.n += 1;
      byGap.set(d.gap.id, g);
    } else noGap += 1;
    if (d.drillFormat) byFormat.set(d.drillFormat, (byFormat.get(d.drillFormat) ?? 0) + 1);
    if (d.imageUrl) withImage += 1;
  }
  const total = drills.length;
  const formats = [...byFormat.entries()].sort((a, b) => b[1] - a[1]);
  const gapList = [...byGap.values()].sort((a, b) => b.n - a.n);

  const insights: Array<{ text: string; tone: InsightTone }> = [];
  if (gapList.length > 1) {
    const most = gapList[0];
    const least = gapList[gapList.length - 1];
    if (most.n !== least.n) {
      insights.push({ text: `“${most.label}” é o ponto com mais treinos (${most.n}); “${least.label}” tem só ${least.n}.`, tone: "brand" });
    } else {
      insights.push({ text: `Todos os ${gapList.length} pontos de fala têm ${most.n} ${most.n === 1 ? "treino" : "treinos"} cada.`, tone: "green" });
    }
  }
  if (formats.length > 0) {
    insights.push({
      text: `Formatos: ${formats.map(([f, n]) => `${formatLabel(f)} (${n})`).join(", ")}.`,
      tone: "brand",
    });
  }
  if (total > 0) {
    const missing = total - withImage;
    insights.push(
      missing === 0
        ? { text: "Todos os micro-treinos já têm imagem de capa.", tone: "green" }
        : { text: `${missing} ${missing === 1 ? "micro-treino está" : "micro-treinos estão"} sem imagem de capa; dá para gerar pelo menu Ações › Imagem.`, tone: "lime" },
    );
  }
  if (noGap > 0) {
    insights.push({ text: `${noGap} ${noGap === 1 ? "micro-treino não está ligado" : "micro-treinos não estão ligados"} a um ponto de fala, então a recomendação não os serve.`, tone: "lime" });
  }

  return {
    total,
    noGap,
    withGap: total - noGap,
    gaps: byGap.size,
    formats: byFormat.size,
    topFormat: formats[0] ? { format: formats[0][0], n: formats[0][1] } : null,
    withImage,
    insights,
  };
}

/** O que o drill pede: texto a ler, regra do jogo e/ou a janela de duração. */
function Target({ drill }: { drill: Challenge }) {
  const duration = durationLabel(drill.minDuration, drill.maxDuration);
  const text = drill.textoAlvo || drill.drillRule;
  if (!text && !duration) return <span>—</span>;
  return (
    <div className="space-y-0.5">
      {text && <p className="line-clamp-2">{text}</p>}
      {duration && <p className="text-xs tabular-nums">{duration}</p>}
    </div>
  );
}

function durationLabel(min: number | null, max: number | null) {
  if (min != null && max != null) return `${min}–${max} s`;
  if (min != null) return `mín. ${min} s`;
  if (max != null) return `até ${max} s`;
  return null;
}

function matches(d: Challenge, q: string) {
  return [d.question, d.topic, d.textoAlvo, d.drillRule, d.gap?.label]
    .some((v) => v?.toLowerCase().includes(q));
}
