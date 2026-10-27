"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Barbell,
  List,
  X,
  CaretDown,
  Funnel,
  ChatCircleText,
  Fingerprint,
  Flask,
  Gauge,
  MagicWand,
  Megaphone,
  SignOut,
  SquaresFour,
  Users,
  WhatsappLogo,
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
      { href: "/experiments", label: "Experimentos", icon: Flask },
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
      { href: "/retention", label: "Retorno manual", icon: WhatsappLogo },
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
 * Barra lateral no tom do fundo, sem cartão: a marca no topo, os grupos (cada
 * um abre e fecha; o da tela atual fica sempre aberto) e a conta no pé. O
 * ativo é uma pílula branca com o ícone cheio em verde. No celular, a mesma
 * navegação numa gaveta aberta pela barra do topo.
 */
export function AppSidebar() {
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);
  // Trocou de tela pela gaveta: fecha.
  useEffect(() => setDrawer(false), [pathname]);
  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawer]);

  return (
    <>
      <aside className="bg-sidebar text-sidebar-foreground border-sidebar-border sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r md:flex">
        <NavContent />
      </aside>

      <header className="bg-background/90 sticky top-0 z-30 flex h-14 items-center justify-between border-b px-4 backdrop-blur md:hidden">
        <Link href="/dashboard" aria-label="Ir para a visão geral">
          <BrandLogo priority />
        </Link>
        <button
          type="button"
          onClick={() => setDrawer(true)}
          aria-label="Abrir o menu"
          aria-expanded={drawer}
          className="hover:bg-card flex size-10 items-center justify-center rounded-xl"
        >
          <List className="size-6" aria-hidden />
        </button>
      </header>
      {drawer && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Fechar o menu" onClick={() => setDrawer(false)} className="absolute inset-0 bg-black/30" />
          <div className="bg-sidebar animate-in slide-in-from-left absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col shadow-xl duration-200">
            <button
              type="button"
              onClick={() => setDrawer(false)}
              aria-label="Fechar o menu"
              className="hover:bg-card absolute top-4 right-3 flex size-10 items-center justify-center rounded-xl"
            >
              <X className="size-5" aria-hidden />
            </button>
            <NavContent />
          </div>
        </div>
      )}
    </>
  );
}

function NavContent() {
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
    <>
      <div className="shrink-0 px-5 pt-4">
        <Link href="/dashboard" className="flex h-14 w-fit items-center" aria-label="Ir para a visão geral">
          <BrandLogo />
        </Link>
      </div>

      <nav aria-label="Navegação do admin" className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pt-4 pb-4">
        <div className="flex flex-col gap-5">
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
                    {!open && <span className="bg-card rounded-full px-1.5 text-[10px] tabular-nums">{group.items.length}</span>}
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
                  <ul id={listId} className="mt-1 flex flex-col gap-1">
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
          <div className="bg-card flex items-center gap-3 rounded-2xl border px-3 py-2.5">
            <Avatar className="size-9">
              {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
              <AvatarFallback className="bg-green-100 text-primary font-semibold">{initials(user?.name, user?.email)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-semibold">{user?.name || "Admin"}</p>
              <p className="text-muted-foreground truncate text-xs">{user?.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="text-muted-foreground hover:text-foreground hover:bg-card/70 mt-1 flex h-11 w-full items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors"
          >
            <SignOut className="size-[22px]" aria-hidden />
            Sair
          </button>
        </div>
      </nav>
    </>
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
          ? "bg-card text-foreground font-semibold shadow-[0_1px_2px_rgb(23_33_15/0.06),0_4px_12px_-6px_rgb(23_33_15/0.12)]"
          : "text-muted-foreground hover:text-foreground hover:bg-card/70 font-medium",
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
