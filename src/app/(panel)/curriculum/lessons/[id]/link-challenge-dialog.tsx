"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Challenge, Paginated } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function LinkChallengeDialog({
  lessonId,
  open,
  onOpenChange,
  onLinked,
}: {
  lessonId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLinked: () => void;
}) {
  const qc = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const params = new URLSearchParams({ limit: "15" });
  if (search) params.set("search", search);

  const { data, isLoading } = useQuery({
    queryKey: ["challenges-picker", search],
    queryFn: () => api.get<Paginated<Challenge>>(`/admin/challenges?${params}`),
    enabled: open,
  });

  const link = useMutation({
    mutationFn: (challengeId: string) =>
      api.post(`/admin/lessons/${lessonId}/challenges`, { challengeId }),
    onSuccess: () => {
      toast.success("Desafio vinculado.");
      qc.invalidateQueries({ queryKey: ["lesson-challenges", lessonId] });
      onLinked();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Vincular desafio</DialogTitle>
          <DialogDescription>
            Busque um desafio do banco e vincule à lição.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(searchInput.trim());
          }}
          className="relative"
        >
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="Buscar desafio…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </form>

        <div className="max-h-96 space-y-2 overflow-y-auto">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))
          ) : !data?.data.length ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              Nenhum desafio encontrado.
            </p>
          ) : (
            data.data.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 rounded-md border p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {c.question || c.tongueTwister || c.textoAlvo || "(sem texto)"}
                  </p>
                  <Badge variant="outline" className="mt-1 text-[10px]">
                    {c.type}
                  </Badge>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={link.isPending}
                  onClick={() => link.mutate(c.id)}
                >
                  {link.isPending && link.variables === c.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Plus className="size-4" />
                  )}
                  Vincular
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
