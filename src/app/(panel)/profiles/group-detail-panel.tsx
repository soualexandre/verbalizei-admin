"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { api } from "@/lib/api";
import type { AnswerField, ProfileGroupDetail, ProfileDimensionKey } from "@/lib/types";
import { cn, formatDate, formatNumber } from "@/lib/utils";
import { PaginationBar } from "@/components/pagination-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const TEXTS_PREVIEW = 12;

const ANSWER_LABEL: Record<AnswerField, string> = {
  objective: "Foco",
  audience: "Papel",
  obstacle: "Dificuldade",
};

export function GroupDetailPanel({
  dimension,
  groupKey,
  query,
  onClose,
}: {
  dimension: ProfileDimensionKey;
  groupKey: string;
  /** days, includeMocks e includeInferred da página, para bater com o mapa. */
  query: string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [textFilter, setTextFilter] = useState("");
  const [showAllTexts, setShowAllTexts] = useState(false);

  useEffect(() => {
    setPage(1);
    setSearch("");
    setSearchInput("");
    setTextFilter("");
    setShowAllTexts(false);
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [dimension, groupKey]);

  const params = new URLSearchParams(query);
  params.set("dimension", dimension);
  params.set("key", groupKey);
  params.set("page", String(page));
  if (search) params.set("search", search);

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ["profile-group", params.toString()],
    queryFn: () => api.get<ProfileGroupDetail>(`/admin/profiles/groups?${params}`),
    placeholderData: (prev) =>
      prev && prev.group.key === groupKey && prev.dimension.key === dimension ? prev : undefined,
  });

  const texts = useMemo(() => {
    const term = textFilter.trim().toLowerCase();
    return (data?.texts ?? []).filter((t) => !term || t.text.toLowerCase().includes(term));
  }, [data?.texts, textFilter]);
  const multipleFields = new Set(data?.texts.map((t) => t.field)).size > 1;
  const visibleTexts = showAllTexts ? texts : texts.slice(0, TEXTS_PREVIEW);

  return (
    <div ref={ref} className="scroll-mt-6">
      <Card className="gap-4">
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <CardTitle className="text-balance">
              {data ? data.group.label : "Carregando grupo…"}
            </CardTitle>
            <CardDescription>
              {data
                ? `${data.dimension.label} · ${formatNumber(data.group.users)} usuários · ${
                    data.writtenUsers > 0
                      ? `${formatNumber(data.writtenUsers)} escreveram a própria resposta`
                      : "ninguém escreveu resposta própria"
                  }`
                : "Buscando quem está neste grupo."}
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="shrink-0">
            <X className="size-4" />
            Fechar
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          {isError ? (
            <p className="text-destructive text-sm">
              Não foi possível carregar o grupo: {error instanceof Error ? error.message : "erro"}.
            </p>
          ) : isLoading || !data ? (
            <div className="space-y-3">
              <Skeleton className="h-24" />
              <Skeleton className="h-48" />
            </div>
          ) : (
            <>
              <section aria-labelledby="group-texts" className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 id="group-texts" className="text-sm font-semibold">
                    O que escreveram
                  </h3>
                  {data.texts.length > TEXTS_PREVIEW && (
                    <div className="relative w-full sm:w-64">
                      <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                      <Input
                        value={textFilter}
                        onChange={(e) => setTextFilter(e.target.value)}
                        placeholder="Filtrar respostas…"
                        aria-label="Filtrar respostas"
                        className="h-8 pl-9"
                      />
                    </div>
                  )}
                </div>

                {data.texts.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    {data.group.vague
                      ? "Ninguém deste grupo escreveu uma resposta: eles não responderam a pergunta. Veja abaixo quem são e, se houver, o perfil inferido pelo enriquecimento."
                      : "Todos escolheram uma das opções prontas do onboarding."}{" "}
                    {data.group.vague && (
                      <Link href="/enrichment" className="text-foreground underline underline-offset-2">
                        Abrir enriquecimento
                      </Link>
                    )}
                  </p>
                ) : texts.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Nenhuma resposta com esse filtro.</p>
                ) : (
                  <>
                    <ul className="divide-y rounded-lg border">
                      {visibleTexts.map((t) => (
                        <li
                          key={`${t.field}-${t.text}`}
                          className="flex items-baseline justify-between gap-4 px-3 py-2 text-sm"
                        >
                          <span className="min-w-0">
                            {multipleFields && (
                              <span className="text-muted-foreground mr-2 text-xs whitespace-nowrap">
                                {t.fieldLabel}
                              </span>
                            )}
                            <span className={cn(t.field !== "persona" && "italic")}>
                              {t.field === "persona" ? t.text : `“${t.text}”`}
                            </span>
                          </span>
                          <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                            {formatNumber(t.users)} {t.users === 1 ? "usuário" : "usuários"}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {texts.length > TEXTS_PREVIEW && (
                      <Button variant="ghost" size="sm" onClick={() => setShowAllTexts((v) => !v)}>
                        {showAllTexts
                          ? "Mostrar menos"
                          : `Ver todas as ${formatNumber(texts.length)} respostas`}
                      </Button>
                    )}
                  </>
                )}
              </section>

              <section aria-labelledby="group-users" className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 id="group-users" className="text-sm font-semibold">
                    Quem são
                  </h3>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      setPage(1);
                      setSearch(searchInput.trim());
                    }}
                    className="relative w-full sm:w-72"
                  >
                    <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder="Buscar nome, e-mail ou resposta…"
                      aria-label="Buscar usuários do grupo"
                      className="h-8 pl-9"
                    />
                  </form>
                </div>

                <div className={cn("overflow-x-auto transition-opacity", isFetching && "opacity-70")}>
                  <table className="w-full min-w-[720px] text-sm">
                    <thead>
                      <tr className="text-muted-foreground border-b text-left text-xs">
                        <th scope="col" className="py-2 pr-3 font-medium">Usuário</th>
                        <th scope="col" className="px-3 py-2 font-medium">Respostas do onboarding</th>
                        <th scope="col" className="px-3 py-2 font-medium">Perfil inferido</th>
                        <th scope="col" className="px-3 py-2 text-right font-medium">Dias ativos</th>
                        <th scope="col" className="py-2 pl-3 text-right font-medium">Cadastro</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.data.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-muted-foreground py-8 text-center">
                            Nenhum usuário com essa busca.
                          </td>
                        </tr>
                      ) : (
                        data.data.map((u) => (
                          <tr key={u.id} className="border-b align-top last:border-0">
                            <td className="max-w-56 py-2.5 pr-3">
                              <Link
                                href={`/users/${u.id}`}
                                className="block truncate font-medium hover:underline"
                              >
                                {u.name || "—"}
                              </Link>
                              <p className="text-muted-foreground truncate text-xs">{u.email}</p>
                              <p className="text-muted-foreground text-xs">
                                {u.declaredSegmentLabel ?? "Sem segmento"}
                                {!u.onboardingCompleted && " · sem onboarding"}
                              </p>
                            </td>
                            <td className="px-3 py-2.5">
                              <Answers answers={u.answers} />
                            </td>
                            <td className="max-w-64 px-3 py-2.5">
                              {u.inferred ? (
                                <>
                                  <p className="font-medium">
                                    {[u.inferred.segmentLabel, u.inferred.occupation]
                                      .filter(Boolean)
                                      .join(" · ") || "Perfil inferido"}
                                    {u.inferred.confidence != null && (
                                      <span className="text-muted-foreground font-normal">
                                        {" "}
                                        · {Math.round(u.inferred.confidence * 100)}%
                                      </span>
                                    )}
                                  </p>
                                  {u.inferred.summary && (
                                    <p className="text-muted-foreground line-clamp-2 text-xs">
                                      {u.inferred.summary}
                                    </p>
                                  )}
                                </>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums">
                              {formatNumber(u.activeDays)}
                            </td>
                            <td className="text-muted-foreground py-2.5 pl-3 text-right tabular-nums">
                              {formatDate(u.createdAt)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {data.meta.total > data.meta.limit && (
                  <PaginationBar
                    page={data.meta.page}
                    totalPages={data.meta.totalPages}
                    total={data.meta.total}
                    onPageChange={setPage}
                  />
                )}
              </section>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Answers({ answers }: { answers: ProfileGroupDetail["data"][number]["answers"] }) {
  const entries = (Object.keys(ANSWER_LABEL) as AnswerField[]).map(
    (field) => [field, answers[field]] as const,
  );
  if (entries.every(([, a]) => !a)) {
    return <span className="text-muted-foreground">Não respondeu</span>;
  }
  return (
    <dl className="space-y-1">
      {entries.map(([field, a]) => (
        <div key={field} className="flex gap-2">
          <dt className="text-muted-foreground w-20 shrink-0 text-xs leading-5">
            {ANSWER_LABEL[field]}
          </dt>
          <dd className="min-w-0 leading-5">
            {!a ? (
              <span className="text-muted-foreground">—</span>
            ) : a.written ? (
              <span className="italic">
                {a.raw === "OTHER" ? "Marcou “Outro” sem escrever" : `“${a.raw}”`}
              </span>
            ) : (
              a.label ?? a.raw
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
