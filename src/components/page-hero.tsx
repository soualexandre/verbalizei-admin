import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { InfoTip } from "@/components/ui/info-tip";
import type { Trend } from "@/components/dashboard/format";

/**
 * O padrão de toda tela do admin: o título, os totalizadores logo abaixo
 * (`HeroStats`), depois os gráficos (`Section`) e por último os insights
 * (`InsightList`).
 *
 * 14/11/2026 (pedido do usuário): compacto e neutro. Título de 22 px, uma
 * linha de contexto, totais numa faixa só; as explicações de seção ficam num
 * "i" (`InfoTip`) em vez de texto corrido. Azul e verde só nos detalhes.
 */
export function PageHero({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string;
  /** Uma linha de contexto; o excesso vira reticências (texto inteiro ao passar o mouse). */
  description?: React.ReactNode;
  /** Filtros e botões da tela (período, baixar…), à direita do título. */
  actions?: React.ReactNode;
  /** Os totalizadores: `HeroStats` com `HeroStat`. */
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-4", className)}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 max-w-3xl">
          <h1 className="font-display text-[1.375rem] font-bold leading-tight tracking-tight">{title}</h1>
          {description && (
            <p
              className="text-muted-foreground mt-0.5 line-clamp-2 text-[13px] leading-snug lg:line-clamp-1"
              title={typeof description === "string" ? description : undefined}
            >
              {description}
            </p>
          )}
        </div>
        {actions && <div className="hero-actions flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {/* empty:hidden — um filho que some (ex.: totais que falharam) não deixa um vão. */}
      {children && <div className="empty:hidden">{children}</div>}
    </section>
  );
}

const STAT_CELL = "[&>*]:shadow-[1px_1px_0_0_var(--border)]";

const STAT_COLS = {
  3: "sm:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "sm:grid-cols-3 lg:grid-cols-5",
  6: "sm:grid-cols-3 xl:grid-cols-6",
} as const;

/**
 * Os totais numa faixa só: um cartão, células separadas por linha de 1 px
 * (sombra de 1 px à direita e embaixo de cada célula; a borda externa corta a
 * da última coluna e da última linha). 2 colunas no celular.
 */
export function HeroStats({ children, cols = 4 }: { children: React.ReactNode; cols?: 3 | 4 | 5 | 6 }) {
  return (
    <ul className={cn("bg-card grid grid-cols-2 overflow-hidden rounded-card border", STAT_CELL, STAT_COLS[cols])}>
      {children}
    </ul>
  );
}

/** Os totais carregando, no lugar deles. */
export function HeroStatsSkeleton({ count = 4 }: { count?: 3 | 4 | 5 | 6 }) {
  return (
    <div
      className={cn("bg-card grid grid-cols-2 overflow-hidden rounded-card border", STAT_CELL, STAT_COLS[count])}
      aria-busy="true"
      aria-label="Carregando os totais"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-[84px] p-4">
          <div className="bg-muted h-3 w-20 animate-pulse rounded" />
          <div className="bg-muted mt-3 h-5 w-14 animate-pulse rounded" />
        </div>
      ))}
    </div>
  );
}

/**
 * Um totalizador: rótulo, número, variação e uma nota curta. Cor por
 * significado: verde = melhorou, lima = atenção (caiu), cinza = estável.
 * A definição do número vai no `help` (ao passar o mouse).
 */
export function HeroStat({
  label,
  value,
  note,
  trend,
  trendTone,
  help,
}: {
  label: string;
  value: React.ReactNode;
  /** Linha curta de contexto ("31% da base"). */
  note?: React.ReactNode;
  trend?: Trend;
  /** A cor da variação quando subir não é bom (custo): "down" pinta de atenção. Padrão: a direção. */
  trendTone?: "up" | "down" | "flat";
  /** O que o número quer dizer, ao passar o mouse. */
  help?: string;
}) {
  const Icon = trend?.direction === "up" ? ArrowUpRight : trend?.direction === "down" ? ArrowDownRight : Minus;
  return (
    <li title={help} className="flex min-w-0 flex-col px-4 py-3">
      <p className="text-muted-foreground line-clamp-2 min-h-[2lh] text-xs font-medium leading-snug">{label}</p>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <p className="font-display text-[1.375rem] font-bold leading-none tracking-tight tabular-nums">{value}</p>
        {trend && (
          <span
            data-dir={trendTone ?? trend.direction}
            className="stat-trend inline-flex items-center gap-0.5 rounded-full px-1.5 py-px text-[11px] font-semibold tabular-nums"
          >
            <Icon className="size-3" aria-hidden />
            {trend.text}
          </span>
        )}
      </div>
      {note && <p className="text-muted-foreground mt-1.5 truncate text-[11px] leading-snug tabular-nums">{note}</p>}
    </li>
  );
}

/** Um bloco da tela: título curto, a explicação num "i" e o conteúdo. */
export function Section({
  title,
  description,
  aside,
  children,
  className,
}: {
  title: string;
  /** Vai para o "i" ao lado do título, não fica em texto corrido. */
  description?: React.ReactNode;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex min-h-8 flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <h2 className="truncate text-[15px] font-semibold tracking-tight">{title}</h2>
          {description && <InfoTip>{description}</InfoTip>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

export type InsightTone = "brand" | "green" | "lime" | "neutral";

const TONE_DOT: Record<InsightTone, string> = {
  brand: "bg-brand",
  green: "bg-green",
  lime: "bg-lime-600",
  neutral: "bg-chart-5",
};

/**
 * Os insights: frases que leem os números, uma por linha, com um ponto na
 * cor do que ela diz — azul = uso, verde = bom sinal, lima = atenção.
 */
export function InsightList({ items, columns = 2 }: { items: Array<{ text: React.ReactNode; tone?: InsightTone }>; columns?: 1 | 2 }) {
  return (
    <ul className={cn("rounded-card bg-card grid gap-x-8 border px-4 py-1", columns === 2 && "md:grid-cols-2 md:[&>li:nth-child(2)]:border-t-0")}>
      {items.map((it, i) => (
        <li key={i} className="flex gap-2.5 border-t py-2.5 text-[13px] leading-snug tabular-nums first:border-t-0">
          <span aria-hidden className={cn("mt-[6px] size-1.5 shrink-0 rounded-full", TONE_DOT[it.tone ?? "brand"])} />
          <span className="min-w-0">{it.text}</span>
        </li>
      ))}
    </ul>
  );
}
