import type {
  ProfileDimension,
  ProfileGroupStats,
  ProfilesAnalysis,
} from "@/lib/types";

// Regras que transformam os números da análise de perfis em conclusões
// escritas. Tudo aqui é determinístico: mesmo dado, mesma frase.

/** Abaixo disso, um perfil não sustenta conclusão sozinho. */
export const MIN_CONFIDENT_USERS = 20;
/** Chave usada pela API para respostas em texto livre / combinações pequenas. */
const OTHER_TEXT = "__other_text__";

export type MetricKey =
  | "accessIndex"
  | "activationRate"
  | "daysPerActiveUser"
  | "recurringRate"
  | "premiumRate";

export interface MetricDef {
  key: MetricKey;
  label: string;
  short: string;
  help: (period: ProfilesAnalysis["period"]) => string;
  format: (g: ProfileGroupStats) => string;
}

export const METRICS: MetricDef[] = [
  {
    key: "accessIndex",
    label: "Intensidade de acesso",
    short: "Intensidade",
    help: () =>
      "Fatia dos dias ativos dividida pela fatia da base. 1,0× = acessa na média; 2,0× = o dobro.",
    format: (g) => `${fmtDecimal(g.accessIndex)}×`,
  },
  {
    key: "activationRate",
    label: "Ativação",
    short: "Ativos",
    help: (p) =>
      p.allTime
        ? "Usuários com ao menos 1 dia de atividade desde o cadastro."
        : `Usuários com ao menos 1 dia de atividade nos últimos ${p.days} dias.`,
    format: (g) => fmtPct(g.activationRate),
  },
  {
    key: "daysPerActiveUser",
    label: "Dias por ativo",
    short: "Dias/ativo",
    help: () => "Média de dias com atividade entre quem usou no período.",
    format: (g) => fmtDecimal(g.daysPerActiveUser),
  },
  {
    key: "recurringRate",
    label: "Recorrência",
    short: "Recorrentes",
    help: (p) =>
      p.recurringThreshold == null
        ? "Usuários ativos em média 1 dia por semana desde o próprio cadastro."
        : `Usuários ativos em ${p.recurringThreshold} dias ou mais no período (~1 vez por semana).`,
    format: (g) => fmtPct(g.recurringRate),
  },
  {
    key: "premiumRate",
    label: "Premium",
    short: "Premium",
    help: () => "Usuários com plano premium vigente hoje.",
    format: (g) => fmtPct(g.premiumRate),
  },
];

// ─── Formatação ──────────────────────────────────────────────────────────────

const pctFmt = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  maximumFractionDigits: 0,
});
const pctFineFmt = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  maximumFractionDigits: 1,
});
const decFmt = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function fmtPct(v: number) {
  return v > 0 && v < 0.01 ? pctFineFmt.format(v) : pctFmt.format(v);
}
export function fmtDecimal(v: number) {
  return decFmt.format(v);
}
function fmtPp(a: number, b: number) {
  const diff = Math.round((a - b) * 100);
  return `${diff > 0 ? "+" : ""}${diff} p.p.`;
}

/** "nos últimos 30 dias" ou "em todo o período". */
export function periodPhrase(period: ProfilesAnalysis["period"]) {
  return period.allTime ? "em todo o período" : `nos últimos ${period.days} dias`;
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// ─── Classificação ───────────────────────────────────────────────────────────

export type Confidence = "high" | "low" | "none";

export function confidenceOf(g: ProfileGroupStats): Confidence {
  if (g.users >= MIN_CONFIDENT_USERS) return "high";
  if (g.users >= 5) return "low";
  return "none";
}

/** Perfil que marketing consegue mirar: conhecido e não é "outros/texto livre". */
export function isTargetable(g: ProfileGroupStats) {
  return !g.unknown && g.key !== OTHER_TEXT;
}

/** Razão do grupo contra a base para uma métrica (1 = média). */
export function ratioToBase(
  g: ProfileGroupStats,
  base: ProfileGroupStats,
  key: MetricKey,
) {
  const b = key === "accessIndex" ? 1 : base[key];
  if (b <= 0) return g[key] > 0 ? 2 : 1;
  return g[key] / b;
}

export type Reading =
  | "motor"
  | "nicho"
  | "volume-sem-uso"
  | "irrelevante"
  | "media"
  | "amostra"
  | "sem-dado";

export const READING_LABEL: Record<Reading, string> = {
  motor: "Motor da base",
  nicho: "Nicho fiel",
  "volume-sem-uso": "Volume sem uso",
  irrelevante: "Pouco relevante",
  media: "Na média",
  amostra: "Amostra pequena",
  "sem-dado": "Sem dado",
};

export const READING_HELP: Record<Reading, string> = {
  motor: "Grande na base e acessa acima da média.",
  nicho: "Pequeno na base, mas acessa acima da média.",
  "volume-sem-uso": "Grande na base, mas acessa abaixo da média.",
  irrelevante: "Pequeno na base e acessa abaixo da média.",
  media: "Acessa perto da média da base.",
  amostra: `Menos de ${MIN_CONFIDENT_USERS} usuários: trate como tendência.`,
  "sem-dado": "Usuários sem essa informação.",
};

export function readingOf(g: ProfileGroupStats, dim: ProfileDimension): Reading {
  if (g.unknown) return "sem-dado";
  if (confidenceOf(g) !== "high") return "amostra";
  const big = g.shareOfBase >= 1 / Math.max(dim.groups.length, 1);
  if (g.accessIndex >= 1.15) return big ? "motor" : "nicho";
  if (g.accessIndex <= 0.85) return big ? "volume-sem-uso" : "irrelevante";
  return "media";
}

// ─── Conclusões ──────────────────────────────────────────────────────────────

export type ConclusionKind = "positive" | "risk" | "note";

export interface Conclusion {
  id: string;
  kind: ConclusionKind;
  /** Rótulo curto e visível do tipo de conclusão. */
  tag: string;
  title: string;
  body: string;
  action?: string;
  groupKey?: string;
}

function pool(dim: ProfileDimension) {
  const targetable = dim.groups.filter(isTargetable);
  const confident = targetable.filter((g) => confidenceOf(g) === "high");
  // Base pequena: usa o que tiver, mas as frases avisam.
  const usable = confident.length >= 2 ? confident : targetable.filter((g) => confidenceOf(g) !== "none");
  return { targetable, confident, usable, lowConfidence: confident.length < 2 };
}

function maxBy<T>(items: T[], score: (t: T) => number): T | undefined {
  let best: T | undefined;
  let bestScore = -Infinity;
  for (const item of items) {
    const s = score(item);
    if (s > bestScore) {
      best = item;
      bestScore = s;
    }
  }
  return best;
}

/** Nota para "vale atrair": uso pesa mais que conversão. */
function investScore(g: ProfileGroupStats, base: ProfileGroupStats) {
  const premiumLift =
    base.premiumRate > 0 ? Math.min(g.premiumRate / base.premiumRate, 3) : 1;
  return g.accessIndex * 0.7 + premiumLift * 0.3 + g.recurringRate * 0.2;
}

export function pickInvestTarget(dim: ProfileDimension, base: ProfileGroupStats) {
  const { usable } = pool(dim);
  return maxBy(
    usable.filter((g) => g.activeUsers >= 3),
    (g) => investScore(g, base),
  );
}

export function buildConclusions(
  dim: ProfileDimension,
  analysis: ProfilesAnalysis,
): Conclusion[] {
  const { base, period } = analysis;
  const out: Conclusion[] = [];

  if (base.users === 0) {
    return [
      {
        id: "empty",
        kind: "note",
        tag: "Nota",
        title: "Ainda não há usuários para analisar",
        body: "Assim que houver cadastros fora do time interno, os perfis aparecem aqui.",
      },
    ];
  }
  if (base.activeDays === 0) {
    return [
      {
        id: "no-activity",
        kind: "risk",
        tag: "Risco",
        title: `Nenhuma atividade ${periodPhrase(period)}`,
        body: "Nenhum usuário concluiu lição, treino, prática ou gravação no período, então não dá para comparar acesso entre perfis.",
        action: "Amplie o período ou verifique se o app está registrando atividades.",
      },
    ];
  }

  const { usable, lowConfidence } = pool(dim);
  const caveat = lowConfidence
    ? " Amostra ainda pequena: confirme a tendência nas próximas semanas."
    : "";
  const dimName = dim.label.toLowerCase();
  const hasPremium = dim.key !== "plan" && base.premiumRate > 0;

  const volume = maxBy(
    dim.groups.filter(
      (g) => isTargetable(g) && confidenceOf(g) !== "none" && g.activeDays > 0,
    ),
    (g) => g.shareOfActiveDays,
  );
  const invest = pickInvestTarget(dim, base);
  const intensity = maxBy(
    usable.filter((g) => g.activeUsers >= 3),
    (g) => g.accessIndex,
  );
  // Maior conversão entre os perfis utilizáveis, sem excluir ninguém.
  const converter = hasPremium
    ? maxBy(
        usable.filter((g) => g.premiumUsers >= 3),
        (g) => g.premiumRate,
      )
    : undefined;
  const converterStandsOut =
    converter !== undefined && converter.premiumRate >= base.premiumRate * 1.5;

  const premiumFact = (g: ProfileGroupStats) =>
    hasPremium
      ? ` ${fmtPct(g.premiumRate)} são premium (média ${fmtPct(base.premiumRate)})${
          converterStandsOut && converter?.key === g.key ? ", a maior conversão entre os perfis" : ""
        }.`
      : "";

  // 1. Priorizar na aquisição (absorve volume quando é o mesmo perfil)
  if (invest) {
    const leadsVolume = volume?.key === invest.key;
    out.push({
      id: "invest",
      kind: "positive",
      tag: leadsVolume ? "Priorizar · mais acessa" : "Priorizar",
      groupKey: invest.key,
      title: invest.label,
      body: `${
        leadsVolume
          ? "Lidera em volume e em uso por usuário:"
          : `Melhor combinação de uso (${fmtDecimal(invest.accessIndex)}× a média) e retorno:`
      } ${fmtPct(invest.recurringRate)} voltam toda semana.${premiumFact(invest)}${caveat}`,
      action: `Direcione campanhas, criativos e landing pages para ${invest.label.toLowerCase()}.`,
    });
  }

  // 2. Quem mais acessa, quando não é o perfil a priorizar
  if (volume && volume.key !== invest?.key) {
    out.push({
      id: "volume",
      kind: volume.accessIndex <= 0.95 ? "note" : "positive",
      tag: "Mais acessa",
      groupKey: volume.key,
      title: volume.label,
      body: `Gera ${fmtPct(volume.shareOfActiveDays)} de todos os dias ativos, sendo ${fmtPct(volume.shareOfBase)} da base. ${
        volume.accessIndex >= 1.05
          ? `Cada usuário acessa ${fmtDecimal(volume.accessIndex)}× a média.`
          : volume.accessIndex <= 0.95
            ? `Lidera pelo tamanho, não pelo uso (${fmtDecimal(volume.accessIndex)}× a média).`
            : "Acessa na média; lidera pelo tamanho."
      }`,
    });
  }

  // 3. Intensidade, quando não coincide com os anteriores
  if (intensity && intensity.key !== volume?.key && intensity.key !== invest?.key) {
    out.push({
      id: "intensity",
      kind: "positive",
      tag: "Mais intenso",
      groupKey: intensity.key,
      title: intensity.label,
      body: `Cada usuário acessa ${fmtDecimal(intensity.accessIndex)}× a média, com ${fmtDecimal(intensity.daysPerActiveUser)} dias por ativo.${caveat}`,
    });
  }

  const equalShare = 1 / Math.max(dim.groups.length, 1);
  const mentioned = new Set(out.map((c) => c.groupKey));

  // 4. Oportunidade: pequeno e intenso
  const opportunity = maxBy(
    usable.filter(
      (g) =>
        !mentioned.has(g.key) &&
        g.accessIndex >= 1.2 &&
        g.shareOfBase < equalShare &&
        g.activeUsers >= 3,
    ),
    (g) => g.accessIndex,
  );
  if (opportunity) {
    out.push({
      id: "opportunity",
      kind: "positive",
      tag: "Oportunidade",
      groupKey: opportunity.key,
      title: opportunity.label,
      body: `É só ${fmtPct(opportunity.shareOfBase)} da base, mas acessa ${fmtDecimal(opportunity.accessIndex)}× a média. Trazer mais gente desse perfil tende a elevar o engajamento geral.`,
      action: "Teste uma campanha dedicada com orçamento pequeno antes de escalar.",
    });
    mentioned.add(opportunity.key);
  }

  // 5. Risco: grande e com pouco uso
  const risk = maxBy(
    usable.filter((g) => g.shareOfBase >= equalShare && g.accessIndex <= 0.8),
    (g) => g.shareOfBase * (1 - g.accessIndex),
  );
  if (risk) {
    out.push({
      id: "risk",
      kind: "risk",
      tag: "Risco",
      groupKey: risk.key,
      title: risk.label,
      body: `Cadastra muito e usa pouco: é ${fmtPct(risk.shareOfBase)} da base e só ${fmtPct(risk.shareOfActiveDays)} dos acessos; ${fmtPct(risk.activationRate)} usaram o app no período (média ${fmtPct(base.activationRate)}).`,
      action: "Revise a promessa das campanhas para esse perfil ou a primeira experiência da trilha dele.",
    });
  }

  // 6. Maior conversão, quando ainda não foi citada
  if (converter && converterStandsOut && !mentioned.has(converter.key)) {
    out.push({
      id: "converter",
      kind: "positive",
      tag: "Converte mais",
      groupKey: converter.key,
      title: converter.label,
      body: `${fmtPct(converter.premiumRate)} são premium, ${fmtDecimal(converter.premiumRate / base.premiumRate)}× a taxa da base (${fmtPct(base.premiumRate)}).`,
      action: "Use esse perfil como público-semente em campanhas de conversão.",
    });
  }

  // 7. Tendência em dimensões ordenadas
  if (dim.ordered) {
    const known = dim.groups.filter(
      (g) => !g.unknown && confidenceOf(g) !== "none",
    );
    const first = known[0];
    const last = known[known.length - 1];
    if (first && last && first.key !== last.key && first.accessIndex > 0 && last.accessIndex > 0) {
      const ratio = last.accessIndex / first.accessIndex;
      if (ratio >= 1.2 || ratio <= 0.83) {
        const up = ratio > 1;
        const text =
          dim.key === "tenure"
            ? up
              ? `Quem está há mais tempo (${last.label.toLowerCase()}) acessa ${fmtDecimal(ratio)}× mais que quem chegou agora. O hábito se forma com o tempo: vale investir em retenção nas primeiras semanas.`
              : `Quem acabou de chegar acessa ${fmtDecimal(1 / ratio)}× mais que quem está há ${last.label.toLowerCase()}. O uso cai com o tempo de casa.`
            : up
              ? `${last.label} acessa ${fmtDecimal(ratio)}× mais que ${first.label}. Quanto mais o usuário avança, mais ele usa.`
              : `${first.label} acessa ${fmtDecimal(1 / ratio)}× mais que ${last.label}. O uso cai conforme o usuário avança.`;
        out.push({
          id: "trend",
          kind: up ? "positive" : "risk",
          tag: "Tendência",
          title: up ? "O uso cresce ao longo da escala" : "O uso cai ao longo da escala",
          body: text,
          action:
            dim.key === "tenure" && !up
              ? "Crie gatilhos de reengajamento (push, e-mail, metas) para usuários com mais de 30 dias."
              : undefined,
        });
      }
    }
  }

  // 8. Sem informação
  const unknown = dim.groups.find((g) => g.unknown);
  if (unknown && unknown.shareOfBase >= 0.15) {
    const isOnboarding = ["persona", "objective", "audience", "obstacle", "segment"].includes(dim.key);
    out.push({
      id: "unknown",
      kind: "note",
      tag: "Nota",
      groupKey: unknown.key,
      title: `${fmtPct(unknown.shareOfBase)} da base sem ${isOnboarding ? "perfil definido" : `dado de ${dimName}`}`,
      body: `Esse grupo (${unknown.label.toLowerCase()}) acessa ${fmtDecimal(unknown.accessIndex)}× a média e fica fora das recomendações acima.`,
      action: isOnboarding
        ? "Incentive a conclusão do onboarding para enxergar o perfil desses usuários."
        : undefined,
    });
  }

  // 9. Amostras pequenas
  const small = dim.groups.filter(
    (g) => !g.unknown && confidenceOf(g) !== "high",
  ).length;
  if (small > 0) {
    out.push({
      id: "small",
      kind: "note",
      tag: "Nota",
      title:
        small === 1
          ? `1 perfil tem menos de ${MIN_CONFIDENT_USERS} usuários`
          : `${small} perfis têm menos de ${MIN_CONFIDENT_USERS} usuários`,
      body: "As cores desses perfis aparecem esmaecidas: são tendência, não conclusão.",
    });
  }

  return out;
}

// ─── Veredito geral ──────────────────────────────────────────────────────────

export interface Verdict {
  dimension: ProfileDimension;
  leader: ProfileGroupStats;
  invest?: ProfileGroupStats;
  headline: string;
  support: string;
}

/** Usa a dimensão mais específica que tiver perfis com amostra suficiente. */
export function buildVerdict(analysis: ProfilesAnalysis): Verdict | null {
  if (analysis.base.activeDays === 0) return null;
  const order = ["persona", "objective", "audience", "segment"];
  for (const key of order) {
    const dim = analysis.dimensions.find((d) => d.key === key);
    if (!dim) continue;
    const confident = dim.groups.filter(
      (g) => isTargetable(g) && confidenceOf(g) === "high" && g.activeDays > 0,
    );
    if (confident.length === 0) continue;
    const leader = maxBy(confident, (g) => g.shareOfActiveDays)!;
    const invest = pickInvestTarget(dim, analysis.base);

    const headline = `${leader.label}: ${fmtPct(leader.shareOfBase)} da base, ${fmtPct(leader.shareOfActiveDays)} dos acessos.`;
    const period = capitalize(periodPhrase(analysis.period));
    let support: string;
    if (!invest || invest.key === leader.key) {
      support =
        leader.accessIndex >= 1.05
          ? `${period}, foi o perfil que mais acessou e é também o que mais vale atrair: cada usuário usa ${fmtDecimal(leader.accessIndex)}× a média da base.`
          : `${period}, foi o perfil que mais acessou, mas pelo tamanho: cada usuário usa ${fmtDecimal(leader.accessIndex)}× a média. Nenhum outro perfil se destaca em intensidade.`;
    } else {
      support = `${period}, foi quem mais acessou no total, mas quem vale mais atrair é ${invest.label}: cada usuário usa ${fmtDecimal(invest.accessIndex)}× a média${
        analysis.base.premiumRate > 0
          ? ` e converte ${fmtPct(invest.premiumRate)} para premium`
          : ""
      }.`;
    }
    return { dimension: dim, leader, invest, headline, support };
  }
  return null;
}

// ─── Comparação lado a lado ──────────────────────────────────────────────────

export interface ComparisonLine {
  metric: string;
  a: string;
  b: string;
  winner: "a" | "b" | "tie";
  sentence: string;
}

export function compareGroups(
  a: ProfileGroupStats,
  b: ProfileGroupStats,
  base: ProfileGroupStats,
  period: ProfilesAnalysis["period"],
): { lines: ComparisonLine[]; bottomLine: string } {
  const lines: ComparisonLine[] = [];

  const ratioLine = (
    metric: string,
    va: number,
    vb: number,
    fa: string,
    fb: string,
    noun: string,
  ) => {
    const hi = Math.max(va, vb);
    const lo = Math.min(va, vb);
    const tie = hi === 0 || lo / hi >= 0.95;
    const winner: ComparisonLine["winner"] = tie ? "tie" : va > vb ? "a" : "b";
    const w = winner === "a" ? a : b;
    lines.push({
      metric,
      a: fa,
      b: fb,
      winner,
      sentence: tie
        ? "Empate"
        : lo === 0
          ? `Só ${w.label} tem ${noun}`
          : `${w.label}: ${fmtDecimal(hi / lo)}× mais ${noun}`,
    });
  };

  const ppLine = (
    metric: string,
    va: number,
    vb: number,
    noun: string,
  ) => {
    const diff = Math.abs(va - vb);
    const winner: ComparisonLine["winner"] = diff < 0.02 ? "tie" : va > vb ? "a" : "b";
    const w = winner === "a" ? a : b;
    lines.push({
      metric,
      a: fmtPct(va),
      b: fmtPct(vb),
      winner,
      sentence:
        winner === "tie"
          ? "Praticamente iguais"
          : `${w.label}: ${fmtPp(Math.max(va, vb), Math.min(va, vb))} em ${noun}`,
    });
  };

  ratioLine(
    "Intensidade de acesso",
    a.accessIndex,
    b.accessIndex,
    `${fmtDecimal(a.accessIndex)}×`,
    `${fmtDecimal(b.accessIndex)}×`,
    "acesso por usuário",
  );
  ppLine("Ativação", a.activationRate, b.activationRate, "ativação");
  ratioLine(
    "Dias por ativo",
    a.daysPerActiveUser,
    b.daysPerActiveUser,
    fmtDecimal(a.daysPerActiveUser),
    fmtDecimal(b.daysPerActiveUser),
    "dias de uso por ativo",
  );
  ppLine(
    period.recurringThreshold == null
      ? "Recorrência (1×/semana)"
      : `Recorrência (${period.recurringThreshold}+ dias)`,
    a.recurringRate,
    b.recurringRate,
    "recorrência",
  );
  ppLine("Premium", a.premiumRate, b.premiumRate, "conversão premium");

  const sa = investScore(a, base);
  const sb = investScore(b, base);
  const lowSample = confidenceOf(a) !== "high" || confidenceOf(b) !== "high";
  const pick = sa >= sb ? a : b;
  const other = pick === a ? b : a;
  const close = Math.min(sa, sb) / Math.max(sa, sb, 0.0001) >= 0.92;
  const bottomLine = close
    ? `Os dois perfis têm valor parecido para aquisição; decida por custo de mídia e tamanho do público.`
    : `Se for escolher um para atrair, fique com ${pick.label}: entrega mais uso${
        pick.premiumRate - other.premiumRate >= 0.02 ? " e mais conversão" : ""
      } por usuário.`;

  return {
    lines,
    bottomLine: lowSample
      ? `${bottomLine} Pelo menos um dos perfis tem menos de ${MIN_CONFIDENT_USERS} usuários, então trate como tendência.`
      : bottomLine,
  };
}
