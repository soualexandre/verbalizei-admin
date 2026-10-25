import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Trend } from "./format";

/**
 * Um número grande do período, com a variação contra o período anterior
 * (verde subindo, laranja descendo, cinza estável) e uma linha de detalhe.
 */
export function KpiCard({
  label,
  value,
  trend,
  previousLabel,
  detail,
  help,
}: {
  label: string;
  value: string;
  trend: Trend;
  /** "7 dias antes: 120". */
  previousLabel: string;
  detail?: React.ReactNode;
  /** O que o número quer dizer, numa linha embaixo do rótulo. */
  help: string;
}) {
  const Icon =
    trend?.direction === "up" ? ArrowUpRight : trend?.direction === "down" ? ArrowDownRight : Minus;
  return (
    <Card className="gap-3 px-5 py-5 shadow-none">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {/* O que o número quer dizer, à vista (25/10/2026: antes só no title). */}
        <p className="text-muted-foreground mt-0.5 text-xs leading-snug">{help}</p>
      </div>
      <div className="flex items-baseline gap-2">
        <p className="text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
        {trend && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
              trend.direction === "up" && "bg-success-soft text-success",
              trend.direction === "down" && "bg-warning-soft text-warning",
              trend.direction === "flat" && "bg-muted text-muted-foreground",
            )}
          >
            <Icon className="size-3.5" aria-hidden />
            {trend.text}
          </span>
        )}
      </div>
      <div className="text-muted-foreground space-y-0.5 text-xs tabular-nums">
        {detail && <div className="text-foreground/80">{detail}</div>}
        <p>{previousLabel}</p>
      </div>
    </Card>
  );
}
