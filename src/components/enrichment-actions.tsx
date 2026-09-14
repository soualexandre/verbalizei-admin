"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { UserEnrichmentDetail } from "@/lib/types";
import { Button } from "@/components/ui/button";

export function EnrichmentActions({
  userId,
  detail,
  disabled,
  onChanged,
  children,
}: {
  userId: string;
  detail: UserEnrichmentDetail;
  disabled?: boolean;
  onChanged?: () => void;
  children?: React.ReactNode;
}) {
  const qc = useQueryClient();
  const refresh = (next: UserEnrichmentDetail) => {
    qc.setQueryData(["user-enrichment", userId], next);
    qc.invalidateQueries({ queryKey: ["enrichment-users"] });
    qc.invalidateQueries({ queryKey: ["profiles"] });
    onChanged?.();
  };

  const rerun = useMutation({
    mutationFn: () => api.post<UserEnrichmentDetail>(`/admin/enrichment/users/${userId}/run`),
    onSuccess: (next) => {
      refresh(next);
      toast.success(
        next.enrichment?.status === "READY"
          ? "Perfil atualizado."
          : "Reprocessado, mas ainda sem dados suficientes.",
      );
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const apply = useMutation({
    mutationFn: () => api.post<UserEnrichmentDetail>(`/admin/enrichment/users/${userId}/apply`),
    onSuccess: (next) => {
      refresh(next);
      toast.success("Segmento aplicado ao usuário.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const label = detail.enrichment?.inferredSegmentLabel;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {detail.canApply && label && (
        <Button size="sm" onClick={() => apply.mutate()} disabled={disabled || apply.isPending}>
          {apply.isPending && <Loader2 className="size-4 animate-spin" />}
          Aplicar segmento “{label}”
        </Button>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={() => rerun.mutate()}
        disabled={disabled || rerun.isPending}
      >
        {rerun.isPending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
        {rerun.isPending ? "Reprocessando…" : "Reprocessar"}
      </Button>
      {children}
      {detail.declaredSegment && detail.declaredSegment !== "OUTROS" && (
        <p className="text-muted-foreground text-xs">
          Segmento declarado ({detail.declaredSegment}) é mantido.
        </p>
      )}
    </div>
  );
}
