import { desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { aiUsage, analyticsEvents, auditLogs, organizations, products, subscriptions, systemLogs, users } from "@/db/schema";
import { redirect } from "next/navigation";
import { Badge, SectionTitle, Stat } from "@/components/ui";
import { getSession, isPlatformAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isPlatformAdmin(session.user.role)) redirect("/dashboard");
  const { user } = session;

  const [userCount, orgCount, productCount, eventCount, creditSum, recentUsers, recentLogs, recentAudit, subs] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(users),
    db.select({ n: sql<number>`count(*)::int` }).from(organizations),
    db.select({ n: sql<number>`count(*)::int` }).from(products),
    db.select({ n: sql<number>`count(*)::int` }).from(analyticsEvents),
    db.select({ n: sql<number>`coalesce(sum(${aiUsage.credits}),0)::int` }).from(aiUsage),
    db.select({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt }).from(users).orderBy(desc(users.createdAt)).limit(10),
    db.select().from(systemLogs).orderBy(desc(systemLogs.createdAt)).limit(12),
    db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(12),
    db
      .select({ planCode: subscriptions.planCode, n: sql<number>`count(*)::int` })
      .from(subscriptions)
      .groupBy(subscriptions.planCode),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <SectionTitle title="Admin" subtitle={`Painel da plataforma · acesso ${user.role}`} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Usuários" value={String(userCount[0]?.n ?? 0)} />
        <Stat label="Organizações" value={String(orgCount[0]?.n ?? 0)} />
        <Stat label="Produtos" value={String(productCount[0]?.n ?? 0)} tone="brand" />
        <Stat label="Eventos" value={String(eventCount[0]?.n ?? 0)} />
        <Stat label="Créditos de IA consumidos" value={Number(creditSum[0]?.n ?? 0).toLocaleString("pt-BR")} tone="ai" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="surface p-5">
          <SectionTitle title="Usuários recentes" subtitle="RBAC: USER · ADMIN · SUPER_ADMIN" />
          <ul className="divide-y divide-[#171b24] text-xs">
            {recentUsers.map((u) => (
              <li key={u.id} className="flex items-center justify-between py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-white">{u.name}</p>
                  <p className="truncate text-[11px] text-[#6b7386]">{u.email}</p>
                </div>
                <Badge tone={u.role === "USER" ? "neutral" : "brand"}>{u.role}</Badge>
              </li>
            ))}
          </ul>
        </div>

        <div className="surface p-5">
          <SectionTitle title="Assinaturas por plano" />
          {subs.length === 0 ? (
            <p className="text-xs text-[#6b7386]">Nenhuma assinatura registrada.</p>
          ) : (
            <ul className="space-y-2 text-xs">
              {subs.map((s) => (
                <li key={s.planCode} className="flex items-center justify-between rounded-lg border border-[#1f2531] bg-[#0d1017] px-3 py-2">
                  <span className="text-[#c5cbd7]">{s.planCode}</span>
                  <span className="text-[#6b7386]">{s.n}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-[11px] leading-relaxed text-[#5c6577]">
            Pagamentos: gateway não configurado. Nenhuma transação real é processada nesta instalação.
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="surface p-5">
          <SectionTitle title="Logs do sistema" subtitle="Erros e avisos recentes" />
          {recentLogs.length === 0 ? (
            <p className="text-xs text-[#6b7386]">Nenhum log registrado.</p>
          ) : (
            <ul className="space-y-2 text-[11px]">
              {recentLogs.map((l) => (
                <li key={l.id} className="rounded-lg border border-[#1f2531] bg-[#0d1017] px-3 py-2">
                  <div className="flex items-center justify-between">
                    <Badge tone={l.level === "error" ? "danger" : l.level === "warn" ? "warning" : "neutral"}>{l.level}</Badge>
                    <span className="text-[#5c6577]">{l.createdAt.toLocaleString("pt-BR")}</span>
                  </div>
                  <p className="mt-1.5 text-[#c5cbd7]">[{l.scope}] {l.message}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="surface p-5">
          <SectionTitle title="Auditoria" subtitle="Ações sensíveis registradas" />
          {recentAudit.length === 0 ? (
            <p className="text-xs text-[#6b7386]">Nenhuma ação auditada ainda.</p>
          ) : (
            <ul className="divide-y divide-[#171b24] text-xs">
              {recentAudit.map((a) => (
                <li key={a.id} className="flex items-center justify-between py-2">
                  <span className="text-[#c5cbd7]">{a.action}</span>
                  <span className="text-[11px] text-[#5c6577]">{a.createdAt.toLocaleString("pt-BR")}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
