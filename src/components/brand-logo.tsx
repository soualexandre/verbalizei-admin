import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * A marca do admin: o ícone de fundo verde-lima (o mesmo da aba do navegador,
 * diferente do azul do web), o nome em Raleway e a etiqueta "Admin".
 */
export function BrandLogo({ className, priority }: { className?: string; priority?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Image src="/icone_admin.png" alt="" width={36} height={36} priority={priority} className="size-9" />
      <span className="font-display text-[19px] font-extrabold tracking-tight">Verbalizei</span>
      <span className="bg-green-100 text-primary rounded-full px-2 py-0.5 text-[11px] font-bold">Admin</span>
    </span>
  );
}
