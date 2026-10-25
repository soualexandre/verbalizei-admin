import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Trend } from "@/components/dashboard/format";

/**
 * O padrão de toda tela do admin (25/10/2026, pedido do usuário): o título
 * sobre o fundo, os totalizadores logo abaixo (`HeroStats`), depois os
 * gráficos (`Section`) e por último os insights (`InsightList`).
 *
 * Desde a segunda rodada do mesmo dia o verde predomina e os cartões seguem a
 * referência de painéis financeiros claros: fundo cinza suave, cartões
 * brancos de canto largo e um único cartão verde em destaque, o primeiro
 * totalizador da tela (estilos `.stat` em globals.css).
 */
export function PageHero({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  /** Filtros e botões da tela (período, baixar…), à direita do título. */
  actions?: React.ReactNode;
  /** Os totalizadores: `HeroStats` com `HeroStat`. */
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-5", className)}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl space-y-1">
          <h1 className="font-display text-[1.75rem] font-extrabold leading-tight tracking-tight sm:text-[2rem]">{title}</h1>
          {description && <p className="text-muted-foreground text-[15px] leading-relaxed">{description}</p>}
        </div>
        {actions && <div className="hero-actions flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {/* empty:hidden — um filho que some (ex.: totais que falharam) não deixa um vão. */}
      {children && <div className="empty:hidden">{children}</div>}
    </section>
  );
}

// Uma coluna a mais que os totais: o primeiro (o destaque verde) ocupa duas na
// tela grande, como o cartão de saldo da referência. No celular, todos iguais.
const STAT_COLS = {
  3: "lg:grid-cols-4 lg:[&>*:first-child]:col-span-2",
  4: "lg:grid-cols-5 lg:[&>*:first-child]:col-span-2",
  5: "sm:grid-cols-3 lg:grid-cols-6 lg:[&>*:first-child]:col-span-2",
  6: "sm:grid-cols-3 xl:grid-cols-7 xl:[&>*:first-child]:col-span-2",
} as const;

/** A grade dos totalizadores: 2 colunas no celular, até `cols` na tela grande. O primeiro é o destaque verde. */
export function HeroStats({ children, cols = 4 }: { children: React.ReactNode; cols?: 3 | 4 | 5 | 6 }) {
  return <ul className={cn("grid grid-cols-2 gap-3 sm:gap-4", STAT_COLS[cols])}>{children}</ul>;
}

/** Os totais carregando, no lugar deles. */
export function HeroStatsSkeleton({ count = 4 }: { count?: 3 | 4 | 5 | 6 }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:gap-4", STAT_COLS[count])} aria-busy="true" aria-label="Carregando os totais">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={cn("rounded-card h-[132px] animate-pulse", i === 0 ? "bg-green-100" : "bg-card border")} />
      ))}
    </div>
  );
}

/**
 * Um totalizador: o rótulo, o número em Raleway, a variação numa pílula e uma
 * linha curta que diz o que o número é. Cor por significado: verde = melhorou,
 * lima = atenção (caiu), cinza = estável.
 */
export function HeroStat({
  label,
  value,
  note,
  trend,
  help,
}: {
  label: string;
  value: React.ReactNode;
  /** Linha curta de contexto ("31% da base"). */
  note?: React.ReactNode;
  trend?: Trend;
  /** O que o número quer dizer, ao passar o mouse. */
  help?: string;
}) {
  const Icon = trend?.direction === "up" ? ArrowUpRight : trend?.direction === "down" ? ArrowDownRight : Minus;
  return (
    <li title={help} className="stat rounded-card flex flex-col px-4 py-4 sm:px-5 sm:py-5">
      {/* O rótulo reserva duas linhas: os números ficam todos na mesma altura. */}
      <p className="stat-label text-muted-foreground line-clamp-2 min-h-[2lh] text-[13px] font-medium leading-snug">{label}</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <p className="stat-value font-display text-[1.625rem] font-extrabold leading-none tracking-tight tabular-nums sm:text-[2rem]">{value}</p>
        {trend && (
          <span
            data-dir={trend.direction}
            className="stat-trend inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums"
          >
            <Icon className="size-3" aria-hidden />
            {trend.text}
          </span>
        )}
      </div>
      {note && <p className="stat-note text-muted-foreground mt-2 line-clamp-1 text-xs leading-snug tabular-nums sm:line-clamp-2">{note}</p>}
    </li>
  );
}

/** Um bloco da tela (gráficos ou insights): título em Raleway, linha de apoio e o conteúdo. */
export function Section({
  title,
  description,
  aside,
  children,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-0.5">
          <h2 className="font-display text-xl font-bold tracking-tight">{title}</h2>
          {description && <p className="text-muted-foreground text-sm">{description}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

export type InsightTone = "brand" | "green" | "lime" | "neutral";

const TONE_DOT: Record<InsightTone, string> = {
  brand: "bg-primary",
  green: "bg-green",
  lime: "bg-lime-600",
  neutral: "bg-chart-5",
};

/**
 * Os insights: frases que leem os números, uma por linha com divisória, cada
 * uma com um marcador na cor do que ela diz — verde-escuro = uso, verde =
 * bom sinal, lima = atenção (no tom 600, que aparece sobre o branco).
 */
export function InsightList({ items, columns = 2 }: { items: Array<{ text: React.ReactNode; tone?: InsightTone }>; columns?: 1 | 2 }) {
  return (
    // O próprio cartão branco: as telas só colocam a lista no Section.
    <ul className={cn("rounded-card bg-card grid gap-x-10 border px-5 py-2 sm:px-6", columns === 2 && "md:grid-cols-2 md:[&>li:nth-child(2)]:border-t-0")}>
      {items.map((it, i) => (
        <li key={i} className="flex gap-3 border-t py-3.5 text-[15px] leading-snug tabular-nums first:border-t-0">
          <span aria-hidden className={cn("mt-[7px] size-2 shrink-0 rounded-full", TONE_DOT[it.tone ?? "brand"])} />
          <span className="min-w-0">{it.text}</span>
        </li>
      ))}
    </ul>
  );
}
