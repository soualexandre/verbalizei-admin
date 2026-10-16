"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
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

function TooltipBox({ title, rows }: { title: string; rows: { label: string; value: number; color?: string }[] }) {
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
    </div>
  );
}

/** Usuários ativos (fizeram ao menos uma interação) em cada dia do período. */
export function ActiveUsersChart({ daily }: { daily: Daily }) {
  return (
    <Frame>
      <AreaChart data={daily} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
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
              <TooltipBox title={shortDay(String(label))} rows={[{ label: "Ativos", value: Number(payload[0].value) }]} />
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
          isAnimationActive={false}
        />
      </AreaChart>
    </Frame>
  );
}

/** Interações por dia, empilhadas por tipo. */
export function InteractionsChart({ daily }: { daily: Daily }) {
  return (
    <Frame>
      <BarChart data={daily} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
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
                rows={KINDS.map((k) => ({ label: k.label, value: day[k.key], color: k.color }))}
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
      </BarChart>
    </Frame>
  );
}

/** Legenda dos tipos, com o total de cada um no período. */
export function KindLegend({ byKind }: { byKind: DashboardOverview["kpis"]["interactions"]["byKind"] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
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
