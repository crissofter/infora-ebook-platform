"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Logo } from "@/components/brand";
import { Badge, cx } from "@/components/ui";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "◆" },
  { href: "/projects", label: "Projetos", icon: "▤" },
  { href: "/products", label: "Produtos", icon: "◇" },
  { href: "/marketing", label: "Marketing", icon: "◈" },
  { href: "/analytics", label: "Analytics", icon: "▨" },
  { href: "/billing", label: "Plano e consumo", icon: "▣" },
  { href: "/settings", label: "Configurações", icon: "⚙" },
];

export function AppShell({
  children,
  user,
  organization,
  credits,
  isAdmin,
  aiConfigured,
  notifications,
}: {
  children: ReactNode;
  user: { name: string; email: string };
  organization: { name: string; planCode: string };
  credits: { used: number; included: number };
  isAdmin: boolean;
  aiConfigured: boolean;
  notifications: { id: string; title: string; body: string | null; level: string; createdAt: string }[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [bell, setBell] = useState(false);
  const pct = credits.included > 0 ? Math.min(100, (credits.used / credits.included) * 100) : 0;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const nav = isAdmin ? [...NAV, { href: "/admin", label: "Admin", icon: "⌘" }] : NAV;

  return (
    <div className="flex min-h-screen bg-[#050609]">
      <aside
        className={cx(
          "fixed inset-y-0 left-0 z-40 w-64 shrink-0 border-r border-[#171b24] bg-[#0b0d12] transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center border-b border-[#171b24] px-5">
          <Link href="/dashboard" onClick={() => setOpen(false)}>
            <Logo />
          </Link>
        </div>

        <nav className="space-y-0.5 p-3">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cx(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-xs transition-colors",
                  active ? "bg-[#171b24] text-white" : "text-[#8a93a6] hover:bg-white/5 hover:text-white",
                )}
              >
                <span className={cx("text-[11px]", active ? "text-[#4f7cff]" : "text-[#4a5262]")}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mx-3 mt-3 rounded-xl border border-[#232936] bg-[#0d1017] p-3">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-[#6b7386]">
            <span>Créditos de IA</span>
            <Badge tone="brand">{organization.planCode}</Badge>
          </div>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[#1f2531]">
            <div className="h-full rounded-full bg-[#8b5cf6]" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-2 text-[11px] text-[#a5adbd]">
            {credits.used.toLocaleString("pt-BR")} / {credits.included.toLocaleString("pt-BR")}
          </p>
          <Link href="/billing" className="mt-2 inline-block text-[11px] text-[#7396ff] hover:text-white">
            Ver plano →
          </Link>
        </div>

        {!aiConfigured ? (
          <div className="mx-3 mt-3 rounded-xl border border-[#8b5cf6]/25 bg-[#8b5cf6]/8 p-3 text-[10px] leading-relaxed text-[#c4b5fd]">
            Provedor de IA não configurado. As gerações usam o motor local de composição da INFORA.
          </div>
        ) : null}

        <div className="absolute bottom-0 w-full border-t border-[#171b24] p-3">
          <p className="truncate px-2 text-xs text-white">{user.name}</p>
          <p className="truncate px-2 text-[11px] text-[#6b7386]">{user.email}</p>
          <button onClick={logout} className="mt-2 w-full rounded-lg px-2 py-1.5 text-left text-[11px] text-[#8a93a6] hover:bg-white/5 hover:text-white">
            Sair
          </button>
        </div>
      </aside>

      {open ? <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setOpen(false)} /> : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[#171b24] bg-[#050609]/85 px-5 backdrop-blur">
          <div className="flex items-center gap-3">
            <button className="rounded-lg border border-[#232936] px-2 py-1 text-xs text-[#a5adbd] lg:hidden" onClick={() => setOpen(true)}>
              ☰
            </button>
            <span className="text-xs text-[#6b7386]">{organization.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setBell((v) => !v)}
                className="relative rounded-lg border border-[#232936] px-2.5 py-1.5 text-xs text-[#a5adbd] hover:text-white"
              >
                ◔
                {notifications.length > 0 ? (
                  <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[#4f7cff]" />
                ) : null}
              </button>
              {bell ? (
                <div className="surface absolute right-0 top-11 z-30 w-80 p-3">
                  <p className="mb-2 text-[10px] uppercase tracking-wider text-[#6b7386]">Notificações</p>
                  {notifications.length === 0 ? (
                    <p className="py-4 text-center text-xs text-[#6b7386]">Nenhuma notificação por enquanto.</p>
                  ) : (
                    <ul className="space-y-2">
                      {notifications.map((n) => (
                        <li key={n.id} className="rounded-lg border border-[#1f2531] bg-[#0d1017] p-2.5">
                          <p className="text-xs text-white">{n.title}</p>
                          {n.body ? <p className="mt-0.5 text-[11px] text-[#8a93a6]">{n.body}</p> : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </div>
            <Link
              href="/products/new"
              className="rounded-[10px] bg-[#4f7cff] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#3f66e0]"
            >
              + Novo produto
            </Link>
          </div>
        </header>
        <main className="min-w-0 flex-1 px-5 py-7">{children}</main>
      </div>
    </div>
  );
}
