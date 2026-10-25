"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import { useState } from "react";
import type { DashboardOverview } from "@/lib/types";
import { fmt, KINDS, shortDay } from "./format";

type Daily = DashboardOverview["daily"];

const AXIS = { fontSize: 12, fill: "var(--muted-foreground)" };
const HEIGHT = 220;

/** Em 30 e 90 dias, nem todo dia ganha rótulo no eixo. */
const tickGap = (n: number) => (n <= 7 ? 0 : n <= 31 ? 4 : 13);

function Frame({ children }: { children: React.ReactElement }) {
  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height={HEIGHT}>
        {children}
      </ResponsiveContainer>
    </div>
  );
}

function TooltipBox({ title, rows, hint }: { title: string; rows: { label: string; value: number; color?: string }[]; hint?: string }) {
  return (
    <div className="bg-card min-w-36 rounded-lg border px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-semibold">{title}</p>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between gap-4 tabular-nums">
          <span className="text-muted-foreground flex items-center gap-1.5">
            {r.color && <span className="size-2 rounded-full" style={{ background: r.color }} />}
            {r.label}
          </span>
          <span className="font-medium">{fmt(r.value)}</span>
        </div>
      ))}
      {hint && <p className="text-muted-foreground mt-1.5 border-t pt-1.5">{hint}</p>}
    </div>
  );
}

/** Usuários ativos (fizeram ao menos uma interação) em cada dia do período. Clicar num dia abre quem treinou. */
export function ActiveUsersChart({ daily, onSelectDay }: { daily: Daily; onSelectDay?: (day: string) => void }) {
  return (
    <Frame>
      <AreaChart
        data={daily}
        margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
        className={onSelectDay ? "cursor-pointer" : undefined}
        onClick={(state) => {
          const day = state?.activeLabel;
          if (onSelectDay && day) onSelectDay(String(day));
        }}
      >
        <defs>
          <linearGradient id="active-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.18} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="day" tickFormatter={shortDay} tick={AXIS} tickLine={false} axisLine={false} interval={tickGap(daily.length)} />
        <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} width={40} />
        <Tooltip
          cursor={{ stroke: "var(--border)" }}
          content={({ active, payload, label }: TooltipProps<number, string>) =>
            active && payload?.length ? (
              <TooltipBox
                title={shortDay(String(label))}
                rows={[{ label: "Ativos", value: Number(payload[0].value) }]}
                hint={onSelectDay && Number(payload[0].value) > 0 ? "Clique para ver quem" : undefined}
              />
            ) : null
          }
        />
        <Area
          type="monotone"
          dataKey="activeUsers"
          stroke="var(--chart-1)"
          strokeWidth={2}
          fill="url(#active-fill)"
          dot={daily.length <= 7 ? { r: 3, fill: "var(--chart-1)" } : false}
          activeDot={{ r: 5, fill: "var(--chart-1)", stroke: "var(--card)", strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </AreaChart>
    </Frame>
  );
}

/** Cor da linha de usuários: neutra, para não se confundir com os tipos das barras. */
const USERS_COLOR = "var(--foreground)";

/**
 * Interações por dia, empilhadas por tipo, com a linha dos usuários ativos no
 * dia. Mesmo eixo: cada usuário ativo tem ao menos uma interação, então a
 * linha nunca passa do topo da barra.
 */
export function InteractionsChart({ daily }: { daily: Daily }) {
  return (
    <Frame>
      <ComposedChart data={daily} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="day" tickFormatter={shortDay} tick={AXIS} tickLine={false} axisLine={false} interval={tickGap(daily.length)} />
        <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} width={40} />
        <Tooltip
          cursor={{ fill: "var(--muted)" }}
          content={({ active, payload, label }: TooltipProps<number, string>) => {
            if (!active || !payload?.length) return null;
            const day = payload[0].payload as Daily[number];
            return (
              <TooltipBox
                title={shortDay(String(label))}
                rows={[
                  { label: "Usuários", value: day.activeUsers, color: USERS_COLOR },
                  ...KINDS.map((k) => ({ label: k.label, value: day[k.key], color: k.color })),
                ]}
              />
            );
          }}
        />
        {KINDS.map((k, i) => (
          <Bar
            key={k.key}
            dataKey={k.key}
            stackId="i"
            fill={k.color}
            radius={i === KINDS.length - 1 ? [3, 3, 0, 0] : 0}
            maxBarSize={28}
            isAnimationActive={false}
          />
        ))}
        <Line
          type="monotone"
          dataKey="activeUsers"
          stroke={USERS_COLOR}
          strokeWidth={2}
          dot={daily.length <= 7 ? { r: 3, fill: USERS_COLOR } : false}
          activeDot={{ r: 5, fill: USERS_COLOR, stroke: "var(--card)", strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </ComposedChart>
    </Frame>
  );
}

/** Legenda dos tipos, com o total de cada um no período; `users` = pessoas diferentes no período (a linha). */
export function KindLegend({
  byKind,
  users,
}: {
  byKind: DashboardOverview["kpis"]["interactions"]["byKind"];
  users?: number;
}) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
      {users != null && (
        <li className="text-muted-foreground flex items-center gap-1.5 tabular-nums">
          <span className="h-0.5 w-3 rounded-full" style={{ background: USERS_COLOR }} />
          Usuários
          <span className="text-foreground font-medium">{fmt(users)}</span>
        </li>
      )}
      {KINDS.map((k) => (
        <li key={k.key} className="text-muted-foreground flex items-center gap-1.5 tabular-nums">
          <span className="size-2.5 rounded-sm" style={{ background: k.color }} />
          {k.label}
          <span className="text-foreground font-medium">{fmt(byKind[k.key])}</span>
        </li>
      ))}
    </ul>
  );
}

type Hourly = NonNullable<DashboardOverview["hourly"]>;

/** "20h". */
export const hourLabel = (h: number) => `${h}h`;

/**
 * Horário de uso: as 24 horas do dia (fuso de Brasília), com as interações que
 * começaram em cada uma. A hora de pico em verde-escuro; as outras em verde-claro.
 */
export function HourlyChart({ hourly }: { hourly: Hourly }) {
  const peak = Math.max(0, ...hourly.map((h) => h.interactions));
  return (
    <Frame>
      <BarChart data={hourly} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="hour" tickFormatter={hourLabel} tick={AXIS} tickLine={false} axisLine={false} interval={2} />
        <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} width={40} />
        <Tooltip
          cursor={{ fill: "var(--muted)" }}
          content={({ active, payload }: TooltipProps<number, string>) => {
            if (!active || !payload?.length) return null;
            const h = payload[0].payload as Hourly[number];
            return (
              <TooltipBox
                title={`${hourLabel(h.hour)} às ${hourLabel((h.hour + 1) % 24)}`}
                rows={[
                  { label: "Interações", value: h.interactions },
                  { label: "Pessoas", value: h.users },
                ]}
              />
            );
          }}
        />
        <Bar dataKey="interactions" radius={[3, 3, 0, 0]} maxBarSize={28} isAnimationActive={false}>
          {hourly.map((h) => (
            <Cell key={h.hour} fill={peak > 0 && h.interactions === peak ? "var(--chart-1)" : "var(--chart-2)"} />
          ))}
        </Bar>
      </BarChart>
    </Frame>
  );
}

type Weekday = NonNullable<DashboardOverview["weekday"]>;
const WEEKDAY_SHORT = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const WEEKDAY_LONG = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

/**
 * Treinos em média por dia da semana (25/10/2026). Média por ocorrência, não o
 * total: em 30 dias há 4 ou 5 de cada dia. O dia mais forte em verde-escuro.
 */
export function WeekdayChart({ weekday }: { weekday: Weekday }) {
  const peak = Math.max(0, ...weekday.map((d) => d.average));
  const data = weekday.map((d) => ({ ...d, label: WEEKDAY_SHORT[d.weekday - 1] }));
  return (
    <Frame>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis allowDecimals tick={AXIS} tickLine={false} axisLine={false} width={40} />
        <Tooltip
          cursor={{ fill: "var(--muted)" }}
          content={({ active, payload }: TooltipProps<number, string>) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload as Weekday[number];
            return (
              <TooltipBox
                title={WEEKDAY_LONG[d.weekday - 1]}
                rows={[
                  { label: "Treinos no período", value: d.interactions },
                  { label: "Pessoas", value: d.users },
                ]}
                hint={`${d.average.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} em média, em ${d.days} ${d.days === 1 ? WEEKDAY_LONG[d.weekday - 1].toLowerCase() : "dias como este"}`}
              />
            );
          }}
        />
        <Bar dataKey="average" radius={[4, 4, 0, 0]} maxBarSize={48} isAnimationActive={false}>
          {data.map((d) => (
            <Cell key={d.weekday} fill={peak > 0 && d.average === peak ? "var(--chart-1)" : "var(--chart-2)"} />
          ))}
        </Bar>
      </BarChart>
    </Frame>
  );
}

/** Cinco tons de um verde só, do claro ao escuro (zero = fundo neutro). */
const HEAT_STEPS = [18, 36, 56, 78, 100];
function heatColor(n: number, max: number): string {
  if (n <= 0 || max <= 0) return "var(--muted)";
  const step = HEAT_STEPS[Math.min(HEAT_STEPS.length - 1, Math.floor((n / max) * HEAT_STEPS.length - 1e-9))];
  return `color-mix(in oklab, var(--chart-1) ${step}%, var(--card))`;
}

/**
 * Dia da semana × hora (25/10/2026): cada quadrado é uma hora de um dia, mais
 * escuro = mais treinos. Passar o mouse (ou focar) diz o número embaixo.
 */
export function WeekHourHeatmap({ heatmap }: { heatmap: number[][] }) {
  const max = Math.max(0, ...heatmap.flat());
  const [hover, setHover] = useState<{ d: number; h: number } | null>(null);
  const shown = hover ? heatmap[hover.d]?.[hover.h] ?? 0 : null;
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] table-fixed border-separate border-spacing-[2px] text-xs" aria-label="Treinos por dia da semana e hora">
          <thead>
            <tr>
              <th className="w-10" />
              {Array.from({ length: 24 }, (_, h) => (
                <th key={h} scope="col" className="text-muted-foreground font-normal tabular-nums">
                  {h % 3 === 0 ? `${h}h` : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {heatmap.map((hours, d) => (
              <tr key={d}>
                <th scope="row" className="text-muted-foreground pr-2 text-left font-medium">
                  {WEEKDAY_SHORT[d]}
                </th>
                {hours.map((n, h) => (
                  <td key={h} className="p-0">
                    <button
                      type="button"
                      aria-label={`${WEEKDAY_LONG[d]}, ${h}h às ${(h + 1) % 24}h: ${n} ${n === 1 ? "treino" : "treinos"}`}
                      onMouseEnter={() => setHover({ d, h })}
                      onFocus={() => setHover({ d, h })}
                      onMouseLeave={() => setHover(null)}
                      onBlur={() => setHover(null)}
                      className="block h-6 w-full rounded-[3px] outline-offset-1 focus-visible:outline-2 focus-visible:outline-[var(--ring)]"
                      style={{ background: heatColor(n, max) }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-3 text-xs">
        <p className="tabular-nums" aria-live="polite">
          {hover
            ? `${WEEKDAY_LONG[hover.d]}, das ${hover.h}h às ${(hover.h + 1) % 24}h: ${fmt(shown ?? 0)} ${shown === 1 ? "treino" : "treinos"}`
            : "Passe o mouse num quadrado para ver o número."}
        </p>
        <span className="flex items-center gap-1.5">
          Menos
          {[0, ...HEAT_STEPS].map((s, i) => (
            <span
              key={i}
              className="size-3 rounded-[3px]"
              style={{ background: s === 0 ? "var(--muted)" : `color-mix(in oklab, var(--chart-1) ${s}%, var(--card))` }}
            />
          ))}
          Mais
        </span>
      </div>
    </div>
  );
}

type ByKind = DashboardOverview["kpis"]["interactions"]["byKind"];

/**
 * O que as pessoas treinam: rosca de fatias com ponta arredondada e um vão
 * entre elas, a % em balões brancos sobre o anel e o total no centro
 * (referência do usuário, 25/10/2026). A legenda embaixo repete nome, número
 * e %, então a cor nunca é a única pista.
 */
export function KindDonut({ byKind }: { byKind: ByKind }) {
  const total = KINDS.reduce((sum, k) => sum + byKind[k.key], 0);
  const data = KINDS.map((k) => ({ ...k, value: byKind[k.key] })).filter((d) => d.value > 0);
  const pct = (v: number) => (total ? Math.round((v / total) * 100) : 0);
  return (
    <div className="flex flex-col gap-4">
      <div className="relative h-[200px] w-full">
        {total > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <defs>
                <filter id="donut-bubble" x="-30%" y="-30%" width="160%" height="170%">
                  <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#17210f" floodOpacity="0.14" />
                </filter>
              </defs>
              <Tooltip
                content={({ active, payload }: TooltipProps<number, string>) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as (typeof data)[number];
                  return <TooltipBox title={d.label} rows={[{ label: `${pct(d.value)}% dos treinos`, value: d.value, color: d.color }]} />;
                }}
              />
              <Pie
                data={data}
                dataKey="value"
                nameKey="label"
                innerRadius="58%"
                outerRadius="92%"
                paddingAngle={data.length > 1 ? 3 : 0}
                cornerRadius={10}
                startAngle={90}
                endAngle={-270}
                stroke="none"
                isAnimationActive={false}
                labelLine={false}
                label={({ cx, cy, midAngle, innerRadius, outerRadius, value }) => {
                  const share = pct(Number(value));
                  if (share < 6) return null;
                  const r = (Number(innerRadius) + Number(outerRadius)) / 2;
                  const a = (-Number(midAngle) * Math.PI) / 180;
                  const x = Number(cx) + r * Math.cos(a);
                  const y = Number(cy) + r * Math.sin(a);
                  const text = `${share}%`;
                  const w = text.length * 8 + 14;
                  return (
                    <g pointerEvents="none">
                      <rect x={x - w / 2} y={y - 13} width={w} height={26} rx={8} fill="var(--card)" filter="url(#donut-bubble)" />
                      <text x={x} y={y} dy="0.35em" textAnchor="middle" fontSize={13} fontWeight={700} fill="var(--foreground)">
                        {text}
                      </text>
                    </g>
                  );
                }}
              >
                {data.map((d) => (
                  <Cell key={d.key} fill={d.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-muted-foreground flex h-full items-center justify-center text-sm">Nenhum treino no período.</div>
        )}
        {total > 0 && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-2xl font-extrabold leading-none tabular-nums">{fmt(total)}</span>
            <span className="text-muted-foreground mt-1 text-xs">treinos</span>
          </div>
        )}
      </div>
      <ul className="space-y-1.5 text-sm">
        {KINDS.map((k) => (
          <li key={k.key} className="flex items-center gap-2 tabular-nums">
            <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: k.color }} />
            <span className="flex-1">{k.label}</span>
            <span className="font-semibold">{fmt(byKind[k.key])}</span>
            <span className="text-muted-foreground w-10 text-right text-xs">{pct(byKind[k.key])}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
