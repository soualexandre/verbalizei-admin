"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Funnel,
  Barbell,
  ChatCircleText,
  Fingerprint,
  Gauge,
  MagicWand,
  Megaphone,
  SignOut,
  SquaresFour,
  Users,
  type Icon,
} from "@phosphor-icons/react";
import { cn, initials } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BrandLogo } from "@/components/brand-logo";

const NAV: { href: string; label: string; icon: Icon }[] = [
  { href: "/dashboard", label: "Visão geral", icon: SquaresFour },
  { href: "/activation", label: "Ativação", icon: Funnel },
  { href: "/users", label: "Usuários", icon: Users },
  { href: "/profiles", label: "Perfis", icon: Fingerprint },
  { href: "/feedback-evaluations", label: "Avaliações de feedback", icon: ChatCircleText },
  { href: "/curriculum", label: "Micro-treinos", icon: Barbell },
  { href: "/training-quota", label: "Cota de treinos", icon: Gauge },
  { href: "/enrichment", label: "Enriquecimento", icon: MagicWand },
  { href: "/broadcast", label: "Broadcast", icon: Megaphone },
];

/**
 * Barra lateral no desenho do web (verbalizei_web components/dashboard/Sidebar):
 * a marca no topo, sem divisória; itens de 44 px com ícone vazado em repouso e,
 * no ativo, o ícone cheio em azul sobre a pílula azul clara. A conta fica no pé.
 */
export function AppSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="bg-sidebar text-sidebar-foreground border-sidebar-border sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r md:flex">
      <div className="shrink-0 px-6 pt-3">
        <Link href="/dashboard" className="flex h-14 w-fit items-center" aria-label="Ir para a visão geral">
          <BrandLogo priority />
        </Link>
      </div>

      <nav aria-label="Navegação do admin" className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pt-5 pb-4">
        <ul className="flex flex-col gap-0.5">
          {NAV.map((item) => (
            <li key={item.href}>
              <NavLink
                {...item}
                active={pathname === item.href || pathname.startsWith(item.href + "/")}
              />
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-4">
          <div className="bg-sidebar-border mx-3 mb-3 h-px" aria-hidden />
          <div className="flex items-center gap-3 px-3 py-2">
            <Avatar className="size-8">
              {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
              <AvatarFallback>{initials(user?.name, user?.email)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-semibold">{user?.name || "Admin"}</p>
              <p className="text-muted-foreground truncate text-xs">{user?.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="text-muted-foreground hover:text-foreground flex h-11 w-full items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors hover:bg-black/[0.04]"
          >
            <SignOut className="size-[22px]" aria-hidden />
            Sair
          </button>
        </div>
      </nav>
    </aside>
  );
}

function NavLink({ href, label, icon: Icon, active }: { href: string; label: string; icon: Icon; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] outline-none",
        "transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.98]",
        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2",
        active
          ? "bg-accent text-foreground font-semibold"
          : "text-muted-foreground hover:text-foreground font-medium hover:bg-black/[0.04]",
      )}
    >
      <Icon
        className={cn(
          "size-[22px] shrink-0 transition-colors duration-150",
          active ? "text-primary" : "text-muted-foreground/80 group-hover:text-muted-foreground",
        )}
        weight={active ? "fill" : "regular"}
        aria-hidden
      />
      <span className="truncate">{label}</span>
    </Link>
  );
}
