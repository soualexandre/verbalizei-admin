"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { Info } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

/**
 * A explicação que não precisa ficar na tela (14/11/2026, admin compacto):
 * um "i" ao lado do título abre o texto ao passar o mouse ou focar com o
 * teclado. O texto continua no leitor de tela.
 */
export function InfoTip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <TooltipPrimitive.Provider delayDuration={150}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          <button
            type="button"
            aria-label="Sobre esta seção"
            className={cn(
              "text-muted-foreground/70 hover:text-foreground focus-visible:ring-ring/50 inline-flex size-5 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-2",
              className,
            )}
          >
            <Info className="size-4" aria-hidden />
          </button>
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side="top"
            align="start"
            sideOffset={6}
            className="bg-foreground text-background animate-in fade-in-0 zoom-in-95 z-50 max-w-72 rounded-md px-2.5 py-1.5 text-xs leading-snug shadow-md"
          >
            {children}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
