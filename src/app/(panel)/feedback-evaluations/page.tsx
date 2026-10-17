"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Download, Loader2, MessageSquareText, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import {
  ASPECT_LABEL,
  RULE_LABEL,
  STATUS_LABEL,
  TARGET_LABEL,
  VERDICT_LABEL,
  alertSentence,
  evalKeys,
  overviewSentence,
  pct,
  reasonLabel,
  type AgreementCell,
  type EvaluationPage,
  type EvaluationSettings,
  type EvaluationSummary,
} from "@/lib/feedback-evaluations";
import { PageHeader } from "@/components/page-header";
import { PaginationBar } from "@/components/pagination-bar";
import {
  AnswerBadge,
  EvaluationDialog,
  targetText,
  type ReportPerson,
} from "@/components/feedback-evaluations/evaluation-dialog";
import { EvaluationReportTab } from "@/components/feedback-evaluations/evaluation-report-tab";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const PAGE_SIZE = 30;
const ALL = "all";
const TABS = ["overview", "list", "relatorio", "settings"] as const;
type Tab = (typeof TABS)[number];

export default function FeedbackEvaluationsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <FeedbackEvaluations />
    </Suspense>
  );
}

function FeedbackEvaluations() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [days, setDays] = useState(28);

  const tabParam = searchParams.get("tab");
  const tab: Tab = (TABS as readonly string[]).includes(tabParam ?? "") ? (tabParam as Tab) : "overview";
  const urlUserId = searchParams.get("userId");
  // Nome e e-mail de quem veio do detalhe; pela URL só chega o id.
  const [person, setPerson] = useState<ReportPerson | null>(null);
  const reportPerson: ReportPerson | null = urlUserId
    ? person?.id === urlUserId
      ? person
      : { id: urlUserId, name: null, email: null }
    : null;

  const navigate = useCallback(
    (next: Tab, userId: string | null) => {
      const q = new URLSearchParams();
      if (next !== "overview") q.set("tab", next);
      // A pessoa do relatório fica na URL ao trocar de aba, para não se perder.
      if (userId) q.set("userId", userId);
      const qs = q.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  const openReport = useCallback(
    (p: ReportPerson | null) => {
      setPerson(p);
      navigate("relatorio", p?.id ?? null);
    },
    [navigate],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Avaliações de feedback"
        description="O que as pessoas dizem sobre o retorno das análises, amarrado ao resultado e à versão que o gerou."
      >
        {tab !== "relatorio" && (
          <>
            <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
              <SelectTrigger className="w-40" aria-label="Período">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="28">Últimos 28 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>
            <ExportButton days={days} />
          </>
        )}
      </PageHeader>

      <Tabs value={tab} onValueChange={(v) => navigate(v as Tab, reportPerson?.id ?? null)}>
        <TabsList>
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="list">Avaliações</TabsTrigger>
          <TabsTrigger value="relatorio">Relatório</TabsTrigger>
          <TabsTrigger value="settings">Configuração</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-6">
          <Overview days={days} />
        </TabsContent>
        <TabsContent value="list" className="mt-6">
          <EvaluationList onReport={openReport} />
        </TabsContent>
        <TabsContent value="relatorio" className="mt-6">
          <EvaluationReportTab person={reportPerson} onPersonChange={openReport} />
        </TabsContent>
        <TabsContent value="settings" className="mt-6">
          <SettingsForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Visão geral ──────────────────────────────────────────────────────────────

function Overview({ days }: { days: number }) {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: evalKeys.summary(days),
    queryFn: () => api.get<EvaluationSummary>(`/admin/feedback-evaluations/summary?days=${days}`),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (isError || !data) {
    return (
      <Card>
        <CardContent className="flex items-center justify-between gap-4 py-6">
          <p className="text-destructive text-sm">{(error as Error)?.message ?? "Não foi possível carregar o resumo."}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Tentar de novo
          </Button>
        </CardContent>
      </Card>
    );
  }

  const self = data.funnel.selfAssessment;
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex items-start justify-between gap-4 py-5">
          <div className="space-y-2">
            <p className="text-sm leading-relaxed">{overviewSentence(data)}</p>
            {self.shown > 0 && (
              <p className="text-muted-foreground text-sm">
                A autoavaliação na espera apareceu {self.shown} {self.shown === 1 ? "vez" : "vezes"} e foi respondida em{" "}
                {pct(self.answered / self.shown)} delas.
              </p>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={() => refetch()} aria-label="Atualizar" disabled={isFetching}>
            <RefreshCw className={isFetching ? "size-4 animate-spin" : "size-4"} />
          </Button>
        </CardContent>
      </Card>

      {data.alerts.length > 0 && (
        <Card className="border-amber-300 dark:border-amber-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-amber-600" />
              Pontos de atenção
            </CardTitle>
            <CardDescription>
              Recortes com pelo menos 30 respostas e concordância abaixo de 55%, ou queda de 15 pontos na última semana.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {data.alerts.map((a) => (
                <li key={`${a.kind}:${a.scope}:${a.key}`}>{alertSentence(a)}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <AgreementTable
          title="Por aspecto"
          description="👍/👎 nos cartões de destaque e melhoria."
          cells={data.byAspect}
          label={(k) => ASPECT_LABEL[k] ?? k}
        />
        <AgreementTable
          title="Textos da IA"
          description="Resumo e dica do topo do resultado."
          cells={data.byLlmText}
          label={(k) => ASPECT_LABEL[k] ?? k}
        />
        <AgreementTable
          title="Por versão do prompt"
          description="Pergunta global, pela versão que escreveu o texto."
          cells={data.byPromptVersion}
          label={(k) => k}
        />
        <AgreementTable
          title="Por versão do catálogo de frases"
          description="Pergunta global, pela versão das frases da tela."
          cells={data.byCopyVersion}
          label={(k) => k}
        />
        <AgreementTable
          title="Por motivo de perguntar"
          description="Regra que decidiu mostrar a pergunta."
          cells={data.byRule}
          label={(k) => RULE_LABEL[k] ?? k}
        />
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Motivos mais citados</CardTitle>
            <CardDescription>Marcados pela pessoa; “(IA)” veio da leitura do comentário.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.topReasons.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum motivo no período.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {data.topReasons.map((r) => (
                  <li key={r.reason} className="flex justify-between gap-4">
                    <span>{reasonLabel(r.reason)}</span>
                    <span className="tabular-nums text-muted-foreground">{r.n}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <AgreementTable
        title="Por frase exibida"
        description="Cada frase do catálogo (aspecto.faixa.variante) e cada texto avaliado."
        cells={data.byPhrase.slice(0, 40)}
        label={(k) => k}
        mono
      />
    </div>
  );
}

function AgreementTable({
  title,
  description,
  cells,
  label,
  mono,
}: {
  title: string;
  description: string;
  cells: AgreementCell[];
  label: (key: string) => string;
  mono?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {cells.length === 0 ? (
          <p className="text-muted-foreground text-sm">Sem respostas no período.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recorte</TableHead>
                <TableHead className="text-right">Respostas</TableHead>
                <TableHead className="text-right">Bateu</TableHead>
                <TableHead className="text-right">Em parte</TableHead>
                <TableHead className="text-right">Não bateu</TableHead>
                <TableHead className="text-right">Concordância</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cells.map((c) => (
                <TableRow key={c.key}>
                  <TableCell className={mono ? "font-mono text-xs" : undefined}>{label(c.key)}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.n}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.agree}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.partial}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.disagree}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    <span className={c.rate != null && c.n >= 30 && c.rate < 0.55 ? "text-amber-600" : undefined}>
                      {pct(c.rate)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Lista ────────────────────────────────────────────────────────────────────

interface Filters {
  targetType: string;
  verdict: string;
  status: string;
  hasComment: string;
  promptVersion: string;
}

const EMPTY_FILTERS: Filters = { targetType: ALL, verdict: ALL, status: "ANSWERED", hasComment: ALL, promptVersion: "" };

function EvaluationList({ onReport }: { onReport: (person: ReportPerson) => void }) {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);

  const params = useMemo(() => {
    const p = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (filters.targetType !== ALL) p.set("targetType", filters.targetType);
    if (filters.verdict !== ALL) p.set("verdict", filters.verdict);
    if (filters.status !== ALL) p.set("status", filters.status);
    if (filters.hasComment !== ALL) p.set("hasComment", filters.hasComment);
    if (filters.promptVersion.trim()) p.set("promptVersion", filters.promptVersion.trim());
    return p.toString();
  }, [filters, page]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: evalKeys.list(params),
    queryFn: () => api.get<EvaluationPage>(`/admin/feedback-evaluations?${params}`),
  });

  const update = (patch: Partial<Filters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <FilterSelect
          label="Alvo"
          value={filters.targetType}
          onChange={(v) => update({ targetType: v })}
          options={Object.entries(TARGET_LABEL).map(([value, label]) => ({ value, label }))}
        />
        <FilterSelect
          label="Resposta"
          value={filters.verdict}
          onChange={(v) => update({ verdict: v })}
          options={Object.entries(VERDICT_LABEL).map(([value, label]) => ({ value, label }))}
        />
        <FilterSelect
          label="Situação"
          value={filters.status}
          onChange={(v) => update({ status: v })}
          options={Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }))}
        />
        <FilterSelect
          label="Comentário"
          value={filters.hasComment}
          onChange={(v) => update({ hasComment: v })}
          options={[
            { value: "true", label: "Com comentário" },
            { value: "false", label: "Sem comentário" },
          ]}
        />
        <div className="space-y-1.5">
          <Label htmlFor="eval-prompt">Versão do prompt</Label>
          <Input
            id="eval-prompt"
            placeholder="ex.: v3"
            value={filters.promptVersion}
            onChange={(e) => update({ promptVersion: e.target.value })}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : isError ? (
            <p className="text-destructive p-6 text-sm">{(error as Error).message}</p>
          ) : !data?.items.length ? (
            <p className="text-muted-foreground p-6 text-sm">Nenhuma avaliação com esses filtros.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quando</TableHead>
                  <TableHead>Pessoa</TableHead>
                  <TableHead>Alvo</TableHead>
                  <TableHead>Resposta</TableHead>
                  <TableHead>Motivos</TableHead>
                  <TableHead>Versão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((row) => (
                  <TableRow key={row.id} className="cursor-pointer" onClick={() => setOpenId(row.id)}>
                    <TableCell className="whitespace-nowrap text-xs">{formatDateTime(row.createdAt)}</TableCell>
                    <TableCell className="max-w-48 truncate text-sm">{row.user?.name ?? row.user?.email ?? "—"}</TableCell>
                    <TableCell className="text-sm">{targetText(row)}</TableCell>
                    <TableCell>
                      <AnswerBadge row={row} />
                    </TableCell>
                    <TableCell className="max-w-72">
                      <div className="flex flex-wrap items-center gap-1">
                        {row.reasons.map((r) => (
                          <Badge key={r} variant={r.startsWith("ai:") ? "outline" : "secondary"}>
                            {reasonLabel(r)}
                          </Badge>
                        ))}
                        {row.comment && <MessageSquareText className="text-muted-foreground size-4" aria-label="Tem comentário" />}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{row.promptVersion ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {data && data.total > PAGE_SIZE && (
        <PaginationBar page={page} totalPages={Math.ceil(data.total / PAGE_SIZE)} total={data.total} onPageChange={setPage} />
      )}

      <EvaluationDialog
        id={openId}
        onClose={() => setOpenId(null)}
        onReport={(p) => {
          setOpenId(null);
          onReport(p);
        }}
      />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full" aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ─── Configuração ─────────────────────────────────────────────────────────────

const FIELDS: Array<{
  key: Exclude<keyof EvaluationSettings, "onboardingAnalyses">;
  label: string;
  hint: string;
  step: number;
  min: number;
  max: number;
}> = [
  { key: "baseSampleRate", label: "Amostra base", hint: "Fração das análises (0 a 1) que recebe a pergunta por sorteio.", step: 0.05, min: 0, max: 1 },
  { key: "maxAsksPerDay", label: "Máximo por dia", hint: "Perguntas globais por pessoa por dia (fora a de percepção longe da nota).", step: 1, min: 0, max: 10 },
  { key: "maxAsksPerWeek", label: "Máximo por semana", hint: "Semana de segunda a domingo.", step: 1, min: 0, max: 50 },
  { key: "pauseAfterDismissStreak", label: "Pausar depois de descartes seguidos", hint: "Quantos “Agora não” seguidos param as perguntas.", step: 1, min: 1, max: 10 },
  { key: "pauseDays", label: "Dias de pausa", hint: "Quanto tempo a pausa dura.", step: 1, min: 0, max: 90 },
  { key: "newVersionQuota", label: "Respostas por versão nova", hint: "Até atingir, toda versão nova de prompt ou catálogo pergunta mais.", step: 10, min: 0, max: 10000 },
  { key: "selfGapBands", label: "Distância de faixas", hint: "Diferença entre a autoavaliação e a nota que força a pergunta.", step: 1, min: 1, max: 4 },
  { key: "fallbackAskRate", label: "Amostra sem IA", hint: "Fração dos resultados sem LLM que recebe a pergunta.", step: 0.05, min: 0, max: 1 },
];

function SettingsForm() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: evalKeys.settings(),
    queryFn: () => api.get<EvaluationSettings>("/admin/feedback-evaluations/settings"),
  });
  const [draft, setDraft] = useState<Partial<Record<keyof EvaluationSettings, string>>>({});

  const save = useMutation({
    mutationFn: (body: Partial<EvaluationSettings>) =>
      api.put<EvaluationSettings>("/admin/feedback-evaluations/settings", body),
    onSuccess: (next) => {
      qc.setQueryData(evalKeys.settings(), next);
      setDraft({});
      toast.success("Configuração salva. Vale em até 1 minuto.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !data) return <Skeleton className="h-96 w-full" />;

  const valueOf = (k: keyof EvaluationSettings) =>
    draft[k] ?? (k === "onboardingAnalyses" ? data.onboardingAnalyses.join(", ") : String(data[k]));

  const submit = () => {
    const body: Partial<EvaluationSettings> = {};
    for (const f of FIELDS) {
      if (draft[f.key] == null) continue;
      const n = Number(draft[f.key]);
      if (!Number.isFinite(n) || n < f.min || n > f.max) {
        toast.error(`${f.label}: use um número entre ${f.min} e ${f.max}.`);
        return;
      }
      body[f.key] = n;
    }
    if (draft.onboardingAnalyses != null) {
      const list = draft.onboardingAnalyses
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isInteger(n) && n >= 1);
      body.onboardingAnalyses = [...new Set(list)].slice(0, 10);
    }
    if (Object.keys(body).length === 0) return;
    save.mutate(body);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Quando perguntar</CardTitle>
        <CardDescription>
          A política roda na API a cada análise aberta. Mudanças valem para as próximas aberturas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-5 sm:grid-cols-2">
          {FIELDS.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label htmlFor={`s-${f.key}`}>{f.label}</Label>
              <Input
                id={`s-${f.key}`}
                type="number"
                step={f.step}
                min={f.min}
                max={f.max}
                value={valueOf(f.key)}
                onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
              />
              <p className="text-muted-foreground text-xs">{f.hint}</p>
            </div>
          ))}
          <div className="space-y-1.5">
            <Label htmlFor="s-onboarding">Sempre perguntar nas análises nº</Label>
            <Input
              id="s-onboarding"
              value={valueOf("onboardingAnalyses")}
              onChange={(e) => setDraft((d) => ({ ...d, onboardingAnalyses: e.target.value }))}
            />
            <p className="text-muted-foreground text-xs">Posição entre as análises concluídas da pessoa, separadas por vírgula.</p>
          </div>
        </div>
        <Button onClick={submit} disabled={save.isPending || Object.keys(draft).length === 0}>
          {save.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Salvar
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Exportação ───────────────────────────────────────────────────────────────

function ExportButton({ days }: { days: number }) {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      const text = await api.get<string>(`/admin/feedback-evaluations/export?days=${days}&limit=500`);
      const content = typeof text === "string" ? text : JSON.stringify(text);
      if (!content.trim()) {
        toast.info("Nenhuma análise com resposta no período.");
        return;
      }
      const url = URL.createObjectURL(new Blob([content], { type: "application/x-ndjson" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `avaliacoes-de-feedback-${days}d.jsonl`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Button variant="outline" onClick={run} disabled={busy} title="Um caso por análise com resposta, para avaliar prompts offline">
      {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
      Exportar conjunto de ouro
    </Button>
  );
}
