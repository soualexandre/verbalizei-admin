"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, EnvelopeSimple } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import { ErrorState } from "@/components/error-state";
import { HeroStat, HeroStats, HeroStatsSkeleton, PageHero, Section } from "@/components/page-hero";
import { fmt } from "@/components/dashboard/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface OrgSignalMember {
  id: string;
  name: string | null;
  email: string;
  companyName: string | null;
  jobTitle: string | null;
  createdAt: string;
  trainingsThisMonth: number;
}

interface OrgSignal {
  key: string;
  label: string;
  domains: string[];
  people: number;
  activeThisMonth: number;
  trainingsThisMonth: number;
  ready: boolean;
  pitch: string;
  client: { id: string; name: string } | null;
  latestAt: string;
  members: OrgSignalMember[];
}

interface OrgSignalsResponse {
  monthStart: string;
  minPeople: number;
  pitchPeople: number;
  items: OrgSignal[];
}

/** Quem tem cargo de gestão primeiro é por quem a conversa começa. */
const LEAD_HINT = /(gerente|gestor|gestora|diretor|diretora|coordenador|coordenadora|head|líder|lider|supervisor|supervisora|ceo|cfo|coo|cto|sócio|socio|sócia|socia|fundador|fundadora|dono|dona|rh|recursos humanos|people)/i;

/**
 * Sinal de empresas (15/11/2026): pessoas da mesma empresa ou instituição
 * usando por conta própria, reconhecidas pelo nome que escreveram no cadastro
 * ou no perfil e pelo domínio do e-mail corporativo. Com 3 ou mais, é hora de
 * abordar o gestor com a frase da prova e oferecer o piloto de 30 dias.
 */
export default function CompanySignalsPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["org-signals"],
    queryFn: () => api.get<OrgSignalsResponse>("/admin/org-signals"),
  });
  const items = data?.items ?? [];
  const prospects = items.filter((o) => !o.client);
  const ready = prospects.filter((o) => o.ready);
  const watching = prospects.filter((o) => !o.ready);
  const clients = items.filter((o) => o.client);

  return (
    <div className="space-y-10">
      <PageHero
        title="Sinal de empresas"
        description="Pessoas da mesma empresa ou instituição usando o Verbalizei por conta própria. Juntamos pelo nome que escreveram no cadastro ou no perfil e pelo domínio do e-mail corporativo. Com 3 ou mais, aborde o gestor com a frase da prova e ofereça o piloto de 30 dias."
      >
        {isLoading ? (
          <HeroStatsSkeleton count={4} />
        ) : !isError && data ? (
          <HeroStats cols={4}>
            <HeroStat label="Prontas para abordar" value={fmt(ready.length)} note={`${data.pitchPeople}+ pessoas`} />
            <HeroStat label="Em observação" value={fmt(watching.length)} note={`${data.minPeople} pessoas`} />
            <HeroStat
              label="Treinos este mês"
              value={fmt(prospects.reduce((s, o) => s + o.trainingsThisMonth, 0))}
              note="das empresas que não são clientes"
              help="Salas concluídas e treinos curtos concluídos desde o dia 1º, no fuso de Brasília."
            />
            <HeroStat label="Já são clientes" value={fmt(clients.length)} note="mesmo nome de uma empresa ativa" />
          </HeroStats>
        ) : null}
      </PageHero>

      {isError ? (
        <ErrorState title="Não deu para carregar o sinal de empresas" error={error} onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-56 w-full rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border border-dashed px-4 py-10 text-center text-sm">
          Ainda não há duas pessoas da mesma empresa. Quando alguém preencher a empresa no cadastro ou no perfil (ou entrar com o
          e-mail da empresa) e já houver outra pessoa de lá, ela aparece aqui e no sininho.
        </p>
      ) : (
        <>
          {ready.length > 0 && (
            <Section title="Prontas para abordar" description="3 ou mais pessoas da mesma organização. Hora de falar com o gestor.">
              <OrgGrid items={ready} />
            </Section>
          )}
          {watching.length > 0 && (
            <Section title="Em observação" description="2 pessoas da mesma organização. Com a terceira, vira oportunidade.">
              <OrgGrid items={watching} />
            </Section>
          )}
          {clients.length > 0 && (
            <Section title="Já são clientes" description="O nome bate com uma empresa ativa em Empresas. Não entram no sininho.">
              <OrgGrid items={clients} />
            </Section>
          )}
        </>
      )}
    </div>
  );
}

function OrgGrid({ items }: { items: OrgSignal[] }) {
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      {items.map((o) => (
        <OrgCard key={o.key} org={o} />
      ))}
    </div>
  );
}

function OrgCard({ org: o }: { org: OrgSignal }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(o.pitch);
      toast.success("Frase copiada.");
    } catch {
      toast.error("Não deu para copiar.");
    }
  };
  const members = [...o.members].sort(
    (a, b) => Number(LEAD_HINT.test(b.jobTitle ?? "")) - Number(LEAD_HINT.test(a.jobTitle ?? "")),
  );

  return (
    <article className="bg-card rounded-xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 truncate font-semibold">
            {o.label}
            {o.client && (
              <Link href={`/organizations/${o.client.id}`}>
                <Badge variant="secondary">Cliente</Badge>
              </Link>
            )}
          </h3>
          <p className="text-muted-foreground text-xs">
            {o.people} pessoas · {o.activeThisMonth} treinaram este mês
            {o.domains.length ? ` · ${o.domains.join(", ")}` : ""}
          </p>
        </div>
        <span className="text-muted-foreground shrink-0 text-[11px] tabular-nums" title="Quando entrou a pessoa mais recente">
          {formatDate(o.latestAt)}
        </span>
      </div>

      <div className="bg-muted/60 mt-3 flex items-center justify-between gap-2 rounded-lg px-3 py-2">
        <p className="text-sm">{o.pitch}</p>
        <Button variant="ghost" size="sm" onClick={copy} aria-label="Copiar a frase">
          <Copy className="size-4" aria-hidden />
        </Button>
      </div>

      <ul className="mt-3 divide-y">
        {members.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-3 py-2">
            <div className="min-w-0">
              <Link href={`/users/${m.id}`} className="block truncate text-sm font-medium hover:underline">
                {m.name || m.email}
              </Link>
              <p className="text-muted-foreground truncate text-xs">
                {[m.jobTitle, m.companyName && m.companyName !== o.label ? m.companyName : null].filter(Boolean).join(" · ") ||
                  "Cargo não informado"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span
                className={cn("text-xs tabular-nums", m.trainingsThisMonth ? "text-foreground" : "text-muted-foreground")}
              >
                {m.trainingsThisMonth === 1 ? "1 treino" : `${m.trainingsThisMonth} treinos`}
              </span>
              <a
                href={`mailto:${m.email}`}
                className="text-primary hover:text-primary/80"
                aria-label={`Escrever para ${m.name || m.email}`}
              >
                <EnvelopeSimple className="size-4" aria-hidden />
              </a>
            </div>
          </li>
        ))}
      </ul>
    </article>
  );
}
