"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, EnvelopeSimple, Phone, WhatsappLogo } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { cn, formatDateTime } from "@/lib/utils";
import { ErrorState } from "@/components/error-state";
import { HeroStat, HeroStats, HeroStatsSkeleton, PageHero } from "@/components/page-hero";
import { fmt } from "@/components/dashboard/format";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

type InquiryStatus = "NEW" | "CONTACTED" | "CLOSED";

interface CompanyInquiry {
  id: string;
  name: string;
  email: string;
  company: string;
  phone: string | null;
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

const QUERY_KEY = ["company-inquiries"];

/** As colunas do quadro, na ordem do funil. */
const COLUMNS: { status: InquiryStatus; title: string; hint: string; dot: string }[] = [
  { status: "NEW", title: "Novo", hint: "Ainda sem resposta", dot: "bg-warning" },
  { status: "CONTACTED", title: "Em conversa", hint: "Respondido ou com conversa marcada", dot: "bg-primary" },
  { status: "CLOSED", title: "Encerrado", hint: "Virou cliente ou não seguiu", dot: "bg-muted-foreground" },
];
const ORDER = COLUMNS.map((c) => c.status);

const SOURCE_LABEL: Record<CompanyInquiry["source"], string> = { empresas: "Página Para empresas", home: "Home do site" };

/** De onde veio a visita, em uma linha ("google.com · organic · site-home"). */
const utmText = (u: CompanyInquiry["utm"]) => (u ? [u.source, u.medium, u.campaign].filter(Boolean).join(" · ") : "");

/** "+55 (11) 91234-5678" a partir dos dígitos guardados pela API. */
function phoneLabel(d: string): string {
  const m = d.match(/^55(\d{2})(\d{4,5})(\d{4})$/);
  return m ? `+55 (${m[1]}) ${m[2]}-${m[3]}` : `+${d}`;
}

/**
 * Contatos de empresas (14/11/2026): os pedidos de conversa do formulário do
 * site (/empresas e home) num quadro kanban: Novo → Em conversa → Encerrado.
 * Arraste o cartão entre as colunas (ou use as setas do cartão). Cada pedido
 * também chega por e-mail em contato@verbalizei.com.br.
 */
export default function CompanyInquiriesPage() {
  const qc = useQueryClient();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => api.get<InquiriesResponse>("/admin/company-inquiries"),
    refetchInterval: 60_000,
  });
  const items = data?.items ?? [];
  const fromHome = items.filter((i) => i.source === "home").length;
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<InquiryStatus | null>(null);

  // Mover é otimista: o cartão muda de coluna na hora e volta se a API recusar.
  const move = useMutation({
    mutationFn: ({ id, status }: { id: string; status: InquiryStatus }) =>
      api.patch<CompanyInquiry>(`/admin/company-inquiries/${id}`, { status }),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: QUERY_KEY });
      const prev = qc.getQueryData<InquiriesResponse>(QUERY_KEY);
      if (prev) {
        const from = prev.items.find((i) => i.id === id)?.status;
        const counts = { ...prev.counts };
        if (from) counts[from] -= 1;
        counts[status] += 1;
        qc.setQueryData<InquiriesResponse>(QUERY_KEY, {
          counts,
          items: prev.items.map((i) => (i.id === id ? { ...i, status } : i)),
        });
      }
      return { prev };
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(QUERY_KEY, ctx.prev);
      toast.error(`Não deu para mover: ${e.message}`);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      qc.invalidateQueries({ queryKey: ["company-inquiries", "new-count"] });
    },
  });

  const moveTo = (id: string, status: InquiryStatus) => {
    const cur = items.find((i) => i.id === id);
    if (cur && cur.status !== status) move.mutate({ id, status });
  };

  return (
    <div className="space-y-10">
      <PageHero
        title="Contatos de empresas"
        description="Os pedidos de conversa do formulário do site, na página Para empresas e na home. Cada pedido também chega por e-mail em contato@verbalizei.com.br. Arraste o cartão para a coluna certa quando responder ou fechar a conversa."
      >
        {isLoading ? (
          <HeroStatsSkeleton count={4} />
        ) : !isError && data ? (
          <HeroStats cols={4}>
            <HeroStat label="Novos" value={fmt(data.counts.NEW)} note="ainda sem resposta" />
            <HeroStat label="Em conversa" value={fmt(data.counts.CONTACTED)} />
            <HeroStat label="Encerrados" value={fmt(data.counts.CLOSED)} />
            <HeroStat
              label="Vieram da home"
              value={fmt(fromHome)}
              note={`de ${fmt(items.length)} no total`}
              help="O formulário curto da home entrou em 14/11/2026; o resto veio da página Para empresas."
            />
          </HeroStats>
        ) : null}
      </PageHero>

      {isError ? (
        <ErrorState title="Não deu para carregar os contatos" error={error} onRetry={() => refetch()} />
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-3">
          {COLUMNS.map((col) => {
            const cards = items.filter((i) => i.status === col.status);
            const isOver = over === col.status && dragging !== null;
            return (
              <section
                key={col.status}
                aria-labelledby={`col-${col.status}`}
                onDragOver={(e) => {
                  if (!dragging) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (over !== col.status) setOver(col.status);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("text/plain") || dragging;
                  if (id) moveTo(id, col.status);
                  setDragging(null);
                  setOver(null);
                }}
                className={cn(
                  "bg-muted/50 flex min-h-48 flex-col gap-3 rounded-2xl border border-transparent p-3 transition-colors",
                  isOver && "border-primary/50 bg-green-50",
                )}
              >
                <header className="flex items-center justify-between px-1 pt-1">
                  <div>
                    <h2 id={`col-${col.status}`} className="flex items-center gap-2 text-sm font-semibold">
                      <span aria-hidden className={cn("size-2 rounded-full", col.dot)} />
                      {col.title}
                    </h2>
                    <p className="text-muted-foreground text-xs">{col.hint}</p>
                  </div>
                  <span className="bg-card rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums">
                    {isLoading ? "…" : cards.length}
                  </span>
                </header>

                {isLoading ? (
                  Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-36 w-full rounded-xl" />)
                ) : cards.length === 0 ? (
                  <p className="text-muted-foreground rounded-xl border border-dashed px-4 py-8 text-center text-sm">
                    {col.status === "NEW"
                      ? "Nenhum pedido novo. Quando uma empresa preencher o formulário do site, ele aparece aqui."
                      : "Arraste um cartão para cá."}
                  </p>
                ) : (
                  cards.map((i) => (
                    <InquiryCard
                      key={i.id}
                      inquiry={i}
                      dragging={dragging === i.id}
                      onDragStart={() => setDragging(i.id)}
                      onDragEnd={() => {
                        setDragging(null);
                        setOver(null);
                      }}
                      onMove={(status) => moveTo(i.id, status)}
                    />
                  ))
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InquiryCard({
  inquiry: i,
  dragging,
  onDragStart,
  onDragEnd,
  onMove,
}: {
  inquiry: CompanyInquiry;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onMove: (status: InquiryStatus) => void;
}) {
  const qc = useQueryClient();
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState(i.notes ?? "");
  const saveNotes = useMutation({
    mutationFn: () => api.patch<CompanyInquiry>(`/admin/company-inquiries/${i.id}`, { notes }),
    onSuccess: () => {
      toast.success("Anotação salva.");
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: (e: Error) => toast.error(`Não deu para salvar: ${e.message}`),
  });
  const origin = utmText(i.utm);
  const idx = ORDER.indexOf(i.status);
  const prev = idx > 0 ? COLUMNS[idx - 1] : null;
  const next = idx < ORDER.length - 1 ? COLUMNS[idx + 1] : null;

  return (
    <article
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", i.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      aria-label={`${i.company}, ${i.teamSize}`}
      className={cn(
        "bg-card cursor-grab rounded-xl border p-4 shadow-[0_1px_2px_rgb(23_33_15/0.06)] transition-[opacity,box-shadow] active:cursor-grabbing",
        "hover:shadow-[0_1px_2px_rgb(23_33_15/0.06),0_6px_16px_-8px_rgb(23_33_15/0.18)]",
        dragging && "opacity-40",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold">{i.company}</h3>
          <p className="text-muted-foreground text-xs">
            {i.teamSize}
            {i.area ? ` · ${i.area}` : ""}
          </p>
        </div>
        <time dateTime={i.createdAt} className="text-muted-foreground shrink-0 text-[11px] tabular-nums">
          {formatDateTime(i.createdAt)}
        </time>
      </div>

      <div className="mt-3 space-y-1 text-sm">
        <p>{i.name}</p>
        <a
          href={`mailto:${i.email}?subject=${encodeURIComponent(`Verbalizei Times · ${i.company}`)}`}
          className="text-primary flex items-center gap-1.5 text-xs hover:underline"
        >
          <EnvelopeSimple className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{i.email}</span>
        </a>
        {i.phone && (
          <div className="flex items-center gap-3 text-xs">
            <a href={`tel:+${i.phone}`} className="text-primary flex items-center gap-1.5 hover:underline">
              <Phone className="size-3.5 shrink-0" aria-hidden />
              {phoneLabel(i.phone)}
            </a>
            <a
              href={`https://wa.me/${i.phone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary flex items-center gap-1 hover:underline"
              aria-label={`Abrir conversa no WhatsApp com ${i.name}`}
            >
              <WhatsappLogo className="size-3.5" aria-hidden />
              WhatsApp
            </a>
          </div>
        )}
      </div>

      <div className="text-muted-foreground mt-3 space-y-0.5 text-[11px]">
        <p>
          {SOURCE_LABEL[i.source] ?? i.source}
          {origin ? ` · ${origin}` : ""}
        </p>
        {i.marketing && <p>Aceita conteúdos por e-mail</p>}
        {!i.emailSent && (
          <p className="text-warning" title="O pedido está salvo, mas o aviso para contato@verbalizei.com.br falhou.">
            E-mail de aviso não saiu
          </p>
        )}
      </div>

      {i.notes && !notesOpen && <p className="bg-muted/60 mt-3 rounded-lg px-3 py-2 text-xs whitespace-pre-line">{i.notes}</p>}
      {notesOpen && (
        <div className="mt-3 space-y-2">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={2000}
            rows={3}
            placeholder="Ex.: conversa marcada para quinta, 10h; quer piloto com o atendimento."
            aria-label={`Anotação sobre a ${i.company}`}
          />
          <Button size="sm" disabled={saveNotes.isPending || notes === (i.notes ?? "")} onClick={() => saveNotes.mutate()}>
            Salvar anotação
          </Button>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between border-t pt-2">
        <button type="button" onClick={() => setNotesOpen((o) => !o)} className="text-muted-foreground text-xs hover:underline">
          {notesOpen ? "Fechar" : i.notes ? "Editar anotação" : "Anotar"}
        </button>
        <div className="flex gap-1">
          {prev && (
            <button
              type="button"
              onClick={() => onMove(prev.status)}
              aria-label={`Voltar ${i.company} para ${prev.title}`}
              title={`Voltar para ${prev.title}`}
              className="text-muted-foreground hover:bg-muted hover:text-foreground grid size-7 place-items-center rounded-lg"
            >
              <ArrowLeft className="size-4" aria-hidden />
            </button>
          )}
          {next && (
            <button
              type="button"
              onClick={() => onMove(next.status)}
              aria-label={`Passar ${i.company} para ${next.title}`}
              title={`Passar para ${next.title}`}
              className="text-muted-foreground hover:bg-muted hover:text-foreground grid size-7 place-items-center rounded-lg"
            >
              <ArrowRight className="size-4" aria-hidden />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
