import { Warning } from "@phosphor-icons/react";
import type { OrgQuote } from "@/lib/types";
import { formatBRL, percent, plural } from "@/lib/pricing";

/** O orçamento de uma empresa em frases: por pessoa, por mês, o contrato e os avisos. */
export function QuoteSummary({ quote }: { quote: OrgQuote }) {
  const pilot = quote.plan === "PILOTO";
  const annual = quote.cycle === "ANNUAL";
  return (
    <div className="space-y-2">
      <p className="font-display text-[1.375rem] leading-none font-bold tracking-tight tabular-nums">
        {pilot ? formatBRL(quote.monthlyTotal) : quote.perSeat != null ? formatBRL(quote.perSeat) : "Sob consulta"}
        <span className="text-muted-foreground ml-1.5 font-sans text-[13px] font-medium tracking-normal">
          {pilot ? "pelo piloto" : quote.perSeat != null ? "por pessoa por mês" : ""}
        </span>
      </p>
      <ul className="text-muted-foreground space-y-1 text-[13px] leading-snug tabular-nums">
        {pilot ? (
          <li>Valor único, pago uma vez, para {plural(quote.seats, "pessoa", "pessoas")}.</li>
        ) : quote.perSeat == null ? (
          <li>
            Combine o preço por pessoa. O piso é de {formatBRL(quote.listPerSeat)} por pessoa por mês no anual.
          </li>
        ) : (
          <>
            {quote.discountPercent > 0 && quote.listPerSeat != null && (
              <li>
                Com {percent(quote.discountPercent)} de desconto de parceiro sobre a lista de {formatBRL(quote.listPerSeat)}.
              </li>
            )}
            <li>
              Para {plural(quote.seats, "pessoa", "pessoas")}, dá {formatBRL(quote.monthlyTotal)} por mês.
            </li>
            <li>
              {annual
                ? `O contrato de 12 meses fica em ${formatBRL(quote.contractTotal)}.`
                : `No mensal, o contrato é de um mês: ${formatBRL(quote.contractTotal)}.`}
            </li>
          </>
        )}
      </ul>
      {quote.warnings.length > 0 && (
        <ul className="space-y-1" aria-label="Avisos">
          {quote.warnings.map((w) => (
            <li key={w} className="flex items-start gap-1.5 text-[13px] leading-snug">
              <Warning weight="fill" className="text-lime-600 mt-0.5 size-4 shrink-0" aria-hidden />
              {w}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
