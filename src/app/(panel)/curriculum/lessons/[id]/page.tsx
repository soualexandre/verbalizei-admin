"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Pencil,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Lesson, LessonChallengeLink } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChallengeDialog } from "../../challenge-dialog";
import { LinkChallengeDialog } from "./link-challenge-dialog";
import { toast } from "sonner";

export default function LessonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const qc = useQueryClient();
  const [linkOpen, setLinkOpen] = useState(false);
  const [editId, setEditId] = useState<string | null | undefined>(undefined);

  const { data: lesson } = useQuery({
    queryKey: ["lesson", id],
    queryFn: () => api.get<Lesson>(`/admin/lessons/${id}`),
  });

  const { data: links, isLoading } = useQuery({
    queryKey: ["lesson-challenges", id],
    queryFn: () =>
      api.get<LessonChallengeLink[]>(`/admin/lessons/${id}/challenges`),
  });

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["lesson-challenges", id] });

  const unlink = useMutation({
    mutationFn: (challengeId: string) =>
      api.delete(`/admin/lessons/${id}/challenges/${challengeId}`),
    onSuccess: () => {
      toast.success("Desafio desvinculado.");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const reorder = useMutation({
    mutationFn: (items: { challengeId: string; order: number }[]) =>
      api.patch(`/admin/lessons/${id}/challenges/reorder`, { items }),
    onSuccess: invalidate,
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  function move(index: number, dir: -1 | 1) {
    if (!links) return;
    const next = [...links];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    reorder.mutate(
      next.map((l, i) => ({ challengeId: l.challengeId, order: i })),
    );
  }

  return (
    <>
      <PageHeader
        title={lesson ? `Lição: ${lesson.type}` : "Lição"}
        description="Desafios vinculados a esta lição, na ordem de execução."
      >
        <Button variant="outline" asChild>
          <Link
            href={
              lesson?.sessionId
                ? `/curriculum/sessions/${lesson.sessionId}`
                : "/curriculum"
            }
          >
            <ArrowLeft className="size-4" />
            Voltar
          </Link>
        </Button>
        <Button onClick={() => setLinkOpen(true)}>
          <Plus className="size-4" />
          Vincular desafio
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="space-y-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))
          ) : !links?.length ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              Nenhum desafio vinculado.
            </p>
          ) : (
            links.map((link, index) => (
              <div
                key={link.id}
                className="flex items-center gap-3 rounded-md border p-3"
              >
                <span className="bg-muted text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-medium">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {link.challenge?.question ||
                      link.challenge?.tongueTwister ||
                      link.challenge?.textoAlvo ||
                      "(sem texto)"}
                  </p>
                  {link.challenge && (
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {link.challenge.type}
                      </Badge>
                      <span className="text-muted-foreground text-xs">
                        {link.challenge.xpReward} XP
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    disabled={index === 0 || reorder.isPending}
                    onClick={() => move(index, -1)}
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    disabled={index === links.length - 1 || reorder.isPending}
                    onClick={() => move(index, 1)}
                  >
                    <ArrowDown className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => setEditId(link.challengeId)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => unlink.mutate(link.challengeId)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <LinkChallengeDialog
        lessonId={id}
        open={linkOpen}
        onOpenChange={setLinkOpen}
        onLinked={invalidate}
      />

      <ChallengeDialog
        challengeId={editId ?? null}
        open={editId !== undefined}
        onOpenChange={(o) => !o && setEditId(undefined)}
        onSaved={invalidate}
      />
    </>
  );
}
