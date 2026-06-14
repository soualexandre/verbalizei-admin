"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  AnalysisType,
  Challenge,
  ChallengeType,
  Paginated,
  SeniorityLevel,
  Unit,
} from "@/lib/types";
import {
  ANALYSIS_TYPES,
  CHALLENGE_TYPES,
  SENIORITY_LEVELS,
} from "@/lib/types";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Trash2, Check } from "lucide-react";
import { toast } from "sonner";

const NONE = "__none__";

interface OptionDraft {
  id?: string;
  text: string;
  isCorrect: boolean;
  order: number;
}

const TYPES_WITH_OPTIONS: ChallengeType[] = ["MULTIPLE_CHOICE", "SELECT_IMAGE"];

export function ChallengeDialog({
  challengeId,
  defaultUnitId,
  open,
  onOpenChange,
  onSaved,
}: {
  challengeId: string | null;
  defaultUnitId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const qc = useQueryClient();
  const isEdit = !!challengeId;

  const [unitId, setUnitId] = useState("");
  const [type, setType] = useState<ChallengeType>("MULTIPLE_CHOICE");
  const [question, setQuestion] = useState("");
  const [topic, setTopic] = useState("");
  const [tongueTwister, setTongueTwister] = useState("");
  const [xpReward, setXpReward] = useState(10);
  const [seniorityLevel, setSeniorityLevel] = useState<string>(NONE);
  const [analysisType, setAnalysisType] = useState<string>(NONE);
  const [minDuration, setMinDuration] = useState("");
  const [maxDuration, setMaxDuration] = useState("");
  const [textoAlvo, setTextoAlvo] = useState("");
  const [objetivoEsperado, setObjetivoEsperado] = useState("");
  const [isPromotionChallenge, setIsPromotionChallenge] = useState(false);
  const [options, setOptions] = useState<OptionDraft[]>([]);

  const { data: units } = useQuery({
    queryKey: ["units-all"],
    queryFn: () => api.get<Paginated<Unit>>("/admin/units?limit=100"),
    enabled: open,
  });

  const { data: existing } = useQuery({
    queryKey: ["challenge", challengeId],
    queryFn: () => api.get<Challenge>(`/admin/challenges/${challengeId}`),
    enabled: open && isEdit,
  });

  useEffect(() => {
    if (!open) return;
    if (isEdit && existing) {
      setUnitId(existing.unitId);
      setType(existing.type);
      setQuestion(existing.question ?? "");
      setTopic(existing.topic ?? "");
      setTongueTwister(existing.tongueTwister ?? "");
      setXpReward(existing.xpReward ?? 10);
      setSeniorityLevel(existing.seniorityLevel ?? NONE);
      setAnalysisType(existing.analysisType ?? NONE);
      setMinDuration(existing.minDuration?.toString() ?? "");
      setMaxDuration(existing.maxDuration?.toString() ?? "");
      setTextoAlvo(existing.textoAlvo ?? "");
      setObjetivoEsperado(existing.objetivoEsperado ?? "");
      setIsPromotionChallenge(existing.isPromotionChallenge ?? false);
      setOptions(
        (existing.options ?? []).map((o) => ({
          id: o.id,
          text: o.text ?? "",
          isCorrect: o.isCorrect,
          order: o.order,
        })),
      );
    } else if (!isEdit) {
      setUnitId(defaultUnitId ?? "");
      setType("MULTIPLE_CHOICE");
      setQuestion("");
      setTopic("");
      setTongueTwister("");
      setXpReward(10);
      setSeniorityLevel(NONE);
      setAnalysisType(NONE);
      setMinDuration("");
      setMaxDuration("");
      setTextoAlvo("");
      setObjetivoEsperado("");
      setIsPromotionChallenge(false);
      setOptions([
        { text: "", isCorrect: true, order: 0 },
        { text: "", isCorrect: false, order: 1 },
      ]);
    }
  }, [open, isEdit, existing, defaultUnitId]);

  const showOptions = TYPES_WITH_OPTIONS.includes(type);

  const mutation = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = {
        unitId,
        type,
        question: question || null,
        topic: topic || null,
        tongueTwister: tongueTwister || null,
        xpReward,
        seniorityLevel:
          seniorityLevel === NONE ? null : (seniorityLevel as SeniorityLevel),
        analysisType:
          analysisType === NONE ? null : (analysisType as AnalysisType),
        minDuration: minDuration ? Number(minDuration) : null,
        maxDuration: maxDuration ? Number(maxDuration) : null,
        textoAlvo: textoAlvo || null,
        objetivoEsperado: objetivoEsperado || null,
        isPromotionChallenge,
      };
      if (showOptions) {
        body.options = options
          .filter((o) => o.text.trim())
          .map((o, i) => ({
            ...(o.id ? { id: o.id } : {}),
            text: o.text,
            isCorrect: o.isCorrect,
            order: i,
          }));
      }
      return isEdit
        ? api.patch(`/admin/challenges/${challengeId}`, body)
        : api.post("/admin/challenges", body);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Desafio atualizado." : "Desafio criado.");
      qc.invalidateQueries({ queryKey: ["challenges"] });
      onSaved();
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  function updateOption(i: number, patch: Partial<OptionDraft>) {
    setOptions((prev) =>
      prev.map((o, idx) => (idx === i ? { ...o, ...patch } : o)),
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar desafio" : "Novo desafio"}</DialogTitle>
          <DialogDescription>
            Configure o tipo, conteúdo e opções do desafio.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Unidade</Label>
              <Select value={unitId} onValueChange={setUnitId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione…" />
                </SelectTrigger>
                <SelectContent>
                  {units?.data.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as ChallengeType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHALLENGE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Enunciado / pergunta</Label>
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tópico</Label>
              <Input value={topic} onChange={(e) => setTopic(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>XP</Label>
              <Input
                type="number"
                min={0}
                value={xpReward}
                onChange={(e) => setXpReward(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
            <div className="space-y-2">
              <Label>Tipo de análise</Label>
              <Select value={analysisType} onValueChange={setAnalysisType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Nenhum</SelectItem>
                  {ANALYSIS_TYPES.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {type === "VOICE_RECORDING" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Duração mín. (s)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={minDuration}
                    onChange={(e) => setMinDuration(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Duração máx. (s)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={maxDuration}
                    onChange={(e) => setMaxDuration(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Trava-língua</Label>
                <Input
                  value={tongueTwister}
                  onChange={(e) => setTongueTwister(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Texto-alvo</Label>
                <Textarea
                  value={textoAlvo}
                  onChange={(e) => setTextoAlvo(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Objetivo esperado</Label>
                <Textarea
                  value={objetivoEsperado}
                  onChange={(e) => setObjetivoEsperado(e.target.value)}
                />
              </div>
            </>
          )}

          {showOptions && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Opções</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setOptions((prev) => [
                      ...prev,
                      { text: "", isCorrect: false, order: prev.length },
                    ])
                  }
                >
                  <Plus className="size-4" />
                  Opção
                </Button>
              </div>
              <div className="space-y-2">
                {options.map((o, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant={o.isCorrect ? "default" : "outline"}
                      size="icon"
                      className="size-9 shrink-0"
                      title="Marcar como correta"
                      onClick={() => updateOption(i, { isCorrect: !o.isCorrect })}
                    >
                      <Check className="size-4" />
                    </Button>
                    <Input
                      value={o.text}
                      placeholder={`Opção ${i + 1}`}
                      onChange={(e) => updateOption(i, { text: e.target.value })}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-9 shrink-0"
                      onClick={() =>
                        setOptions((prev) => prev.filter((_, idx) => idx !== i))
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between rounded-md border p-3">
            <Label htmlFor="ch-promo">Desafio de promoção</Label>
            <Switch
              id="ch-promo"
              checked={isPromotionChallenge}
              onCheckedChange={setIsPromotionChallenge}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !unitId}
          >
            {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
