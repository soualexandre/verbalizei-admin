"use client";

import { Info, TrendingUp, TriangleAlert, X, type LucideIcon } from "lucide-react";
import type { ProfileGroupStats, ProfilesAnalysis } from "@/lib/types";
import {
  compareGroups,
  type Conclusion,
  type ConclusionKind,
} from "@/lib/profile-insights";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const KIND: Record<ConclusionKind, { icon: LucideIcon; chip: string }> = {
  positive: {
    icon: TrendingUp,
    chip: "bg-[color-mix(in_oklab,var(--heat-pos)_45%,var(--heat-mid))]",
  },
  risk: {
    icon: TriangleAlert,
    chip: "bg-[color-mix(in_oklab,var(--heat-neg)_55%,var(--heat-mid))]",
  },
  note: { icon: Info, chip: "bg-muted" },
};

export function ConclusionsList({
  conclusions,
  highlighted,
  onHighlight,
}: {
  conclusions: Conclusion[];
  highlighted: string | null;
  onHighlight: (key: string | null) => void;
}) {
  return (
    <ol className="divide-y">
      {conclusions.map((c) => {
        const kind = KIND[c.kind];
        const Icon = kind.icon;
        const key = c.groupKey;
        const active = key !== undefined && highlighted === key;
        return (
          <li key={c.id} className="py-4 first:pt-0 last:pb-0">
            <div
              {...(key
                ? {
                    tabIndex: 0,
                    role: "button",
                    "aria-pressed": active,
                    "aria-label": `${c.tag}: ${c.title}. Destacar na tabela`,
                    onPointerEnter: (e: React.PointerEvent) =>
                      e.pointerType === "mouse" && onHighlight(key),
                    onPointerLeave: (e: React.PointerEvent) =>
                      e.pointerType === "mouse" && onHighlight(null),
                    onFocus: () => onHighlight(key),
                    onBlur: () => onHighlight(null),
                    onClick: () => onHighlight(active ? null : key),
                  }
                : {})}
              className={cn(
                "flex gap-3 rounded-lg py-1 outline-none transition-colors duration-150",
                key && "focus-visible:ring-ring/50 cursor-pointer focus-visible:ring-[3px]",
                active && "bg-muted/60",
              )}
            >
              <span
                className={cn(
                  "text-foreground mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
                  kind.chip,
                )}
                aria-hidden
              >
                <Icon className="size-3.5" />
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm leading-snug">
                  <span className="text-muted-foreground mr-1 text-xs font-medium whitespace-nowrap">
                    {c.tag}
                  </span>{" "}
                  <span className="font-semibold">{c.title}</span>
                </p>
                <p className="text-muted-foreground text-sm leading-relaxed">{c.body}</p>
                {c.action && (
                  <p className="text-foreground text-sm leading-relaxed">
                    <span className="font-medium">O que fazer: </span>
                    {c.action}
                  </p>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function ComparePanel({
  groups,
  analysis,
  onClear,
}: {
  groups: ProfileGroupStats[];
  analysis: ProfilesAnalysis;
  onClear: () => void;
}) {
  if (groups.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Marque dois perfis na tabela para ver a comparação lado a lado.
      </p>
    );
  }

  if (groups.length === 1) {
    return (
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm">
          <span className="font-medium">{groups[0].label}</span>
          <span className="text-muted-foreground"> selecionado. Marque mais um perfil para comparar.</span>
        </p>
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X className="size-4" />
          Limpar
        </Button>
      </div>
    );
  }

  const [a, b] = groups;
  const { lines, bottomLine } = compareGroups(
    a,
    b,
    analysis.base,
    analysis.period,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-base leading-snug font-semibold text-balance">
          {bottomLine}
        </p>
        <Button variant="ghost" size="sm" onClick={onClear} className="shrink-0">
          <X className="size-4" />
          Limpar
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="text-muted-foreground border-b text-left text-xs">
              <th scope="col" className="py-2 pr-3 font-medium">Métrica</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">{a.label}</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">{b.label}</th>
              <th scope="col" className="py-2 pl-3 font-medium">Leitura</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.metric} className="border-b last:border-0">
                <th scope="row" className="text-muted-foreground py-2 pr-3 text-left font-normal">
                  {line.metric}
                </th>
                <td
                  className={cn(
                    "px-3 py-2 text-right tabular-nums",
                    line.winner === "a" ? "font-semibold" : "text-muted-foreground",
                  )}
                >
                  {line.a}
                </td>
                <td
                  className={cn(
                    "px-3 py-2 text-right tabular-nums",
                    line.winner === "b" ? "font-semibold" : "text-muted-foreground",
                  )}
                >
                  {line.b}
                </td>
                <td className="py-2 pl-3">{line.sentence}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
