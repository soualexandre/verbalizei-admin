"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Session } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export function SessionDialog({
  unitId,
  session,
  open,
  onOpenChange,
  onSaved,
}: {
  unitId: string;
  session: Session | null | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const isEdit = !!session;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [guideCovered, setGuideCovered] = useState("");
  const [guideHowToPass, setGuideHowToPass] = useState("");
  const [order, setOrder] = useState(0);
  const [isFree, setIsFree] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(session?.title ?? "");
      setDescription(session?.description ?? "");
      setGuideCovered(session?.guideCovered ?? "");
      setGuideHowToPass(session?.guideHowToPass ?? "");
      setOrder(session?.order ?? 0);
      setIsFree(session?.isFree ?? false);
    }
  }, [open, session]);

  const mutation = useMutation({
    mutationFn: () => {
      const body = {
        title,
        description: description || undefined,
        guideCovered: guideCovered || undefined,
        guideHowToPass: guideHowToPass || undefined,
        order,
        isFree,
      };
      return isEdit
        ? api.patch(`/admin/sessions/${session!.id}`, body)
        : api.post(`/admin/units/${unitId}/sessions`, body);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Módulo atualizado." : "Módulo criado.");
      onSaved();
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar módulo" : "Novo módulo"}</DialogTitle>
          <DialogDescription>
            Módulos agrupam lições dentro de uma unidade.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>O que é abordado (guia)</Label>
            <Textarea
              value={guideCovered}
              onChange={(e) => setGuideCovered(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Como passar (guia)</Label>
            <Textarea
              value={guideHowToPass}
              onChange={(e) => setGuideHowToPass(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Ordem</Label>
              <Input
                type="number"
                min={0}
                value={order}
                onChange={(e) => setOrder(Number(e.target.value))}
              />
            </div>
            <div className="flex items-end justify-between rounded-md border p-3">
              <Label htmlFor="session-free">Módulo gratuito</Label>
              <Switch
                id="session-free"
                checked={isFree}
                onCheckedChange={setIsFree}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !title.trim()}
          >
            {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
