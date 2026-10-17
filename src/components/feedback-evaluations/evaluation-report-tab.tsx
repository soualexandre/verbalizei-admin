"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Copy, FileBarChart, FileJson, FileText, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
  KIND_LABEL,
  downloadText,
  reportFileName,
  reportQuery,
  type ReportParams,
  type ReportResponse,
} from "@/lib/evaluation-report";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EvaluationDialog, type ReportPerson } from "./evaluation-dialog";
import { ReportView } from "./report-view";
import { UserPicker } from "./user-picker";

const ALL = "all";

export function EvaluationReportTab({
  person,
  onPersonChange,
}: {
  person: ReportPerson | null;
  onPersonChange: (person: ReportPerson | null) => void;
}) {
  const [days, setDays] = useState(28);
  const [kind, setKind] = useState<string>(ALL);
  const [promptVersion, setPromptVersion] = useState("");
  const [ai, setAi] = useState(false);
  const [openEvaluation, setOpenEvaluation] = useState<string | null>(null);

  const generate = useMutation({
    mutationFn: (p: ReportParams) =>
      api.get<ReportResponse>(`/admin/feedback-evaluations/report?${reportQuery(p)}`),
    onSuccess: (res, p) => {
      if (p.ai && res.insightsError) toast.warning("Relatório gerado, mas as recomendações da IA falharam.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const elapsed = useElapsed(generate.isPending);
  const data = generate.data;
  const report = data?.report;

  // Pela URL só chega o id: completa nome e e-mail quando o relatório traz a pessoa.
  const shownPerson =
    person && !person.name && !person.email && report?.scope.user?.id === person.id
      ? { id: person.id, name: report.scope.user.name, email: report.scope.user.email }
      : person;

  const run = () =>
    generate.mutate({
      days,
      userId: person?.id ?? null,
      kind: kind === ALL ? null : kind,
      promptVersion,
      ai,
    });

  const copyMarkdown = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.markdown);
      toast.success("Markdown copiado.");
    } catch {
      toast.error("Não foi possível copiar. Use “Baixar Markdown”.");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4 py-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[10rem_minmax(16rem,1fr)_12rem_10rem]">
            <div className="space-y-1.5">
              <Label>Período</Label>
              <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
                <SelectTrigger className="w-full" aria-label="Período">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="28">Últimos 28 dias</SelectItem>
                  <SelectItem value="90">Últimos 90 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="report-user">Pessoa</Label>
              <UserPicker id="report-user" value={shownPerson} onChange={onPersonChange} />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de análise</Label>
              <Select value={kind} onValueChange={setKind}>
                <SelectTrigger className="w-full" aria-label="Tipo de análise">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos</SelectItem>
                  {Object.entries(KIND_LABEL).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="report-prompt">Versão do prompt</Label>
              <Input
                id="report-prompt"
                placeholder="Todas"
                value={promptVersion}
                onChange={(e) => setPromptVersion(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={ai} onCheckedChange={setAi} aria-label="Incluir recomendações da IA" />
              <span>
                Incluir recomendações da IA
                <span className="text-muted-foreground"> · pode levar até 1 minuto</span>
              </span>
            </label>
            <Button onClick={run} disabled={generate.isPending}>
              {generate.isPending ? <Loader2 className="size-4 animate-spin" /> : <FileBarChart className="size-4" />}
              Gerar relatório
            </Button>
          </div>
        </CardContent>
      </Card>

      {generate.isPending ? (
        <Card>
          <CardContent className="space-y-4 py-6">
            <p className="text-muted-foreground flex items-center gap-2 text-sm">
              {generate.variables?.ai ? <Sparkles className="size-4" /> : <Loader2 className="size-4 animate-spin" />}
              {generate.variables?.ai
                ? `Cruzando as respostas e pedindo recomendações à IA… ${elapsed} s (pode levar até 1 minuto).`
                : `Cruzando as respostas com os resultados… ${elapsed} s`}
            </p>
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      ) : generate.isError && !data ? (
        <Card>
          <CardContent className="flex items-center justify-between gap-4 py-6">
            <p className="text-destructive text-sm">{generate.error.message}</p>
            <Button variant="outline" size="sm" onClick={run}>
              Tentar de novo
            </Button>
          </CardContent>
        </Card>
      ) : !data ? (
        <Card>
          <CardContent className="text-muted-foreground py-10 text-center text-sm">
            Escolha os filtros e clique em “Gerar relatório”. Ele cruza cada resposta com o resultado e as métricas
            da pipeline, para mostrar onde a nota, a frase ou o texto da IA não bateram e para que lado erraram.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() =>
                downloadText(data.markdown, reportFileName("md", data.report.generatedAt), "text/markdown;charset=utf-8")
              }
            >
              <FileText className="size-4" />
              Baixar Markdown
            </Button>
            <Button variant="outline" onClick={copyMarkdown}>
              <Copy className="size-4" />
              Copiar Markdown
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                downloadText(
                  JSON.stringify(data, null, 2),
                  reportFileName("json", data.report.generatedAt),
                  "application/json;charset=utf-8",
                )
              }
            >
              <FileJson className="size-4" />
              Baixar JSON
            </Button>
          </div>
          <ReportView data={data} onOpenEvaluation={setOpenEvaluation} />
        </>
      )}

      <EvaluationDialog id={openEvaluation} onClose={() => setOpenEvaluation(null)} />
    </div>
  );
}

/** Segundos desde que `running` virou true. */
function useElapsed(running: boolean): number {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!running) return;
    setSeconds(0);
    const started = Date.now();
    const t = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(t);
  }, [running]);
  return seconds;
}
