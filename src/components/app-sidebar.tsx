"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Barbell,
  CaretDown,
  Funnel,
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

interface NavItem {
  href: string;
  label: string;
  icon: Icon;
}

/**
 * O menu em três grupos, do mais usado para o menos (25/10/2026, pedido do
 * usuário: menos itens à vista e os mais relevantes primeiro). Métricas
 * primeiro, porque é o que se abre todo dia e o que se apresenta.
 */
const GROUPS: { key: string; label: string; items: NavItem[] }[] = [
  {
    key: "metricas",
    label: "Métricas",
    items: [
      { href: "/dashboard", label: "Visão geral", icon: SquaresFour },
      { href: "/activation", label: "Ativação", icon: Funnel },
      { href: "/profiles", label: "Perfis", icon: Fingerprint },
      { href: "/feedback-evaluations", label: "Avaliações de feedback", icon: ChatCircleText },
    ],
  },
  {
    key: "pessoas",
    label: "Pessoas",
    items: [
      { href: "/users", label: "Usuários", icon: Users },
      { href: "/training-quota", label: "Cota de treinos", icon: Gauge },
      { href: "/enrichment", label: "Enriquecimento", icon: MagicWand },
    ],
  },
  {
    key: "conteudo",
    label: "Conteúdo",
    items: [
      { href: "/curriculum", label: "Micro-treinos", icon: Barbell },
      { href: "/broadcast", label: "Broadcast", icon: Megaphone },
    ],
  },
];

const COLLAPSED_KEY = "vb_admin_nav_collapsed";

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(href + "/");

/**
 * Barra lateral: a marca no topo, os grupos (cada um abre e fecha; o da tela
 * atual fica sempre aberto) e a conta no pé. No ativo, o ícone cheio em azul
 * sobre a pílula azul clara, como no web.
 */
export function AppSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  // Grupos fechados à mão (guardado no navegador; falhar ao ler = tudo aberto).
  const [collapsed, setCollapsed] = useState<string[]>([]);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(COLLAPSED_KEY);
      if (raw) setCollapsed(JSON.parse(raw));
    } catch {
      /* navegação privada: tudo aberto */
    }
  }, []);
  const toggle = (key: string) => {
    setCollapsed((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      try {
        window.localStorage.setItem(COLLAPSED_KEY, JSON.stringify(next));
      } catch {
        /* idem */
      }
      return next;
    });
  };

  return (
    <aside className="bg-sidebar text-sidebar-foreground border-sidebar-border sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r md:flex">
      <div className="shrink-0 px-6 pt-3">
        <Link href="/dashboard" className="flex h-14 w-fit items-center" aria-label="Ir para a visão geral">
          <BrandLogo priority />
        </Link>
      </div>

      <nav aria-label="Navegação do admin" className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pt-4 pb-4">
        <div className="flex flex-col gap-4">
          {GROUPS.map((group) => {
            const hasActive = group.items.some((i) => isActive(pathname, i.href));
            const open = hasActive || !collapsed.includes(group.key);
            const listId = `nav-${group.key}`;
            return (
              <section key={group.key}>
                <button
                  type="button"
                  onClick={() => !hasActive && toggle(group.key)}
                  aria-expanded={open}
                  aria-controls={listId}
                  aria-disabled={hasActive}
                  title={hasActive ? "O grupo da tela atual fica aberto" : undefined}
                  className={cn(
                    "text-muted-foreground flex h-8 w-full items-center justify-between rounded-lg px-3 text-[11px] font-semibold uppercase tracking-[0.08em] outline-none",
                    "focus-visible:ring-ring focus-visible:ring-2",
                    !hasActive && "hover:text-foreground cursor-pointer",
                  )}
                >
                  <span className="flex items-center gap-2">
                    {group.label}
                    {!open && <span className="bg-muted rounded-full px-1.5 text-[10px] tabular-nums">{group.items.length}</span>}
                  </span>
                  {!hasActive && (
                    <CaretDown
                      weight="bold"
                      className={cn("size-3.5 transition-transform duration-200", !open && "-rotate-90")}
                      aria-hidden
                    />
                  )}
                </button>
                {open && (
                  <ul id={listId} className="mt-1 flex flex-col gap-0.5">
                    {group.items.map((item) => (
                      <li key={item.href}>
                        <NavLink {...item} active={isActive(pathname, item.href)} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>

        <div className="mt-auto pt-4">
          <div className="bg-sidebar-border mx-3 mb-3 h-px" aria-hidden />
          <div className="flex items-center gap-3 px-3 py-2">
            <Avatar className="size-8">
              {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
              <AvatarFallback className="bg-brand-50 text-brand-ink font-semibold">{initials(user?.name, user?.email)}</AvatarFallback>
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
