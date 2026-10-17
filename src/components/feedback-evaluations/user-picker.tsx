"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search, X } from "lucide-react";
import { api } from "@/lib/api";
import type { AdminUser, Paginated } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ReportPerson } from "./evaluation-dialog";

/** Busca uma pessoa por nome ou e-mail (GET /admin/users?search=). */
export function UserPicker({
  id,
  value,
  onChange,
}: {
  id?: string;
  value: ReportPerson | null;
  onChange: (person: ReportPerson | null) => void;
}) {
  const [input, setInput] = useState("");
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setTerm(input.trim()), 300);
    return () => clearTimeout(t);
  }, [input]);

  const { data, isFetching } = useQuery({
    queryKey: ["users", "picker", term],
    queryFn: () =>
      api.get<Paginated<AdminUser>>(`/admin/users?${new URLSearchParams({ page: "1", limit: "8", search: term })}`),
    enabled: term.length >= 2,
    staleTime: 30_000,
  });

  if (value) {
    return (
      <div className="flex h-9 items-center justify-between gap-2 rounded-md border px-3 text-sm">
        <span className="min-w-0 truncate">
          {value.name || value.email ? (
            <>
              <span className="font-medium">{value.name ?? value.email}</span>
              {value.name && value.email && <span className="text-muted-foreground"> · {value.email}</span>}
            </>
          ) : (
            <span className="font-mono text-xs">{value.id}</span>
          )}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-6 shrink-0"
          onClick={() => onChange(null)}
          aria-label="Limpar pessoa"
        >
          <X className="size-3.5" />
        </Button>
      </div>
    );
  }

  const items = term.length >= 2 ? (data?.data ?? []) : [];
  return (
    <div className="relative">
      <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
      <Input
        id={id}
        placeholder="Todas as pessoas — busque por nome ou e-mail"
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="pl-9"
        autoComplete="off"
      />
      {isFetching && (
        <Loader2 className="text-muted-foreground absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin" />
      )}
      {open && term.length >= 2 && !isFetching && (
        <ul className="bg-popover text-popover-foreground absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-md border p-1 shadow-md">
          {items.length === 0 ? (
            <li className="text-muted-foreground px-2 py-1.5 text-sm">Ninguém encontrado.</li>
          ) : (
            items.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  className="hover:bg-accent w-full rounded-sm px-2 py-1.5 text-left text-sm"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange({ id: u.id, name: u.name, email: u.email });
                    setInput("");
                    setOpen(false);
                  }}
                >
                  <span className="font-medium">{u.name ?? u.email}</span>
                  {u.name && <span className="text-muted-foreground block text-xs">{u.email}</span>}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
