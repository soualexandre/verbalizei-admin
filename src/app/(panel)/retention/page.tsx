"use client";

/*
 * Retorno manual (27/10/2026, estudo de ativação §5c6 e §5d3): quem aceitou o
 * lembrete no WhatsApp no fim do 1º treino e falou ontem — o fundador manda a
 * mensagem à mão, sem API do WhatsApp — e os depoimentos de quem disse que a
 * conversa "foi bem". Só leitura.
 */

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ErrorState } from "@/components/error-state";
import { PageHero, Section } from "@/components/page-hero";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface WhatsappRow {
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  reminderMinutes: number | null;
  optedInAt: string | null;
  falas: number;
  scenarioTitle: string | null;
  markLine: string | null;
  ask: string | null;
}

interface TestimonialRow {
  conversationId: string;
  title: string;
  testimonial: string | null;
  at: string | null;
  userId: string;
  name: string;
  email: string;
}

const hour = (m: number | null) =>
  m === null ? "—" : `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, "0") : ""}`;
const day = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—";
/** Link do WhatsApp com o número (só dígitos; sem DDI, assume Brasil). */
const waLink = (phone: string, text: string) => {
  const digits = phone.replace(/\D/g, "");
  const full = digits.length <= 11 ? `55${digits}` : digits;
  return `https://wa.me/${full}?text=${encodeURIComponent(text)}`;
};
const message = (r: WhatsappRow) => {
  const first = r.name.trim().split(/\s+/)[0] || "Oi";
  return `Oi, ${first}! ${r.markLine ?? "Seu treino de hoje está pronto."} Leva 30 segundos: https://app.verbalizei.com.br/dashboard`;
};

function LoadingTable() {
  return (
    <div className="flex flex-col gap-2">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

export default function RetentionPage() {
  const wa = useQuery({
    queryKey: ["retention", "whatsapp"],
    queryFn: () => api.get<{ day: string; rows: WhatsappRow[] }>("/admin/retention/whatsapp"),
  });
  const ts = useQuery({
    queryKey: ["retention", "testimonials"],
    queryFn: () => api.get<TestimonialRow[]>("/admin/retention/testimonials"),
  });

  return (
    <div className="flex flex-col gap-8">
      <PageHero
        title="Retorno manual"
        description="Quem pediu o lembrete no WhatsApp e falou ontem, para mandar à mão, e os depoimentos de quem disse que a conversa foi bem."
      />

      <Section
        title="WhatsApp: falaram ontem"
        description={wa.data ? `Dia ${wa.data.day.split("-").reverse().join("/")} (Brasília). A mensagem sugerida usa a marca da última fala.` : undefined}
      >
        {wa.isLoading ? (
          <LoadingTable />
        ) : wa.isError ? (
          <ErrorState title="Não foi possível carregar a lista." error={wa.error} onRetry={() => void wa.refetch()} />
        ) : !wa.data?.rows.length ? (
          <p className="text-muted-foreground text-sm">Ninguém com WhatsApp aceito falou ontem.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pessoa</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead>Lembrete</TableHead>
                <TableHead>Falas</TableHead>
                <TableHead>Última fala</TableHead>
                <TableHead>Mensagem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {wa.data.rows.map((r) => (
                <TableRow key={r.userId}>
                  <TableCell>
                    <div className="font-medium">{r.name}</div>
                    <div className="text-muted-foreground text-xs">{r.email}</div>
                  </TableCell>
                  <TableCell className="tabular-nums">{r.phone ?? "—"}</TableCell>
                  <TableCell className="tabular-nums">{hour(r.reminderMinutes)}</TableCell>
                  <TableCell className="tabular-nums">{r.falas}</TableCell>
                  <TableCell className="max-w-64">
                    <div className="truncate">{r.scenarioTitle ?? "—"}</div>
                    {r.ask && <div className="text-muted-foreground truncate text-xs">Pediu: {r.ask}</div>}
                  </TableCell>
                  <TableCell>
                    {r.phone ? (
                      <a href={waLink(r.phone, message(r))} target="_blank" rel="noreferrer" className="text-primary text-sm font-medium underline-offset-2 hover:underline">
                        Abrir no WhatsApp
                      </a>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>

      <Section title="Depoimentos" description="Uma frase depois de &quot;foi bem&quot;. Peça autorização antes de publicar com o nome.">
        {ts.isLoading ? (
          <LoadingTable />
        ) : ts.isError ? (
          <ErrorState title="Não foi possível carregar os depoimentos." error={ts.error} onRetry={() => void ts.refetch()} />
        ) : !ts.data?.length ? (
          <p className="text-muted-foreground text-sm">Nenhum depoimento ainda.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Depoimento</TableHead>
                <TableHead>Conversa</TableHead>
                <TableHead>Pessoa</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ts.data.map((t) => (
                <TableRow key={t.conversationId}>
                  <TableCell className="max-w-96 whitespace-normal">&ldquo;{t.testimonial}&rdquo;</TableCell>
                  <TableCell>{t.title}</TableCell>
                  <TableCell>
                    <div className="font-medium">{t.name}</div>
                    <div className="text-muted-foreground text-xs">{t.email}</div>
                  </TableCell>
                  <TableCell className="tabular-nums">{day(t.at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>
    </div>
  );
}
