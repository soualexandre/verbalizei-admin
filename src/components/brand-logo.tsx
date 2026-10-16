import Image from "next/image";
import { cn } from "@/lib/utils";

/** A marca Verbalizei (a mesma do web, public/logo.png) com a etiqueta "Admin". */
export function BrandLogo({ className, priority }: { className?: string; priority?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Image src="/logo.png" alt="Verbalizei" width={140} height={36} priority={priority} className="h-7 w-auto" />
      <span className="bg-accent text-accent-foreground rounded-md px-1.5 py-0.5 text-[11px] font-semibold">
        Admin
      </span>
    </span>
  );
}
