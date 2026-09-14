"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Check } from "lucide-react";
import type {
  ProfileDimension,
  ProfileGroupStats,
  ProfilesAnalysis,
} from "@/lib/types";
import {
  METRICS,
  READING_HELP,
  READING_LABEL,
  confidenceOf,
  fmtPct,
  ratioToBase,
  readingOf,
  type MetricKey,
  type Reading,
} from "@/lib/profile-insights";
import { cn, formatNumber } from "@/lib/utils";

type SortKey = "default" | "shareOfBase" | MetricKey;

interface TooltipState {
  x: number;
  y: number;
  title: string;
  value: string;
  lines: string[];
}

export function ProfileHeatmap({
  dimension,
  analysis,
  selected,
  highlighted,
  onToggleSelect,
}: {
  dimension: ProfileDimension;
  analysis: ProfilesAnalysis;
  selected: string[];
  highlighted: string | null;
  onToggleSelect: (key: string) => void;
}) {
  const { base, period } = analysis;
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({
    key: "default",
    desc: true,
  });
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const metrics = METRICS.filter(
    (m) => !(dimension.key === "plan" && m.key === "premiumRate"),
  );

  const rows = useMemo(() => {
    const groups = [...dimension.groups];
    if (sort.key === "default") return groups;
    const k = sort.key;
    return groups.sort((a, b) => {
      if (a.unknown !== b.unknown) return a.unknown ? 1 : -1;
      const diff = (a[k] as number) - (b[k] as number);
      return sort.desc ? -diff : diff;
    });
  }, [dimension.groups, sort]);

  const shareMax = Math.max(
    0.0001,
    ...dimension.groups.flatMap((g) => [g.shareOfBase, g.shareOfActiveDays]),
  );

  function toggleSort(key: SortKey) {
    setSort((s) =>
      s.key === key
        ? s.desc
          ? { key, desc: false }
          : { key: "default", desc: true }
        : { key, desc: true },
    );
  }

  function showTooltip(
    e: React.PointerEvent | React.FocusEvent,
    state: Omit<TooltipState, "x" | "y">,
  ) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltip({ ...state, x: rect.left + rect.width / 2, y: rect.top });
  }

  return (
    <div className="relative">
      <div
        aria-hidden
        className="from-card pointer-events-none absolute inset-y-0 right-0 z-20 w-8 bg-gradient-to-l to-transparent sm:hidden"
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] sm:min-w-[640px] border-separate border-spacing-0 text-sm">
          <caption className="sr-only">
            {`Perfis por ${dimension.label.toLowerCase()}, comparados com a média da base nos últimos ${period.days} dias`}
          </caption>
          <thead>
            <tr className="text-muted-foreground text-left text-xs">
              <th
                scope="col"
                className="bg-card sticky left-0 z-10 w-[30%] min-w-[128px] border-b px-3 pb-2 font-medium sm:min-w-[180px]"
              >
                <SortButton
                  label="Perfil"
                  active={sort.key === "default"}
                  desc
                  onClick={() => setSort({ key: "default", desc: true })}
                  hideArrow
                />
              </th>
              <th scope="col" className="hidden min-w-[108px] border-b px-2 pb-2 font-medium sm:table-cell">
                <SortButton
                  label="Base → acessos"
                  active={sort.key === "shareOfBase"}
                  desc={sort.desc}
                  onClick={() => toggleSort("shareOfBase")}
                />
              </th>
              {metrics.map((m) => (
                <th
                  key={m.key}
                  scope="col"
                  className="border-b px-1 pb-2 text-center font-medium"
                  title={m.help(period.recurringThreshold, period.days)}
                >
                  <SortButton
                    label={m.short}
                    active={sort.key === m.key}
                    desc={sort.desc}
                    onClick={() => toggleSort(m.key)}
                    center
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <BaseRow base={base} metrics={metrics} />
            {rows.map((g) => {
              const isSelected = selected.includes(g.key);
              const isHighlighted = highlighted === g.key;
              const confidence = confidenceOf(g);
              const faded = g.unknown || confidence !== "high";
              const reading = readingOf(g, dimension);
              return (
                <tr
                  key={g.key}
                  data-group={g.key}
                  className={cn(
                    "group/row transition-colors duration-200",
                    isSelected && "bg-muted/70",
                    isHighlighted && !isSelected && "bg-muted/50",
                  )}
                >
                  <th
                    scope="row"
                    className={cn(
                      "sticky left-0 z-10 border-b px-1 py-1.5 text-left font-normal transition-colors duration-200",
                      isSelected ? "bg-muted" : isHighlighted ? "bg-muted" : "bg-card",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onToggleSelect(g.key)}
                      aria-pressed={isSelected}
                      className="hover:bg-accent focus-visible:ring-ring/50 flex w-full cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-left outline-none focus-visible:ring-[3px]"
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                          isSelected
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-input bg-background group-hover/row:border-muted-foreground/50",
                        )}
                        aria-hidden
                      >
                        {isSelected && <Check className="size-3" />}
                      </span>
                      <span className="min-w-0">
                        <GroupLabel label={g.label} />
                        <span className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                          <span className="tabular-nums sm:hidden">
                            {formatNumber(g.users)} · {fmtPct(g.shareOfBase)} → {fmtPct(g.shareOfActiveDays)}
                          </span>
                          <span className="hidden tabular-nums sm:inline">
                            {formatNumber(g.users)} usuários
                          </span>
                          <ReadingTag reading={reading} />
                        </span>
                      </span>
                    </button>
                  </th>
                  <td className="hidden border-b px-2 py-1.5 sm:table-cell">
                    <ShareBars
                      group={g}
                      max={shareMax}
                      onShow={(e) =>
                        showTooltip(e, {
                          title: g.label,
                          value: `${fmtPct(g.shareOfBase)} da base → ${fmtPct(g.shareOfActiveDays)} dos acessos`,
                          lines: [
                            `${formatNumber(g.users)} usuários · ${formatNumber(g.activeDays)} dias ativos no período`,
                            g.shareOfActiveDays > g.shareOfBase
                              ? "Acessa mais do que o seu tamanho na base."
                              : g.shareOfActiveDays < g.shareOfBase
                                ? "Acessa menos do que o seu tamanho na base."
                                : "Acessa na proporção do seu tamanho.",
                          ],
                        })
                      }
                      onHide={() => setTooltip(null)}
                    />
                  </td>
                  {metrics.map((m) => {
                    const ratio = ratioToBase(g, base, m.key);
                    return (
                      <td key={m.key} className="border-b p-0.5">
                        <HeatCell
                          ratio={ratio}
                          faded={faded}
                          value={m.format(g)}
                          onShow={(e) =>
                            showTooltip(e, {
                              title: `${g.label} · ${m.label}`,
                              value: m.format(g),
                              lines: [
                                m.key === "accessIndex"
                                  ? describeIndex(g.accessIndex)
                                  : `Média da base: ${m.format(base)} · ${describeRatio(ratio)}`,
                                m.help(period.recurringThreshold, period.days),
                                ...(faded
                                  ? [
                                      g.unknown
                                        ? "Grupo sem informação: fora das recomendações."
                                        : "Amostra pequena: trate como tendência.",
                                    ]
                                  : []),
                              ],
                            })
                          }
                          onHide={() => setTooltip(null)}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {tooltip && (
        <div
          role="tooltip"
          className="bg-popover text-popover-foreground pointer-events-none fixed z-50 w-64 -translate-x-1/2 -translate-y-[calc(100%+8px)] rounded-lg border px-3 py-2 shadow-[0_6px_20px_-6px_rgb(0_0_0/0.18)]"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <p className="text-base font-semibold tabular-nums">{tooltip.value}</p>
          <p className="text-muted-foreground text-xs">{tooltip.title}</p>
          <ul className="mt-1.5 space-y-1 border-t pt-1.5 text-xs">
            {tooltip.lines.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** "Foco · Papel" vira papel em destaque com o foco em linha menor. */
function GroupLabel({ label }: { label: string }) {
  const parts = label.split(" · ");
  if (parts.length < 2) {
    return (
      <span className="text-foreground block leading-snug font-medium">{label}</span>
    );
  }
  const main = parts.pop();
  return (
    <>
      <span
        className="text-muted-foreground block max-w-[5.5rem] truncate text-xs leading-snug sm:max-w-[8.5rem]"
        title={parts.join(" · ")}
      >
        {parts.join(" · ")}
      </span>
      <span className="text-foreground block leading-snug font-medium">{main}</span>
    </>
  );
}

function describeIndex(index: number) {
  if (index >= 1.05) return `Cada usuário acessa ${fmtRatio(index)} a média da base.`;
  if (index <= 0.95) return `Cada usuário acessa ${fmtRatio(index)} a média da base.`;
  return "Acessa na média da base.";
}

function describeRatio(ratio: number) {
  const pct = Math.round((ratio - 1) * 100);
  if (Math.abs(pct) < 5) return "na média";
  return pct > 0 ? `${pct}% acima da média` : `${Math.abs(pct)}% abaixo da média`;
}

function fmtRatio(v: number) {
  return `${v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}×`;
}

/** log2 da razão, limitado a ±1 (metade ↔ dobro da média). */
export function heatBackground(ratio: number, faded: boolean) {
  const t = Math.max(-1, Math.min(1, Math.log2(Math.max(ratio, 0.0001))));
  const strength = Math.round(Math.abs(t) * (faded ? 38 : 100));
  const pole = t >= 0 ? "var(--heat-pos)" : "var(--heat-neg)";
  return `color-mix(in oklab, ${pole} ${strength}%, var(--heat-mid))`;
}

function HeatCell({
  ratio,
  faded,
  value,
  onShow,
  onHide,
}: {
  ratio: number;
  faded: boolean;
  value: string;
  onShow: (e: React.PointerEvent | React.FocusEvent) => void;
  onHide: () => void;
}) {
  const pct = Math.round((ratio - 1) * 100);
  const delta = Math.abs(pct) < 5 ? "média" : `${pct > 0 ? "+" : "−"}${Math.abs(pct)}%`;
  return (
    <div
      tabIndex={0}
      onPointerEnter={onShow}
      onPointerLeave={onHide}
      onFocus={onShow}
      onBlur={onHide}
      className={cn(
        "focus-visible:ring-ring flex h-12 min-w-[58px] flex-col items-center justify-center rounded-[4px] outline-none transition-[filter,box-shadow] duration-150 hover:brightness-[0.97] hover:ring-1 hover:ring-foreground/25 focus-visible:ring-2",
        faded && "bg-[length:6px_6px]",
      )}
      style={{
        backgroundColor: heatBackground(ratio, faded),
        backgroundImage: faded
          ? "repeating-linear-gradient(135deg, transparent 0 3px, rgb(255 255 255 / 0.45) 3px 4px)"
          : undefined,
      }}
    >
      <span
        className={cn(
          "text-sm font-semibold tabular-nums",
          faded ? "text-foreground/85" : "text-foreground",
        )}
      >
        {value}
      </span>
      <span className="text-foreground/80 text-[11px] leading-none tabular-nums">
        {delta}
      </span>
    </div>
  );
}

function ShareBars({
  group,
  max,
  onShow,
  onHide,
}: {
  group: ProfileGroupStats;
  max: number;
  onShow: (e: React.PointerEvent | React.FocusEvent) => void;
  onHide: () => void;
}) {
  const w = (v: number) => `${Math.max((v / max) * 100, v > 0 ? 2 : 0)}%`;
  return (
    <div
      tabIndex={0}
      onPointerEnter={onShow}
      onPointerLeave={onHide}
      onFocus={onShow}
      onBlur={onHide}
      className="focus-visible:ring-ring/50 space-y-1 rounded-md py-1 outline-none focus-visible:ring-[3px]"
    >
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1">
          <div
            className="bg-muted-foreground/35 h-full rounded-r-[3px]"
            style={{ width: w(group.shareOfBase) }}
          />
        </div>
        <span className="text-muted-foreground w-8 text-right text-xs tabular-nums">
          {fmtPct(group.shareOfBase)}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1">
          <div
            className="bg-primary h-full rounded-r-[3px]"
            style={{ width: w(group.shareOfActiveDays) }}
          />
        </div>
        <span className="text-foreground w-8 text-right text-xs font-medium tabular-nums">
          {fmtPct(group.shareOfActiveDays)}
        </span>
      </div>
    </div>
  );
}

function BaseRow({
  base,
  metrics,
}: {
  base: ProfileGroupStats;
  metrics: typeof METRICS;
}) {
  return (
    <tr className="text-muted-foreground">
      <th
        scope="row"
        className="bg-card sticky left-0 z-10 border-b px-3 py-2 text-left text-xs font-medium"
      >
        Média da base
        <span className="block font-normal tabular-nums">
          {formatNumber(base.users)} usuários
        </span>
      </th>
      <td className="hidden border-b px-2 py-2 text-xs sm:table-cell">100% → 100%</td>
      {metrics.map((m) => (
        <td
          key={m.key}
          className="border-b px-1 py-2 text-center text-xs font-medium tabular-nums"
        >
          {m.format(base)}
        </td>
      ))}
    </tr>
  );
}

const READING_TONE: Record<Reading, string> = {
  motor: "var(--heat-pos)",
  nicho: "var(--heat-pos)",
  "volume-sem-uso": "var(--heat-neg)",
  irrelevante: "var(--heat-neg)",
  media: "var(--heat-mid)",
  amostra: "transparent",
  "sem-dado": "transparent",
};

function ReadingTag({ reading }: { reading: Reading }) {
  const hollow = reading === "amostra" || reading === "sem-dado";
  return (
    <span
      title={READING_HELP[reading]}
      className={cn(
        "inline-flex items-center gap-1 text-xs whitespace-nowrap",
        hollow ? "text-muted-foreground" : "text-foreground/80",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-2 rounded-full",
          hollow ? "border-muted-foreground/60 border border-dashed" : "ring-foreground/15 ring-1",
        )}
        style={{ backgroundColor: READING_TONE[reading] }}
      />
      {READING_LABEL[reading]}
    </span>
  );
}

function SortButton({
  label,
  active,
  desc,
  onClick,
  center,
  hideArrow,
}: {
  label: string;
  active: boolean;
  desc: boolean;
  onClick: () => void;
  center?: boolean;
  hideArrow?: boolean;
}) {
  const Arrow = desc ? ArrowDown : ArrowUp;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "hover:text-foreground focus-visible:ring-ring/50 inline-flex cursor-pointer items-center gap-1 rounded px-1 py-0.5 outline-none focus-visible:ring-[3px]",
        center && "w-full justify-center",
        active && "text-foreground",
      )}
    >
      {label}
      {!hideArrow && (
        <Arrow
          className={cn("size-3", active ? "opacity-100" : "opacity-30")}
          aria-hidden
        />
      )}
    </button>
  );
}

export function HeatLegend() {
  const stops = [0.5, 0.71, 1, 1.41, 2];
  return (
    <div className="text-muted-foreground flex flex-wrap items-center gap-x-6 gap-y-3 text-xs">
      <div className="flex items-center gap-2">
        <span>Abaixo da média</span>
        <div className="flex gap-0.5" aria-hidden>
          {stops.map((r) => (
            <span
              key={r}
              className="h-3 w-7 rounded-[3px]"
              style={{ backgroundColor: heatBackground(r, false) }}
            />
          ))}
        </div>
        <span>Acima da média</span>
      </div>
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="h-3 w-7 rounded-[3px]"
          style={{
            backgroundColor: heatBackground(1.6, true),
            backgroundImage:
              "repeating-linear-gradient(135deg, transparent 0 3px, rgb(255 255 255 / 0.45) 3px 4px)",
          }}
        />
        <span>Amostra pequena ou sem dado</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5">
          <span className="bg-muted-foreground/35 h-1.5 w-5 rounded-r-[3px]" aria-hidden />
          % da base
        </span>
        <span className="flex items-center gap-1.5">
          <span className="bg-primary h-1.5 w-5 rounded-r-[3px]" aria-hidden />
          % dos acessos
        </span>
      </div>
    </div>
  );
}
