"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Unit, UserSegment } from "@/lib/types";
import { USER_SEGMENTS } from "@/lib/types";
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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export function UnitDialog({
  unit,
  open,
  onOpenChange,
  onSaved,
}: {
  unit: Unit | null | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const isEdit = !!unit;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [order, setOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [segments, setSegments] = useState<UserSegment[]>([]);

  useEffect(() => {
    if (open) {
      setTitle(unit?.title ?? "");
      setDescription(unit?.description ?? "");
      setColor(unit?.color ?? "#6366f1");
      setOrder(unit?.order ?? 0);
      setIsActive(unit?.isActive ?? true);
      setSegments(unit?.segments ?? []);
    }
  }, [open, unit]);

  const mutation = useMutation({
    mutationFn: () => {
      const body = {
        title,
        description: description || undefined,
        color: color || undefined,
        order,
        isActive,
        segments,
      };
      return isEdit
        ? api.patch(`/admin/units/${unit!.id}`, body)
        : api.post("/admin/units", body);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Unidade atualizada." : "Unidade criada.");
      onSaved();
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  function toggleSegment(s: UserSegment) {
    setSegments((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar unidade" : "Nova unidade"}</DialogTitle>
          <DialogDescription>
            Unidades agrupam módulos da trilha por tema ou segmento.
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded-md border"
                />
                <Input value={color} onChange={(e) => setColor(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Ordem</Label>
              <Input
                type="number"
                min={0}
                value={order}
                onChange={(e) => setOrder(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Segmentos</Label>
            <div className="flex flex-wrap gap-2">
              {USER_SEGMENTS.map((s) => (
                <Badge
                  key={s}
                  variant={segments.includes(s) ? "default" : "outline"}
                  className={cn("cursor-pointer select-none")}
                  onClick={() => toggleSegment(s)}
                >
                  {s}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <Label htmlFor="unit-active">Unidade ativa</Label>
            <Switch
              id="unit-active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
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
