import type { DashboardOverview } from "@/lib/types";
import { fmt, fmtPct, weekLabel } from "./format";

/**
 * Coortes semanais: cada linha é uma semana de cadastro; cada coluna, a % que
 * fez alguma interação naquela semana depois do cadastro (S0 é a própria
 * semana do cadastro, ou seja, a ativação). Quanto mais azul, mais gente ficou.
 */
export function CohortTable({ cohorts }: { cohorts: DashboardOverview["cohorts"] }) {
  const span = cohorts[0]?.retention.length ?? 5;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-1 text-xs tabular-nums">
        <thead>
          <tr className="text-muted-foreground">
            <th className="pr-2 text-left font-medium">Cadastro</th>
            <th className="px-1 text-right font-medium">Pessoas</th>
            {Array.from({ length: span }, (_, k) => (
              <th
                key={k}
                className="w-14 text-center font-medium"
                title={k === 0 ? "Semana do cadastro (ativação)" : `${k}ª semana depois do cadastro`}
              >
                {k === 0 ? "S0" : `S${k}`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...cohorts].reverse().map((c) => (
            <tr key={c.week}>
              <td className="text-foreground pr-2 whitespace-nowrap">{weekLabel(c.week)}</td>
              <td className="text-muted-foreground px-1 text-right">{fmt(c.size)}</td>
              {c.retention.map((v, k) => (
                <td key={k} className="p-0">
                  <Cell value={c.size ? v : null} future={v == null && c.size > 0} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Cell({ value, future }: { value: number | null; future: boolean }) {
  if (value == null) {
    return (
      <div className="text-muted-foreground/60 flex h-8 items-center justify-center rounded-md">
        {future ? "·" : "—"}
      </div>
    );
  }
  // Fundo azul proporcional à retenção; texto claro a partir de ~55%.
  const alpha = 0.06 + (Math.min(100, value) / 100) * 0.84;
  return (
    <div
      className="flex h-8 items-center justify-center rounded-md font-medium"
      style={{
        background: `color-mix(in srgb, var(--chart-1) ${Math.round(alpha * 100)}%, transparent)`,
        color: alpha > 0.55 ? "#fff" : "var(--foreground)",
      }}
    >
      {fmtPct(Math.round(value))}
    </div>
  );
}
