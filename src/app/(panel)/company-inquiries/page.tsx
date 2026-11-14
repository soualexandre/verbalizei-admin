"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { ErrorState } from "@/components/error-state";
import { HeroStat, HeroStats, HeroStatsSkeleton, PageHero, Section } from "@/components/page-hero";
import { fmt } from "@/components/dashboard/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type InquiryStatus = "NEW" | "CONTACTED" | "CLOSED";

interface CompanyInquiry {
  id: string;
  name: string;
  email: string;
  company: string;
  teamSize: string;
  area: string | null;
  marketing: boolean;
  source: "empresas" | "home";
  utm: Record<string, string> | null;
  status: InquiryStatus;
  notes: string | null;
  emailSent: boolean;
  handledAt: string | null;
  createdAt: string;
}

interface InquiriesResponse {
  items: CompanyInquiry[];
  counts: Record<InquiryStatus, number>;
}

const STATUS_LABEL: Record<InquiryStatus, string> = { NEW: "Novo", CONTACTED: "Em conversa", CLOSED: "Encerrado" };
const STATUS_VARIANT: Record<InquiryStatus, "warning" | "default" | "secondary"> = {
  NEW: "warning",
  CONTACTED: "default",
  CLOSED: "secondary",
};
const SOURCE_LABEL: Record<CompanyInquiry["source"], string> = { empresas: "Página Para empresas", home: "Home do site" };

/** De onde veio a visita, em uma linha ("google.com · organic · site-home"). */
const utmText = (u: CompanyInquiry["utm"]) => (u ? [u.source, u.medium, u.campaign].filter(Boolean).join(" · ") : "");

/**
 * Contatos de empresas (14/11/2026): os pedidos de conversa do formulário do
 * site (/empresas e home). Cada pedido também chega por e-mail em
 * contato@verbalizei.com.br; aqui fica o histórico e a situação de cada um.
 */
export default function CompanyInquiriesPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["company-inquiries"],
    queryFn: () => api.get<InquiriesResponse>("/admin/company-inquiries"),
    refetchInterval: 60_000,
  });
  const items = data?.items ?? [];
  const counts = data?.counts ?? { NEW: 0, CONTACTED: 0, CLOSED: 0 };
  const fromHome = items.filter((i) => i.source === "home").length;

  return (
    <div className="space-y-12">
      <PageHero
        title="Contatos de empresas"
        description="Os pedidos de conversa do formulário do site, na página Para empresas e na home. Cada pedido também chega por e-mail em contato@verbalizei.com.br. Responda pelo e-mail da pessoa e marque aqui em que pé está."
      >
        {isLoading ? (
          <HeroStatsSkeleton count={4} />
        ) : !isError ? (
          <HeroStats cols={4}>
            <HeroStat label="Novos" value={fmt(counts.NEW)} note="ainda sem resposta" />
            <HeroStat label="Em conversa" value={fmt(counts.CONTACTED)} />
            <HeroStat label="Encerrados" value={fmt(counts.CLOSED)} />
            <HeroStat
              label="Vieram da home"
              value={fmt(fromHome)}
              note={`de ${fmt(items.length)} no total`}
              help="O formulário curto da home entrou em 14/11/2026; o resto veio da página Para empresas."
            />
          </HeroStats>
        ) : null}
      </PageHero>

      <Section title="Todos os pedidos" description="Do mais novo para o mais antigo. Mude a situação quando responder ou fechar a conversa.">
        {isError ? (
          <ErrorState title="Não deu para carregar os contatos" error={error} onRetry={() => refetch()} />
        ) : (
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Quem pediu</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Quando</TableHead>
                    <TableHead>Situação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={6}>
                          <Skeleton className="h-8 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-muted-foreground py-10 text-center">
                        Nenhum pedido ainda. Quando uma empresa preencher o formulário do site, ele aparece aqui e no e-mail.
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((i) => <InquiryRow key={i.id} inquiry={i} />)
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </Section>
    </div>
  );
}

function InquiryRow({ inquiry: i }: { inquiry: CompanyInquiry }) {
  const qc = useQueryClient();
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState(i.notes ?? "");
  const save = useMutation({
    mutationFn: (patch: { status?: InquiryStatus; notes?: string }) =>
      api.patch<CompanyInquiry>(`/admin/company-inquiries/${i.id}`, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-inquiries"] });
    },
    onError: (e: Error) => toast.error(`Não deu para salvar: ${e.message}`),
  });
  const origin = utmText(i.utm);

  return (
    <>
      <TableRow>
        <TableCell className="align-top">
          <p className="font-medium">{i.company}</p>
          {i.area && <p className="text-muted-foreground text-xs">{i.area}</p>}
        </TableCell>
        <TableCell className="align-top">
          <p>{i.name}</p>
          <a
            href={`mailto:${i.email}?subject=${encodeURIComponent(`Verbalizei Times · ${i.company}`)}`}
            className="text-primary text-xs hover:underline"
          >
            {i.email}
          </a>
          {i.marketing && <p className="text-muted-foreground text-xs">Aceita conteúdos por e-mail</p>}
        </TableCell>
        <TableCell className="align-top tabular-nums">{i.teamSize}</TableCell>
        <TableCell className="align-top">
          <p>{SOURCE_LABEL[i.source] ?? i.source}</p>
          {origin && <p className="text-muted-foreground text-xs">{origin}</p>}
          {!i.emailSent && (
            <p className="text-warning text-xs" title="O pedido está salvo, mas o aviso para contato@verbalizei.com.br falhou.">
              E-mail de aviso não saiu
            </p>
          )}
        </TableCell>
        <TableCell className="text-muted-foreground align-top whitespace-nowrap">{formatDateTime(i.createdAt)}</TableCell>
        <TableCell className="align-top">
          <div className="flex flex-col items-start gap-2">
            <Select value={i.status} onValueChange={(v) => save.mutate({ status: v as InquiryStatus })} disabled={save.isPending}>
              <SelectTrigger className="h-9 w-40" aria-label={`Situação do pedido da ${i.company}`}>
                <SelectValue>
                  <Badge variant={STATUS_VARIANT[i.status]}>{STATUS_LABEL[i.status]}</Badge>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_LABEL) as InquiryStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button type="button" onClick={() => setNotesOpen((o) => !o)} className="text-muted-foreground text-xs hover:underline">
              {notesOpen ? "Fechar anotação" : i.notes ? "Ver anotação" : "Anotar"}
            </button>
          </div>
        </TableCell>
      </TableRow>
      {notesOpen && (
        <TableRow>
          <TableCell colSpan={6} className="bg-muted/40">
            <div className="flex flex-col gap-2 py-1 sm:flex-row sm:items-end">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={2000}
                rows={2}
                placeholder="Ex.: conversa marcada para quinta, 10h; quer piloto com o atendimento."
                aria-label={`Anotação sobre a ${i.company}`}
                className="bg-card"
              />
              <Button
                size="sm"
                disabled={save.isPending || notes === (i.notes ?? "")}
                onClick={() => save.mutate({ notes }, { onSuccess: () => toast.success("Anotação salva.") })}
              >
                Salvar
              </Button>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
