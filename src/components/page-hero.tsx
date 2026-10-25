import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Trend } from "@/components/dashboard/format";

/**
 * O padrão de toda tela do admin (25/10/2026, pedido do usuário): abre numa
 * faixa azul da marca com o título e os totalizadores; depois vêm os gráficos
 * (`Section`) e por último os insights (`InsightList`). A faixa é o único
 * campo de cor cheio da tela: o resto é branco, com a cor da marca nos dados.
 *
 * Contraste: branco sobre #0063de dá 5,5:1; texto pequeno usa white/90 (4,7:1)
 * e os totalizadores ficam num azul mais fundo, onde o branco passa de 8:1.
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
    <section
      className={cn(
        "rounded-hero relative isolate overflow-hidden px-5 py-6 text-white sm:px-8 sm:py-8",
        "bg-[linear-gradient(135deg,var(--brand)_0%,var(--brand)_55%,var(--brand-deep)_100%)]",
        "shadow-[0_12px_32px_-18px_rgb(0_63_143/0.55)]",
        className,
      )}
    >
      {/* Um fio de lima na base: o acento de energia da marca, uma vez por tela. */}
      <span aria-hidden className="bg-lime absolute inset-x-0 bottom-0 h-1" />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl space-y-1.5">
          <h1 className="font-display text-[1.75rem] font-extrabold leading-tight tracking-tight sm:text-[2rem]">{title}</h1>
          {description && <p className="text-[15px] leading-relaxed text-white/90">{description}</p>}
        </div>
        {actions && <div className="hero-actions flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {/* empty:hidden — um filho que some (ex.: totais que falharam) não deixa um vão na faixa. */}
      {children && <div className="mt-6 empty:hidden">{children}</div>}
    </section>
  );
}

/** A grade dos totalizadores: 2 colunas no celular, até `cols` na tela grande. */
export function HeroStats({ children, cols = 4 }: { children: React.ReactNode; cols?: 3 | 4 | 5 | 6 }) {
  return (
    <ul
      className={cn(
        "grid grid-cols-2 gap-2.5 sm:gap-3",
        cols === 3 && "lg:grid-cols-3",
        cols === 4 && "lg:grid-cols-4",
        cols === 5 && "sm:grid-cols-3 lg:grid-cols-5",
        cols === 6 && "sm:grid-cols-3 xl:grid-cols-6",
      )}
    >
      {children}
    </ul>
  );
}

/** Os totais carregando, no lugar deles na faixa. */
export function HeroStatsSkeleton({ count = 4 }: { count?: 3 | 4 | 5 | 6 }) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3",
        count === 3 && "lg:grid-cols-3",
        count === 4 && "lg:grid-cols-4",
        count === 5 && "sm:grid-cols-3 lg:grid-cols-5",
        count === 6 && "sm:grid-cols-3 xl:grid-cols-6",
      )}
      aria-busy="true"
      aria-label="Carregando os totais"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-[108px] animate-pulse rounded-2xl bg-white/12" />
      ))}
    </div>
  );
}

/**
 * Um totalizador na faixa: o rótulo, o número em Raleway, a variação e uma
 * linha curta que diz o que o número é. Cor por significado, como no web:
 * verde = melhorou, lima = atenção (caiu), branco translúcido = estável.
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
    <li title={help} className="flex flex-col rounded-2xl bg-[rgb(0_40_100/0.32)] px-3.5 py-3 ring-1 ring-white/10 sm:px-4 sm:py-4">
      {/* O rótulo reserva duas linhas: os números da faixa ficam todos na mesma altura. */}
      <p className="line-clamp-2 min-h-[2lh] text-[13px] font-medium leading-snug text-white/90">{label}</p>
      <p className="font-display mt-1 text-2xl font-extrabold leading-none tracking-tight tabular-nums sm:text-[2rem]">{value}</p>
      {/* A variação mora sempre na mesma linha, abaixo do número. */}
      {trend && (
        <span
          className={cn(
            "mt-2 inline-flex w-fit items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums",
            trend.direction === "up" && "bg-green text-[#14200a]",
            trend.direction === "down" && "bg-lime text-[#2f3604]",
            trend.direction === "flat" && "bg-white/12 text-white",
          )}
        >
          <Icon className="size-3" aria-hidden />
          {trend.text}
        </span>
      )}
      {note && <p className="mt-1.5 line-clamp-1 text-xs leading-snug tabular-nums text-white/90 sm:line-clamp-2">{note}</p>}
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
  brand: "bg-brand",
  green: "bg-green",
  lime: "bg-lime-600",
  neutral: "bg-chart-5",
};

/**
 * Os insights: frases que leem os números, cada uma com um marcador na cor do
 * que ela diz — o mesmo sentido da faixa: azul = uso, verde = bom sinal,
 * lima = atenção (no tom 600, que aparece sobre o branco).
 */
export function InsightList({ items, columns = 2 }: { items: Array<{ text: React.ReactNode; tone?: InsightTone }>; columns?: 1 | 2 }) {
  return (
    <ul className={cn("grid gap-x-8 gap-y-3", columns === 2 && "md:grid-cols-2")}>
      {items.map((it, i) => (
        <li key={i} className="flex gap-3 text-[15px] leading-snug tabular-nums">
          <span aria-hidden className={cn("mt-[7px] size-2 shrink-0 rounded-full", TONE_DOT[it.tone ?? "brand"])} />
          <span className="min-w-0">{it.text}</span>
        </li>
      ))}
    </ul>
  );
}
