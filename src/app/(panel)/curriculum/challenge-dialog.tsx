"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AnalysisType, Challenge, ChallengeType } from "@/lib/types";
import { ANALYSIS_TYPES } from "@/lib/types";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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

const FORMAT_LABELS: Record<string, string> = {
  CENARIO: "Cenário",
  LEITURA: "Leitura",
  JOGO: "Jogo",
  RECONHECIMENTO: "Reconhecimento",
};

/** Rótulo do drillFormat em português; formato desconhecido passa como veio. */
export function formatLabel(format: string) {
  return FORMAT_LABELS[format] ?? format;
}

/**
 * Edita um micro-treino vivo. Só o conteúdo é editável: unidade, tipo, gap,
 * formato e ordem são a identidade do drill no catálogo do seed
 * (seed-microlearning.ts) e mudá-los aqui quebraria o pacote do gap.
 */
export function ChallengeDialog({
  challengeId,
  open,
  onOpenChange,
  onSaved,
}: {
  challengeId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [question, setQuestion] = useState("");
  const [topic, setTopic] = useState("");
  const [xpReward, setXpReward] = useState(5);
  const [analysisType, setAnalysisType] = useState<string>(NONE);
  const [minDuration, setMinDuration] = useState("");
  const [maxDuration, setMaxDuration] = useState("");
  const [textoAlvo, setTextoAlvo] = useState("");
  const [objetivoEsperado, setObjetivoEsperado] = useState("");
  const [drillRule, setDrillRule] = useState("");
  const [options, setOptions] = useState<OptionDraft[]>([]);

  const { data: existing, isLoading } = useQuery({
    queryKey: ["challenge", challengeId],
    queryFn: () => api.get<Challenge>(`/admin/challenges/${challengeId}`),
    enabled: open && !!challengeId,
  });

  useEffect(() => {
    if (!open || !existing) return;
    setQuestion(existing.question ?? "");
    setTopic(existing.topic ?? "");
    setXpReward(existing.xpReward ?? 5);
    setAnalysisType(existing.analysisType ?? NONE);
    setMinDuration(existing.minDuration?.toString() ?? "");
    setMaxDuration(existing.maxDuration?.toString() ?? "");
    setTextoAlvo(existing.textoAlvo ?? "");
    setObjetivoEsperado(existing.objetivoEsperado ?? "");
    setDrillRule(existing.drillRule ?? "");
    setOptions(
      (existing.options ?? []).map((o) => ({
        id: o.id,
        text: o.text ?? "",
        isCorrect: o.isCorrect,
        order: o.order,
      })),
    );
  }, [open, existing]);

  const type = existing?.type;
  const showOptions = !!type && TYPES_WITH_OPTIONS.includes(type);
  const isVoice = type === "VOICE_RECORDING";
  const showRule = existing?.drillFormat === "JOGO" || !!existing?.drillRule;

  const mutation = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = {
        question: question || null,
        topic: topic || null,
        xpReward,
        textoAlvo: textoAlvo || null,
        objetivoEsperado: objetivoEsperado || null,
      };
      if (isVoice) {
        body.analysisType =
          analysisType === NONE ? null : (analysisType as AnalysisType);
        body.minDuration = minDuration ? Number(minDuration) : null;
        body.maxDuration = maxDuration ? Number(maxDuration) : null;
      }
      if (showRule) body.drillRule = drillRule || null;
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
      return api.patch(`/admin/challenges/${challengeId}`, body);
    },
    onSuccess: () => {
      toast.success("Micro-treino atualizado.");
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
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar micro-treino</DialogTitle>
          <DialogDescription>
            A mudança vale na hora para quem receber este drill. Rodar o seed
            de micro-treinos de novo sobrescreve o que for editado aqui.
          </DialogDescription>
        </DialogHeader>

        {isLoading || !existing ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">
                {existing.gap?.label ?? "Sem gap"}
              </span>
              {existing.drillFormat && (
                <Badge variant="secondary">
                  {formatLabel(existing.drillFormat)}
                </Badge>
              )}
              <Badge variant="outline">{existing.type}</Badge>
            </div>

            <div className="space-y-2">
              <Label>Enunciado</Label>
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
                  className="tabular-nums"
                  onChange={(e) => setXpReward(Number(e.target.value))}
                />
              </div>
            </div>

            {isVoice && (
              <div className="grid grid-cols-3 gap-4">
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
                <div className="space-y-2">
                  <Label>Duração mín. (s)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={minDuration}
                    className="tabular-nums"
                    onChange={(e) => setMinDuration(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Duração máx. (s)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={maxDuration}
                    className="tabular-nums"
                    onChange={(e) => setMaxDuration(e.target.value)}
                  />
                </div>
              </div>
            )}

            {showRule && (
              <div className="space-y-2">
                <Label>Regra do jogo</Label>
                <Input
                  value={drillRule}
                  placeholder="Proibido: né, tipo, então"
                  onChange={(e) => setDrillRule(e.target.value)}
                />
              </div>
            )}

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

            {showOptions && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Alternativas</Label>
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
                    Alternativa
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
                        onClick={() =>
                          updateOption(i, { isCorrect: !o.isCorrect })
                        }
                      >
                        <Check className="size-4" />
                      </Button>
                      <Input
                        value={o.text}
                        placeholder={`Alternativa ${i + 1}`}
                        onChange={(e) =>
                          updateOption(i, { text: e.target.value })
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-9 shrink-0"
                        onClick={() =>
                          setOptions((prev) =>
                            prev.filter((_, idx) => idx !== i),
                          )
                        }
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !existing}
          >
            {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
