"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Challenge } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

export function VariantsDialog({
  challenge,
  open,
  onOpenChange,
}: {
  challenge: Challenge | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [count, setCount] = useState(3);
  const [variants, setVariants] = useState<unknown[] | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      api.post<unknown[]>(`/admin/challenges/${challenge!.id}/generate-variants`, {
        count,
      }),
    onSuccess: (res) => {
      setVariants(Array.isArray(res) ? res : []);
      toast.success("Variantes geradas (pré-visualização).");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setVariants(null);
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="text-primary size-4" />
            Gerar variantes via IA
          </DialogTitle>
          <DialogDescription>
            Cria variações deste desafio para pré-visualização. Nada é salvo
            automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-end gap-3">
          <div className="space-y-2">
            <Label>Quantidade (1–5)</Label>
            <Input
              type="number"
              min={1}
              max={5}
              value={count}
              onChange={(e) =>
                setCount(Math.min(5, Math.max(1, Number(e.target.value))))
              }
              className="w-24"
            />
          </div>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
            Gerar
          </Button>
        </div>

        {variants && (
          <pre className="bg-muted max-h-80 overflow-auto rounded-md p-4 text-xs">
            {JSON.stringify(variants, null, 2)}
          </pre>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
