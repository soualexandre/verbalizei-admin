"use client";

import { useQuery } from "@tanstack/react-query";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/lib/api";
import type { EvolutionPoint, RecordingKind } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { fmt } from "@/components/dashboard/format";
import { InsightList, Section, type InsightTone } from "@/components/page-hero";
import { ErrorState } from "@/components/error-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CATEGORY_LABEL, fmtNum, kindLabel, RANGES } from "./metric-ranges";

const AXIS = { fontSize: 12, fill: "var(--muted-foreground)" };

type Row = EvolutionPoint & { n: number; day: string };

/** Como as medidas da pessoa mudaram de uma análise para a outra. */
export function EvolutionTab({ userId }: { userId: string }) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["user-evolution", userId],
    queryFn: () => api.get<{ points: EvolutionPoint[] }>(`/admin/users/${userId}/evolution`),
  });

  if (isError) return <ErrorState title="Não foi possível carregar a evolução." error={error} onRetry={() => refetch()} />;
  if (isLoading || !data) {
    return (
      <div className="grid gap-4 md:grid-cols-2" aria-busy="true" aria-label="Carregando a evolução">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="rounded-card h-72" />
        ))}
      </div>
    );
  }

  const rows: Row[] = data.points.map((p, i) => ({
    ...p,
    n: i + 1,
    day: new Date(p.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    ...Object.fromEntries(Object.entries(p.categories ?? {}).map(([k, v]) => [`cat_${k}`, v])),
  }));

  if (!rows.length) {
    return (
      <Section title="Evolução" description="Como as medidas da pessoa mudam de uma análise para a outra.">
        <Card className="shadow-none">
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-sm">Nenhuma análise concluída ainda.</p>
          </CardContent>
        </Card>
      </Section>
    );
  }

  const catKeys = ["clarity", "structure", "pace", "engagement"].filter((k) => rows.some((r) => r.categories?.[k] != null));

  return (
    <div className="space-y-12">
      <Section
        title="Evolução"
        description={`${fmt(rows.length)} ${rows.length === 1 ? "análise concluída" : "análises concluídas"}, da mais antiga para a mais nova. A faixa verde é o que a régua considera bom.`}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <ChartCard title="Nota geral" description="De 0 a 100." rows={rows} dataKey="overallScore" domain={[0, 100]} />
          <ChartCard title="Ritmo" description={`Palavras por minuto; ${RANGES.pace.text}.`} rows={rows} dataKey="wpm" band={[110, 160]} />
          <ChartCard title="Muletas por minuto" description={RANGES.fillers.text[0].toUpperCase() + RANGES.fillers.text.slice(1) + "."} rows={rows} dataKey="fillersPerMinute" band={[0, 2]} />
          <ChartCard title="Maior pausa" description={`Em segundos; ${RANGES.pause.text}.`} rows={rows} dataKey="longestPause" band={[0, 1.5]} unit=" s" />
          {catKeys.length > 0 && (
            <Card className="shadow-none md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Notas por área</CardTitle>
                <CardDescription>Clareza, estrutura, ritmo e envolvimento, de 0 a 100.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
                      <CartesianGrid vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="day" tick={AXIS} tickLine={false} axisLine={false} minTickGap={16} />
                      <YAxis domain={[0, 100]} tick={AXIS} tickLine={false} axisLine={false} width={52} />
                      <Tooltip content={<PointTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      {catKeys.map((k, i) => (
                        <Line
                          key={k}
                          type="monotone"
                          dataKey={`cat_${k}`}
                          name={CATEGORY_LABEL[k] ?? k}
                          stroke={`var(--chart-${i + 1})`}
                          strokeWidth={2}
                          dot={rows.length <= 30 ? { r: 2.5 } : false}
                          connectNulls
                          isAnimationActive={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </Section>

      <Section title="O que os números dizem" description="As 3 primeiras análises contra as 3 últimas.">
        <InsightList items={insights(rows)} />
      </Section>
    </div>
  );
}

function PointTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name?: string; value?: number; color?: string; payload?: Row }> }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="bg-card min-w-40 rounded-lg border px-3 py-2 text-xs shadow-md">
      {p && (
        <p className="mb-1 font-semibold">
          {formatDate(p.createdAt)} · {kindLabel(p.kind)}
        </p>
      )}
      {p?.title && <p className="text-muted-foreground mb-1 max-w-56 truncate">{p.title}</p>}
      {payload.map((r) => (
        <div key={r.name} className="flex items-center justify-between gap-4 tabular-nums">
          <span className="text-muted-foreground flex items-center gap-1.5">
            {r.color && <span className="size-2 rounded-full" style={{ background: r.color }} />}
            {r.name}
          </span>
          <span className="font-medium">{r.value != null ? fmtNum(r.value) : "—"}</span>
        </div>
      ))}
    </div>
  );
}

function ChartCard({
  title,
  description,
  rows,
  dataKey,
  band,
  domain,
  unit,
}: {
  title: string;
  description: string;
  rows: Row[];
  dataKey: keyof Row;
  band?: [number, number];
  domain?: [number, number];
  unit?: string;
}) {
  const has = rows.some((r) => r[dataKey] != null);
  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {!has ? (
          <p className="text-muted-foreground text-sm">Sem esta medida nas análises.</p>
        ) : (
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                {band && <ReferenceArea y1={band[0]} y2={band[1]} fill="var(--green-100)" fillOpacity={0.7} stroke="none" ifOverflow="extendDomain" />}
                <XAxis dataKey="day" tick={AXIS} tickLine={false} axisLine={false} minTickGap={16} />
                <YAxis domain={domain ?? ["auto", "auto"]} tick={AXIS} tickLine={false} axisLine={false} width={52} unit={unit} />
                <Tooltip content={<PointTooltip />} />
                <Line
                  type="monotone"
                  dataKey={dataKey as string}
                  name={title}
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  dot={rows.length <= 30 ? { r: 3, fill: "var(--chart-1)" } : false}
                  activeDot={{ r: 5, fill: "var(--chart-1)", stroke: "var(--card)", strokeWidth: 2 }}
                  connectNulls
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Insights ─────────────────────────────────────────────────────────────────

const avg = (xs: Array<number | null | undefined>) => {
  const v = xs.filter((x): x is number => typeof x === "number");
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};

/** Distância até a faixa boa (0 dentro dela). */
const outside = (v: number, [lo, hi]: readonly [number, number]) => (v < lo ? lo - v : v > hi ? v - hi : 0);

function insights(rows: Row[]): Array<{ text: React.ReactNode; tone: InsightTone }> {
  const items: Array<{ text: React.ReactNode; tone: InsightTone }> = [];
  const k = Math.min(3, Math.floor(rows.length / 2));

  if (k >= 1) {
    const first = rows.slice(0, k);
    const last = rows.slice(-k);
    const compare = (
      label: string,
      pick: (r: Row) => number | null | undefined,
      opts: { better: "up" | "down" | "range"; threshold: number; digits?: number; unit?: string; plural?: boolean },
    ) => {
      const a = avg(first.map(pick));
      const b = avg(last.map(pick));
      if (a == null || b == null) return;
      let delta: number;
      if (opts.better === "range") delta = outside(a, RANGES.pace.good) - outside(b, RANGES.pace.good);
      else delta = opts.better === "up" ? b - a : a - b;
      const tone: InsightTone = Math.abs(delta) < opts.threshold ? "neutral" : delta > 0 ? "green" : "lime";
      // Ritmo dentro da faixa boa nas duas pontas não "ficou estável": seguiu bom, mesmo mudando.
      const bothGood = opts.better === "range" && outside(a, RANGES.pace.good) === 0 && outside(b, RANGES.pace.good) === 0;
      const verb = bothGood
        ? "seguiu na faixa boa"
        : opts.plural
          ? tone === "neutral" ? "ficaram estáveis" : tone === "green" ? "melhoraram" : "pioraram"
          : tone === "neutral" ? "ficou estável" : tone === "green" ? "melhorou" : "piorou";
      const u = opts.unit ?? "";
      items.push({
        tone,
        text: (
          <>
            {label} <strong>{verb}</strong>: de {fmtNum(a, opts.digits ?? 1)}
            {u} para {fmtNum(b, opts.digits ?? 1)}
            {u} em média.
          </>
        ),
      });
    };
    compare("A nota geral", (r) => r.overallScore, { better: "up", threshold: 3, digits: 0 });
    compare("O ritmo", (r) => r.wpm, { better: "range", threshold: 5, digits: 0, unit: " palavras/min" });
    compare("As muletas", (r) => r.fillersPerMinute, { better: "down", threshold: 0.5, unit: " por minuto", plural: true });
    compare("A maior pausa", (r) => r.longestPause, { better: "down", threshold: 0.3, unit: " s" });
    compare("A monotonia", (r) => r.monotony, { better: "down", threshold: 5, digits: 0 });
  } else {
    items.push({ tone: "neutral", text: "Só uma análise concluída: ainda não dá para comparar começo e agora." });
  }

  const firstAt = new Date(rows[0].createdAt).getTime();
  const lastAt = new Date(rows[rows.length - 1].createdAt).getTime();
  const weeks = Math.max(1, (lastAt - firstAt) / (7 * 86_400_000));
  const perWeek = rows.length / weeks;
  items.push({
    tone: "brand",
    text: (
      <>
        Faz <strong>{fmtNum(perWeek)}</strong> {perWeek === 1 ? "análise" : "análises"} por semana em média, desde {formatDate(rows[0].createdAt)}.
      </>
    ),
  });

  const byKind = new Map<RecordingKind, number>();
  for (const r of rows) byKind.set(r.kind, (byKind.get(r.kind) ?? 0) + 1);
  const [topKind, topN] = [...byKind.entries()].sort((a, b) => b[1] - a[1])[0];
  items.push({
    tone: "brand",
    text: (
      <>
        O tipo mais usado é <strong>{kindLabel(topKind).toLowerCase()}</strong>: {fmt(topN)} de {fmt(rows.length)} análises.
      </>
    ),
  });

  return items;
}
