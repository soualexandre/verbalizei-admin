"use client";

import { useDeferredValue, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Info, PencilSimple, Plus, Storefront } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import type { AdminPricing, BillingCycle, BusinessPlanKey, OrgQuote, PricingAuditItem, PricingPromo } from "@/lib/types";
import {
  BUSINESS_PLAN_NAME,
  BUSINESS_PLANS,
  CYCLE_LABEL,
  PERIOD_WORD,
  PROMO_STATUS,
  annualDeal,
  brtDateToEndIso,
  brtDateToStartIso,
  describeChange,
  estimatedMargin,
  formatBRL,
  formatBrtDate,
  isoToBrtDate,
  marginExplained,
  parseMoneyInput,
  percent,
  plural,
  pricingKeys,
  promoStatus,
  type PricingDraft,
} from "@/lib/pricing";
import { formatDateTime, formatNumber } from "@/lib/utils";
import { ErrorState } from "@/components/error-state";
import { HeroStat, HeroStats, HeroStatsSkeleton, PageHero, Section } from "@/components/page-hero";
import { PolicyDialog, type FieldSpec, type PolicyDialogSpec } from "@/components/pricing/policy-dialog";
import { QuoteSummary } from "@/components/pricing/quote-summary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoTip } from "@/components/ui/info-tip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * Preços (20/11/2026, verbalizei-api/docs/politica-de-precos.md): a política
 * inteira de pessoas e empresas num lugar só. Os cartões só mostram; tudo se
 * muda pelo "Editar", que abre um diálogo e pede o motivo.
 */

const personName = (p: { name: string | null; email: string | null } | null) => p?.name || p?.email || "alguém";

export default function PricingPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: pricingKeys.view(),
    queryFn: () => api.get<AdminPricing>("/admin/pricing"),
  });
  const [dialog, setDialog] = useState<PolicyDialogSpec | null>(null);
  const [dialogKey, setDialogKey] = useState(0);
  const open = (spec: PolicyDialogSpec) => {
    setDialogKey((k) => k + 1);
    setDialog(spec);
  };

  const base: PricingDraft | null = data ? { policy: data.policy, limits: data.limits } : null;

  return (
    <>
      <PageHero
        title="Preços"
        description={
          data
            ? data.isDefault || !data.updatedAt
              ? "Os preços de pessoas e empresas, como saíram do estudo."
              : `Os preços de pessoas e empresas. Última mudança por ${personName(data.updatedBy)} em ${formatDateTime(data.updatedAt)}.`
            : "Os preços de pessoas e empresas."
        }
      >
        {data ? <Totals data={data} /> : isLoading ? <HeroStatsSkeleton count={4} /> : null}
      </PageHero>

      {data?.isDefault && (
        <p className="text-muted-foreground -mt-2 flex items-center gap-1.5 text-xs">
          <Info className="size-4 shrink-0" aria-hidden />
          Valores do estudo de preços; nada foi alterado ainda.
        </p>
      )}

      {isError && !data ? (
        <ErrorState title="Não foi possível carregar os preços." error={error} onRetry={() => refetch()} />
      ) : isLoading || !data || !base ? (
        <Skeleton className="h-96 rounded-card" />
      ) : (
        <Tabs defaultValue="pessoas" className="space-y-6">
          <TabsList>
            <TabsTrigger value="pessoas">Pessoas</TabsTrigger>
            <TabsTrigger value="empresas">Empresas</TabsTrigger>
          </TabsList>
          <TabsContent value="pessoas" className="space-y-6">
            <PeopleTab data={data} base={base} open={open} />
          </TabsContent>
          <TabsContent value="empresas" className="space-y-6">
            <BusinessTab data={data} open={open} />
          </TabsContent>
        </Tabs>
      )}

      <Section title="Histórico" description="As últimas mudanças de preço, com quem mudou, quando e por quê.">
        <History />
      </Section>

      {dialog && base && <PolicyDialog key={dialogKey} base={base} spec={dialog} onOpenChange={(v) => !v && setDialog(null)} />}
    </>
  );
}

function Totals({ data }: { data: AdminPricing }) {
  const orgs = Object.entries(data.usage.organizations).filter(([k]) => k !== "SEM_PLANO");
  const orgCount = orgs.reduce((t, [, v]) => t + v.count, 0);
  const noPlan = data.usage.organizations.SEM_PLANO?.count ?? 0;
  return (
    <HeroStats cols={4}>
      <HeroStat label="Assinam o Super" value={formatNumber(data.usage.starter)} note={`${formatBRL(data.policy.consumer.starter.monthly)} por mês`} help="Pessoas com o Super ativo." />
      <HeroStat label="Assinam o Max" value={formatNumber(data.usage.max)} note={`${formatBRL(data.policy.consumer.max.monthly)} por mês`} help="Pessoas com o Max ativo, sem contar quem está num passe." />
      <HeroStat label="Passes valendo" value={formatNumber(data.usage.pass)} note={data.policy.consumer.pass.enabled ? "À venda no site" : "Fora de venda"} help="Passes pagos que ainda não venceram." />
      <HeroStat
        label="Empresas com plano da tabela"
        value={formatNumber(orgCount)}
        note={noPlan ? `${plural(noPlan, "sem plano", "sem plano")}` : "Todas com plano"}
        help="Empresas ativas com um plano da tabela. As sem plano seguem sem uso justo."
      />
    </HeroStats>
  );
}

// ─── Cartão de plano ────────────────────────────────────────────────────────

function PlanCard({
  title,
  badge,
  price,
  priceNote,
  lines,
  usage,
  margin,
  onEdit,
}: {
  title: string;
  badge?: React.ReactNode;
  price: string;
  priceNote?: string;
  lines: React.ReactNode[];
  usage?: string;
  margin?: string | null;
  onEdit: () => void;
}) {
  return (
    <Card className="shadow-none">
      <CardHeader className="flex-row items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <CardTitle className="truncate">{title}</CardTitle>
          {badge}
        </div>
        <Button variant="ghost" size="sm" onClick={onEdit} aria-label={`Editar ${title}`}>
          <PencilSimple aria-hidden /> Editar
        </Button>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        <p className="font-display text-[1.375rem] leading-none font-bold tracking-tight tabular-nums">
          {price}
          {priceNote && <span className="text-muted-foreground ml-1.5 font-sans text-[13px] font-medium tracking-normal">{priceNote}</span>}
        </p>
        <ul className="text-muted-foreground space-y-1 text-[13px] leading-snug tabular-nums">
          {lines.filter(Boolean).map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
        {(usage || margin) && (
          <div className="mt-auto space-y-1 border-t pt-3 text-xs leading-snug tabular-nums">
            {usage && <p>{usage}</p>}
            {margin && (
              <p className="text-muted-foreground flex items-center gap-1">
                {margin}
                <InfoTip>{marginExplained()}</InfoTip>
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const marginPct = (price: number) => {
  const m = estimatedMargin(price);
  return m == null ? "—" : percent(Math.round(m * 100));
};

// ─── Pessoas ────────────────────────────────────────────────────────────────

const SAVE_NOTE = "Vale em até 30 segundos para quem compra a partir de agora.";

function PeopleTab({ data, base, open }: { data: AdminPricing; base: PricingDraft; open: (s: PolicyDialogSpec) => void }) {
  const { starter, max, pass } = data.policy.consumer;
  const free = data.limits.free;
  const sd = annualDeal(starter.monthly, starter.annual);
  const md = annualDeal(max.monthly, max.annual);
  const live = data.policy.promos.find((p) => promoStatus(p) === "live");

  return (
    <>
      <Section title="Planos" description="Os preços do site. Cada cartão mostra quantas pessoas estão no plano e a margem estimada.">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <PlanCard
            title="Grátis"
            price={`${free.limit}`}
            priceNote={`${free.limit === 1 ? "conversa" : "conversas"} ${PERIOD_WORD[free.period]}`}
            lines={[
              free.drillsPerDay == null
                ? "Treinos curtos sem limite."
                : `${plural(free.drillsPerDay, "treino curto", "treinos curtos")} por dia.`,
              "Não paga nada: serve para a pessoa conhecer e assinar.",
            ]}
            onEdit={() =>
              open({
                title: "Editar o Grátis",
                description: "Quanto quem não paga pode usar. Vale na hora, inclusive no período que está correndo.",
                fields: [
                  { path: "limits.free.limit", label: "Conversas", kind: "int" },
                  { path: "limits.free.period", label: "Período", kind: "period" },
                  { path: "limits.free.drillsPerDay", label: "Treinos curtos por dia", kind: "int", nullable: true, placeholder: "sem limite", hint: "Vazio = sem limite." },
                ],
              })
            }
          />
          <PlanCard
            title="Super"
            price={formatBRL(starter.monthly)}
            priceNote="por mês"
            lines={[
              `No anual, ${formatBRL(starter.annual)}: sai ${formatBRL(sd.perMonth)} por mês, ${percent(sd.savingsPercent)} a menos.`,
              `${plural(data.limits.starter.limit, "conversa", "conversas")} ${PERIOD_WORD[data.limits.starter.period]}.`,
            ]}
            usage={`${plural(data.usage.starter, "pessoa assina", "pessoas assinam")} o Super.`}
            margin={`Margem estimada de ${marginPct(starter.monthly)} no mensal e ${marginPct(sd.perMonth)} no anual.`}
            onEdit={() =>
              open({
                title: "Editar o Super",
                description: SAVE_NOTE,
                fields: [
                  { path: "consumer.starter.monthly", label: "Mensal", kind: "money" },
                  { path: "consumer.starter.annual", label: "Anual", kind: "money", hint: "Precisa sair mais barato que 12 mensais." },
                  { path: "limits.starter.limit", label: "Conversas", kind: "int" },
                  { path: "limits.starter.period", label: "Período", kind: "period" },
                ],
              })
            }
          />
          <PlanCard
            title="Max"
            price={formatBRL(max.monthly)}
            priceNote="por mês"
            lines={[
              `No anual, ${formatBRL(max.annual)}: sai ${formatBRL(md.perMonth)} por mês, ${percent(md.savingsPercent)} a menos.`,
              max.fairUsePerMonth == null
                ? "Sem limite de conversas."
                : `Uso justo de ${max.fairUsePerMonth} conversas por mês para quem assinou a partir de ${formatBrtDate(max.fairUseStartsAt)}. Quem assinou antes segue sem limite.`,
              live ? `Promoção valendo: ${live.name}.` : null,
            ]}
            usage={`${plural(data.usage.max, "pessoa assina", "pessoas assinam")} o Max.`}
            margin={`Margem estimada de ${marginPct(max.monthly)} no mensal e ${marginPct(md.perMonth)} no anual.`}
            onEdit={() =>
              open({
                title: "Editar o Max",
                description: SAVE_NOTE,
                fields: [
                  { path: "consumer.max.monthly", label: "Mensal", kind: "money" },
                  { path: "consumer.max.annual", label: "Anual", kind: "money", hint: "Precisa sair mais barato que 12 mensais." },
                  {
                    path: "consumer.max.fairUsePerMonth",
                    label: "Uso justo (conversas por mês)",
                    kind: "int",
                    nullable: true,
                    placeholder: "sem limite",
                    hint: "Vazio = sem limite.",
                  },
                  {
                    path: "consumer.max.fairUseStartsAt",
                    label: "Uso justo vale a partir de",
                    kind: "date-start",
                    hint: "Quem assinou antes dessa data segue sem limite até a próxima compra.",
                  },
                ],
              })
            }
          />
          <PlanCard
            title="Passe"
            badge={<Badge variant={pass.enabled ? "success" : "secondary"}>{pass.enabled ? "À venda" : "Desligado"}</Badge>}
            price={formatBRL(pass.amount)}
            priceNote="uma vez"
            lines={[
              `Libera o Max por ${plural(pass.days, "dia", "dias")}, com ${plural(pass.conversations, "conversa", "conversas")}.`,
              "Vendido só no site, sem renovação.",
            ]}
            usage={`${plural(data.usage.pass, "passe vale", "passes valem")} agora.`}
            margin={`Margem estimada de ${marginPct(pass.amount)} por passe.`}
            onEdit={() =>
              open({
                title: "Editar o Passe",
                description: "Pagamento único, só no site. Desligado, some da página de vendas.",
                fields: [
                  { path: "consumer.pass.enabled", label: "À venda no site", kind: "switch" },
                  { path: "consumer.pass.amount", label: "Preço", kind: "money" },
                  { path: "consumer.pass.days", label: "Dias", kind: "int" },
                  { path: "consumer.pass.conversations", label: "Conversas", kind: "int" },
                ],
              })
            }
          />
        </div>
      </Section>

      <Promos data={data} base={base} open={open} />

      <Section title="Lojas" description="Os 4 produtos cadastrados na App Store e no Google Play, com o preço desta tabela.">
        <Card className="shadow-none">
          <CardContent className="space-y-3">
            <p className="flex items-start gap-2 text-[13px] leading-snug">
              <Storefront className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
              A App Store e o Google Play cobram o preço cadastrado lá. Ao mudar o Super ou o Max, troque também nas lojas.
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Código nas lojas</TableHead>
                  <TableHead className="text-right">Preço aqui</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.storeProducts.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-muted-foreground">{p.period === "month" ? "Mensal" : "Anual"}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">{p.id}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatBRL(p.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Section>
    </>
  );
}

// ─── Promoções ──────────────────────────────────────────────────────────────

const promoFields = (i: number, max: { monthly: number; annual: number }): FieldSpec[] => [
  { path: `promos.${i}.name`, label: "Nome", kind: "text", wide: true, placeholder: "Ex.: Volta às aulas" },
  { path: `promos.${i}.startsAt`, label: "Começa em", kind: "date-start", hint: "Desde 0h, horário de Brasília." },
  { path: `promos.${i}.endsAt`, label: "Termina em", kind: "date-end", hint: "Até 23h59, horário de Brasília." },
  { path: `promos.${i}.maxMonthly`, label: "Max mensal na promoção", kind: "money", nullable: true, placeholder: "sem desconto", hint: `Vazio = sem desconto. Cheio: ${formatBRL(max.monthly)}.` },
  { path: `promos.${i}.maxAnnual`, label: "Max anual na promoção", kind: "money", nullable: true, placeholder: "sem desconto", hint: `Vazio = sem desconto. Cheio: ${formatBRL(max.annual)}.` },
  { path: `promos.${i}.hideStarter`, label: "Esconder o Super enquanto vale", kind: "switch" },
  { path: `promos.${i}.enabled`, label: "Ligada", kind: "switch" },
];

const todayBrt = () => isoToBrtDate(new Date().toISOString());

function Promos({ data, base, open }: { data: AdminPricing; base: PricingDraft; open: (s: PolicyDialogSpec) => void }) {
  const promos = data.policy.promos;
  const max = data.policy.consumer.max;

  const create = () => {
    const start = todayBrt();
    const end = new Date(Date.parse(`${start}T00:00:00Z`) + 7 * 86400_000).toISOString().slice(0, 10);
    const promo: PricingPromo = {
      id: "",
      name: "",
      startsAt: brtDateToStartIso(start),
      endsAt: brtDateToEndIso(end),
      enabled: true,
      maxMonthly: null,
      maxAnnual: null,
      hideStarter: false,
    };
    const initial = structuredClone(base);
    initial.policy.promos.push(promo);
    open({
      title: "Nova promoção do Max",
      description: "Defina o preço do mensal, do anual ou dos dois. Duas promoções ligadas não podem se cruzar nas datas.",
      initial,
      fields: promoFields(promos.length, max),
      confirmLabel: "Criar promoção",
      successMessage: "Promoção criada.",
    });
  };

  const toggle = (i: number) => {
    const p = promos[i];
    const initial = structuredClone(base);
    initial.policy.promos[i].enabled = !p.enabled;
    open({
      title: p.enabled ? `Desligar "${p.name}"?` : `Ligar "${p.name}"?`,
      description: p.enabled ? "O preço cheio volta a valer na hora." : "A promoção passa a valer nas datas marcadas.",
      initial,
      fields: [],
      confirmLabel: p.enabled ? "Desligar" : "Ligar",
      successMessage: p.enabled ? "Promoção desligada." : "Promoção ligada.",
    });
  };

  const remove = (i: number) => {
    const p = promos[i];
    const initial = structuredClone(base);
    initial.policy.promos.splice(i, 1);
    open({
      title: `Remover "${p.name}"?`,
      description: "Ela sai da lista. O histórico guarda como era.",
      initial,
      fields: [],
      confirmLabel: "Remover",
      destructive: true,
      successMessage: "Promoção removida.",
    });
  };

  return (
    <Section
      title="Promoções"
      description="Preço menor do Max entre duas datas. Só uma promoção ligada vale por vez."
      aside={
        <Button variant="ghost" size="sm" onClick={create}>
          <Plus aria-hidden /> Nova promoção
        </Button>
      }
    >
      <ul className="rounded-card bg-card divide-y border">
        {promos.length === 0 && <li className="text-muted-foreground px-4 py-6 text-center text-xs">Nenhuma promoção cadastrada.</li>}
        {promos.map((p, i) => {
          const s = PROMO_STATUS[promoStatus(p)];
          const prices = [
            p.maxMonthly != null ? `${formatBRL(p.maxMonthly)} no mensal` : null,
            p.maxAnnual != null ? `${formatBRL(p.maxAnnual)} no anual` : null,
          ]
            .filter(Boolean)
            .join(" e ");
          return (
            <li key={p.id || i} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-[13px]">
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate font-medium">{p.name}</span>
                  <Badge variant={s.variant}>{s.label}</Badge>
                </span>
                <span className="text-muted-foreground block text-xs tabular-nums">
                  De {formatBrtDate(p.startsAt)} a {formatBrtDate(p.endsAt)}. Max a {prices}.{p.hideStarter ? " Esconde o Super." : ""}
                </span>
              </span>
              <span className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    open({
                      title: `Editar "${p.name}"`,
                      description: "Duas promoções ligadas não podem se cruzar nas datas.",
                      fields: promoFields(i, max),
                    })
                  }
                >
                  Editar
                </Button>
                <Button variant="ghost" size="sm" onClick={() => toggle(i)}>
                  {p.enabled ? "Desligar" : "Ligar"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => remove(i)}>
                  Remover
                </Button>
              </span>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

// ─── Empresas ───────────────────────────────────────────────────────────────

function orgUsage(data: AdminPricing, plan: BusinessPlanKey): string {
  const u = data.usage.organizations[plan];
  if (!u || u.count === 0) return "Nenhuma empresa neste plano ainda.";
  return `${plural(u.count, "empresa", "empresas")}, ${plural(u.seats, "pessoa", "pessoas")}, ${formatBRL(u.monthlyCents / 100)} por mês combinados.`;
}

function BusinessTab({ data, open }: { data: AdminPricing; open: (s: PolicyDialogSpec) => void }) {
  const b = data.policy.business;
  const noPlan = data.usage.organizations.SEM_PLANO?.count ?? 0;
  const tierFields = (k: "essencial" | "pro"): FieldSpec[] => [
    { path: `business.${k}.annual`, label: "Por pessoa no anual", kind: "money" },
    { path: `business.${k}.monthly`, label: "Por pessoa no mensal", kind: "money", hint: "Não pode ficar abaixo do anual." },
    { path: `business.${k}.maxSeats`, label: "Até quantas pessoas", kind: "int", hint: "Acima disso, o plano indicado é o Empresa." },
  ];
  const tierLines = (t: { annual: number; monthly: number; maxSeats: number }) => [
    `No mensal, ${formatBRL(t.monthly)} por pessoa.`,
    `De ${b.minSeats} a ${t.maxSeats} pessoas.`,
  ];
  const note = "Vale para orçamentos novos. O preço de cada empresa fica no contrato dela.";

  return (
    <>
      <Section title="Planos" description="Preço por pessoa por mês. O contrato anual é cobrado pelos 12 meses.">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <PlanCard
            title={BUSINESS_PLAN_NAME.ESSENCIAL}
            price={formatBRL(b.essencial.annual)}
            priceNote="por pessoa/mês no anual"
            lines={tierLines(b.essencial)}
            usage={orgUsage(data, "ESSENCIAL")}
            onEdit={() => open({ title: `Editar o ${BUSINESS_PLAN_NAME.ESSENCIAL}`, description: note, fields: tierFields("essencial") })}
          />
          <PlanCard
            title={BUSINESS_PLAN_NAME.PRO}
            price={formatBRL(b.pro.annual)}
            priceNote="por pessoa/mês no anual"
            lines={tierLines(b.pro)}
            usage={orgUsage(data, "PRO")}
            onEdit={() => open({ title: `Editar o ${BUSINESS_PLAN_NAME.PRO}`, description: note, fields: tierFields("pro") })}
          />
          <PlanCard
            title={BUSINESS_PLAN_NAME.PILOTO}
            price={formatBRL(b.pilot.amount)}
            priceNote="valor único"
            lines={[`${plural(b.pilot.days, "dia", "dias")}, para até ${plural(b.pilot.seats, "pessoa", "pessoas")}.`, "Sem desconto de parceiro."]}
            usage={orgUsage(data, "PILOTO")}
            onEdit={() =>
              open({
                title: `Editar o ${BUSINESS_PLAN_NAME.PILOTO}`,
                description: note,
                fields: [
                  { path: "business.pilot.amount", label: "Preço", kind: "money" },
                  { path: "business.pilot.seats", label: "Até quantas pessoas", kind: "int" },
                  { path: "business.pilot.days", label: "Dias", kind: "int" },
                ],
              })
            }
          />
          <PlanCard
            title={BUSINESS_PLAN_NAME.EMPRESA}
            price="Sob consulta"
            lines={[
              `Para times acima de ${b.essencial.maxSeats} pessoas.`,
              `O piso é de ${formatBRL(b.enterprise.floorAnnual)} por pessoa por mês no anual.`,
            ]}
            usage={orgUsage(data, "EMPRESA")}
            onEdit={() =>
              open({
                title: `Editar o ${BUSINESS_PLAN_NAME.EMPRESA}`,
                description: note,
                fields: [
                  { path: "business.enterprise.floorAnnual", label: "Piso por pessoa no anual", kind: "money", hint: "Precisa ficar abaixo do Essencial anual." },
                ],
              })
            }
          />
          <PlanCard
            title="Regras gerais"
            price={`${b.minSeats}`}
            priceNote="pessoas no mínimo"
            lines={[
              `Parceiros (consultorias e coaches) têm ${percent(b.partnerDiscountPercent)} de desconto sobre a lista.`,
              b.fairUsePerPerson == null
                ? "Sem uso justo nas empresas."
                : `Uso justo de ${b.fairUsePerPerson} conversas por pessoa por mês, só nas empresas com plano da tabela.`,
            ]}
            usage={noPlan ? `${plural(noPlan, "empresa ainda está", "empresas ainda estão")} sem plano da tabela e ${noPlan === 1 ? "segue" : "seguem"} sem limite.` : undefined}
            onEdit={() =>
              open({
                title: "Editar as regras gerais",
                description: note,
                fields: [
                  { path: "business.minSeats", label: "Mínimo de pessoas", kind: "int" },
                  { path: "business.partnerDiscountPercent", label: "Desconto de parceiro (%)", kind: "int" },
                  {
                    path: "business.fairUsePerPerson",
                    label: "Uso justo por pessoa (conversas por mês)",
                    kind: "int",
                    nullable: true,
                    placeholder: "sem limite",
                    hint: "Vazio = sem limite. Só vale nas empresas com plano da tabela.",
                    wide: true,
                  },
                ],
              })
            }
          />
        </div>
      </Section>

      <Section title="Calculadora" description="Quanto uma empresa paga pela tabela atual. Não grava nada.">
        <Calculator />
      </Section>
    </>
  );
}

function Calculator() {
  const [plan, setPlan] = useState<BusinessPlanKey>("ESSENCIAL");
  const [cycle, setCycle] = useState<BillingCycle>("ANNUAL");
  const [seats, setSeats] = useState("10");
  const [partner, setPartner] = useState(false);
  const [agreed, setAgreed] = useState("");

  const n = Number(seats);
  const seatsValid = /^\d+$/.test(seats.trim()) && n >= 1;
  const agreedValue = plan === "EMPRESA" ? parseMoneyInput(agreed) : null;
  const params = new URLSearchParams({ plan, cycle, seats: String(n), partner: String(partner) });
  if (agreedValue != null && !Number.isNaN(agreedValue)) params.set("agreedPerSeat", String(agreedValue));
  const qs = useDeferredValue(params.toString());

  const quote = useQuery({
    queryKey: pricingKeys.quote(qs),
    queryFn: () => api.get<OrgQuote>(`/admin/pricing/quote?${qs}`),
    enabled: seatsValid,
    placeholderData: keepPreviousData,
  });

  return (
    <Card className="shadow-none">
      <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="calc-plan" className="text-xs font-medium">Plano</Label>
            <Select value={plan} onValueChange={(v) => setPlan(v as BusinessPlanKey)}>
              <SelectTrigger id="calc-plan" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BUSINESS_PLANS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {BUSINESS_PLAN_NAME[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {plan !== "PILOTO" && (
            <div className="space-y-1">
              <Label htmlFor="calc-cycle" className="text-xs font-medium">Ciclo</Label>
              <Select value={cycle} onValueChange={(v) => setCycle(v as BillingCycle)}>
                <SelectTrigger id="calc-cycle" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ANNUAL">{CYCLE_LABEL.ANNUAL}</SelectItem>
                  <SelectItem value="MONTHLY">{CYCLE_LABEL.MONTHLY}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1">
            <Label htmlFor="calc-seats" className="text-xs font-medium">Pessoas</Label>
            <Input id="calc-seats" inputMode="numeric" value={seats} onChange={(e) => setSeats(e.target.value)} className="tabular-nums" aria-invalid={!seatsValid} />
            {!seatsValid && <p className="text-destructive text-[11px]">Use um número inteiro a partir de 1.</p>}
          </div>
          {plan === "EMPRESA" && (
            <div className="space-y-1">
              <Label htmlFor="calc-agreed" className="text-xs font-medium">Preço combinado por pessoa</Label>
              <div className="relative">
                <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">R$</span>
                <Input id="calc-agreed" inputMode="decimal" value={agreed} onChange={(e) => setAgreed(e.target.value)} placeholder="opcional" className="pl-9 tabular-nums" />
              </div>
            </div>
          )}
          {plan !== "PILOTO" && plan !== "EMPRESA" && (
            <div className="flex items-center justify-between gap-3 sm:col-span-2">
              <Label htmlFor="calc-partner" className="text-xs font-medium">Vendido por parceiro (consultoria ou coach)</Label>
              <Switch id="calc-partner" checked={partner} onCheckedChange={setPartner} />
            </div>
          )}
        </div>
        <div className="lg:border-l lg:pl-6" aria-live="polite">
          {!seatsValid ? (
            <p className="text-muted-foreground text-[13px]">Diga quantas pessoas para ver o preço.</p>
          ) : quote.isError ? (
            <ErrorState bare title="Não deu para calcular." error={quote.error} onRetry={() => quote.refetch()} />
          ) : !quote.data ? (
            <Skeleton className="h-24" />
          ) : (
            <QuoteSummary quote={quote.data} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Histórico ──────────────────────────────────────────────────────────────

function History() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: pricingKeys.audit(),
    queryFn: () => api.get<{ items: PricingAuditItem[] }>("/admin/pricing/audit?limit=30"),
  });
  if (isError) return <ErrorState title="Não foi possível carregar o histórico." error={error} onRetry={() => refetch()} />;
  if (isLoading || !data) return <Skeleton className="h-32 rounded-card" />;
  return (
    <ul className="rounded-card bg-card divide-y border">
      {data.items.length === 0 && (
        <li className="text-muted-foreground px-4 py-6 text-center text-xs">Nenhuma mudança ainda. Os preços são os do estudo.</li>
      )}
      {data.items.map((item) => {
        const lines = item.changes.flatMap(describeChange);
        return (
          <li key={item.id} className="space-y-1.5 px-4 py-3 text-[13px] leading-snug">
            <p>
              <span className="font-medium">{personName(item.actor)}</span>
              <span className="text-muted-foreground"> · {formatDateTime(item.createdAt)}</span>
            </p>
            {item.reason && <p className="text-muted-foreground">Motivo: {item.reason}</p>}
            {lines.length > 0 ? (
              <ul className="list-disc space-y-0.5 pl-5 tabular-nums">
                {lines.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-xs">Salvou sem mudar nenhum valor.</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
