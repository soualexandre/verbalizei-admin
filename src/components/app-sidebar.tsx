"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Barbell,
  Buildings,
  ChartLineUp,
  List,
  X,
  CaretDown,
  EnvelopeSimple,
  Funnel,
  ChatCircleText,
  CurrencyDollar,
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
import { api } from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BrandLogo } from "@/components/brand-logo";
import { NotificationBell } from "@/components/notification-bell";

interface NavItem {
  href: string;
  label: string;
  icon: Icon;
}

const INQUIRIES_HREF = "/company-inquiries";

/**
 * Pedidos de empresas ainda sem resposta: o selo no menu e um aviso quando
 * chega um novo com o admin aberto (confere a cada minuto).
 */
function useNewInquiries(): number {
  const router = useRouter();
  const { data } = useQuery({
    queryKey: ["company-inquiries", "new-count"],
    queryFn: () => api.get<{ count: number }>("/admin/company-inquiries/new-count"),
    refetchInterval: 60_000,
    refetchIntervalInBackground: true,
  });
  const count = data?.count ?? 0;
  const last = useRef<number | null>(null);
  useEffect(() => {
    if (data === undefined) return;
    if (last.current !== null && count > last.current) {
      const n = count - last.current;
      toast.info(n === 1 ? "Uma empresa pediu uma conversa pelo site." : `${n} empresas pediram uma conversa pelo site.`, {
        action: { label: "Ver", onClick: () => router.push(INQUIRIES_HREF) },
        duration: 15_000,
      });
    }
    last.current = count;
  }, [data, count, router]);
  return count;
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
      { href: "/billing", label: "Custos", icon: CurrencyDollar },
      { href: "/profiles", label: "Perfis", icon: Fingerprint },
      { href: "/feedback-evaluations", label: "Avaliações de feedback", icon: ChatCircleText },
    ],
  },
  {
    key: "pessoas",
    label: "Pessoas",
    items: [
      { href: "/users", label: "Usuários", icon: Users },
      { href: "/organizations", label: "Empresas", icon: Buildings },
      { href: INQUIRIES_HREF, label: "Contatos de empresas", icon: EnvelopeSimple },
      { href: "/company-signals", label: "Sinal de empresas", icon: ChartLineUp },
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
  // Uma vez só (a gaveta do celular repete o menu): o aviso não sai em dobro.
  const newInquiries = useNewInquiries();
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
      <aside className="bg-sidebar text-sidebar-foreground border-sidebar-border sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r md:flex">
        <NavContent newInquiries={newInquiries} bell />
      </aside>

      <header className="bg-card/90 sticky top-0 z-30 flex h-12 items-center justify-between border-b px-4 backdrop-blur md:hidden">
        <Link href="/dashboard" aria-label="Ir para a visão geral">
          <BrandLogo priority />
        </Link>
        <div className="flex items-center gap-1">
        <NotificationBell inquiries={newInquiries} />
        <button
          type="button"
          onClick={() => setDrawer(true)}
          aria-label="Abrir o menu"
          aria-expanded={drawer}
          className="hover:bg-muted flex size-9 items-center justify-center rounded-lg"
        >
          <List className="size-5" aria-hidden />
        </button>
        </div>
      </header>
      {drawer && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Fechar o menu" onClick={() => setDrawer(false)} className="absolute inset-0 bg-black/30" />
          <div className="bg-sidebar animate-in slide-in-from-left absolute inset-y-0 left-0 flex w-64 max-w-[85vw] flex-col shadow-xl duration-200">
            <button
              type="button"
              onClick={() => setDrawer(false)}
              aria-label="Fechar o menu"
              className="hover:bg-card absolute top-4 right-3 flex size-10 items-center justify-center rounded-xl"
            >
              <X className="size-5" aria-hidden />
            </button>
            <NavContent newInquiries={newInquiries} />
          </div>
        </div>
      )}
    </>
  );
}

function NavContent({ newInquiries, bell = false }: { newInquiries: number; bell?: boolean }) {
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
      <div className="flex shrink-0 items-center justify-between gap-2 pr-2.5 pl-4 pt-3">
        <Link href="/dashboard" className="flex h-10 w-fit items-center" aria-label="Ir para a visão geral">
          <BrandLogo />
        </Link>
        {bell && <NotificationBell inquiries={newInquiries} />}
      </div>

      <nav aria-label="Navegação do admin" className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2.5 pt-3 pb-3">
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
                    "text-muted-foreground/80 flex h-6 w-full items-center justify-between rounded-md px-2 text-[10.5px] font-semibold uppercase tracking-[0.06em] outline-none",
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
                  <ul id={listId} className="mt-0.5 flex flex-col gap-px">
                    {group.items.map((item) => (
                      <li key={item.href}>
                        <NavLink {...item} active={isActive(pathname, item.href)} count={item.href === INQUIRIES_HREF ? newInquiries : 0} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>

        <div className="mt-auto pt-4">
          <div className="flex items-center gap-2.5 border-t px-2 pt-3 pb-1">
            <Avatar className="size-7">
              {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
              <AvatarFallback className="bg-brand-50 text-brand-ink text-[11px] font-semibold">{initials(user?.name, user?.email)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-[13px] font-medium">{user?.name || "Admin"}</p>
              <p className="text-muted-foreground truncate text-[11px]">{user?.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="text-muted-foreground hover:text-foreground hover:bg-muted mt-1 flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-[13px] font-medium transition-colors"
          >
            <SignOut className="size-[18px]" aria-hidden />
            Sair
          </button>
        </div>
      </nav>
    </>
  );
}

function NavLink({ href, label, icon: Icon, active, count = 0 }: { href: string; label: string; icon: Icon; active: boolean; count?: number }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] outline-none",
        "transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.98]",
        "focus-visible:ring-ring focus-visible:ring-2",
        active
          ? "bg-brand-50 text-brand-ink font-semibold"
          : "text-muted-foreground hover:text-foreground hover:bg-muted font-medium",
      )}
    >
      <Icon
        className={cn(
          "size-[18px] shrink-0 transition-colors duration-150",
          active ? "text-brand" : "text-muted-foreground/80 group-hover:text-muted-foreground",
        )}
        weight={active ? "fill" : "regular"}
        aria-hidden
      />
      <span className="truncate">{label}</span>
      {count > 0 && (
        <span className="bg-brand text-white ml-auto rounded-full px-1.5 py-px text-[10px] font-semibold tabular-nums">
          {count}
          <span className="sr-only"> {count === 1 ? "novo" : "novos"}</span>
        </span>
      )}
    </Link>
  );
}
