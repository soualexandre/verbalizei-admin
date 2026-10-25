"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * O estado de erro de todas as telas do admin (25/10/2026): diz o que não
 * carregou, o que provavelmente aconteceu e o que fazer, com a mensagem técnica
 * numa frase própria e o "Tentar de novo". `bare` tira o cartão (para usar
 * dentro de um cartão que já existe).
 */
export function ErrorState({
  title,
  error,
  onRetry,
  retrying = false,
  bare = false,
  className,
}: {
  /** O que não carregou: "Não foi possível carregar a visão geral." */
  title: string;
  error?: unknown;
  onRetry?: () => void;
  retrying?: boolean;
  bare?: boolean;
  className?: string;
}) {
  const detail = error instanceof Error && error.message ? error.message.replace(/\.?$/, ".") : null;
  const body = (
    <div role="alert" className={cn("flex flex-col items-start gap-4 sm:flex-row sm:items-center", bare && className)}>
      <span className="bg-brand-50 text-brand-ink flex size-11 shrink-0 items-center justify-center rounded-full">
        <AlertCircle className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-semibold">{title}</p>
        <p className="text-muted-foreground text-sm">
          Pode ser a conexão ou a API fora do ar. Tente de novo; se continuar, avise o time técnico.
        </p>
        {detail && <p className="text-muted-foreground text-xs">Detalhe: {detail}</p>}
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} disabled={retrying} className="shrink-0">
          <RefreshCw className={retrying ? "size-4 animate-spin" : "size-4"} />
          Tentar de novo
        </Button>
      )}
    </div>
  );
  if (bare) return body;
  return <Card className={cn("px-6 py-6 shadow-none", className)}>{body}</Card>;
}
