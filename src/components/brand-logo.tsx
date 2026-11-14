import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * A marca do admin: o ícone de fundo verde-lima (o mesmo da aba do navegador,
 * diferente do azul do web), o nome em Raleway e a etiqueta "Admin".
 */
export function BrandLogo({ className, priority }: { className?: string; priority?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Image src="/icone_admin.png" alt="" width={28} height={28} priority={priority} className="size-7" />
      <span className="font-display text-[15px] font-bold tracking-tight">Verbalizei</span>
      <span className="bg-muted text-muted-foreground rounded px-1.5 py-px text-[10px] font-semibold">Admin</span>
    </span>
  );
}
