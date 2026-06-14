"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Lesson, SeniorityLevel } from "@/lib/types";
import { SENIORITY_LEVELS } from "@/lib/types";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const NONE = "__none__";

export function LessonDialog({
  sessionId,
  lesson,
  open,
  onOpenChange,
  onSaved,
}: {
  sessionId: string;
  lesson: Lesson | null | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const isEdit = !!lesson;
  const [type, setType] = useState("");
  const [position, setPosition] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [isPromotionLesson, setIsPromotionLesson] = useState(false);
  const [seniorityLevel, setSeniorityLevel] = useState<string>(NONE);

  useEffect(() => {
    if (open) {
      setType(lesson?.type ?? "");
      setPosition(lesson?.position ?? 0);
      setIsActive(lesson?.isActive ?? true);
      setIsPromotionLesson(lesson?.isPromotionLesson ?? false);
      setSeniorityLevel(lesson?.seniorityLevel ?? NONE);
    }
  }, [open, lesson]);

  const mutation = useMutation({
    mutationFn: () => {
      const body = {
        type,
        position,
        isActive,
        isPromotionLesson,
        seniorityLevel:
          seniorityLevel === NONE ? undefined : (seniorityLevel as SeniorityLevel),
      };
      return isEdit
        ? api.patch(`/admin/lessons/${lesson!.id}`, body)
        : api.post(`/admin/sessions/${sessionId}/lessons`, body);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Lição atualizada." : "Lição criada.");
      onSaved();
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar lição" : "Nova lição"}</DialogTitle>
          <DialogDescription>
            O tipo identifica o formato/pedagogia da lição (ex.: vocabulary,
            phrases).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Input
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="ex.: vocabulary"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Posição</Label>
              <Input
                type="number"
                min={0}
                value={position}
                onChange={(e) => setPosition(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Senioridade</Label>
              <Select value={seniorityLevel} onValueChange={setSeniorityLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Nenhuma</SelectItem>
                  {SENIORITY_LEVELS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <Label htmlFor="lesson-active">Lição ativa</Label>
            <Switch
              id="lesson-active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <Label htmlFor="lesson-promo">Lição de promoção</Label>
            <Switch
              id="lesson-promo"
              checked={isPromotionLesson}
              onCheckedChange={setIsPromotionLesson}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !type.trim()}
          >
            {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
