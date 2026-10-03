import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { products, projects } from "@/db/schema";
import { Badge, EmptyState, LinkButton, SectionTitle, Stat } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { dailySeries, eventTotals, rangeStart, recentActivity, revenueTotals } from "@/lib/analytics";
import { buildInsights } from "@/lib/ai/engine";
import { formatCurrency } from "@/lib/slug";
import { DashboardChart } from "./chart";

export const dynamic = "force-dynamic";

const EVENT_LABEL: Record<string, string> = {
  product_created: "Produto criado",
  product_generated: "Geração por IA",
  product_exported: "Produto exportado",
  product_published: "Produto publicado",
  page_view: "Visualização de página",
  cta_clicked: "Clique em CTA",
  checkout_started: "Checkout iniciado",
  purchase_completed: "Venda concluída",
  lead_created: "Lead capturado",
  campaign_created: "Campanha criada",
  content_generated: "Conteúdo gerado",
  subscription_started: "Assinatura iniciada",
  subscription_cancelled: "Assinatura cancelada",
};

export default async function DashboardPage() {
  const { organization, user } = await requireSession();
  const since = rangeStart("7d");

  const [totals, revenue, activity, series, productRows, projectCount] = await Promise.all([
    eventTotals(organization.id, since),
    revenueTotals(organization.id, since),
    recentActivity(organization.id, 10),
    dailySeries(organization.id, since, "page_view"),
    db.select().from(products).where(eq(products.organizationId, organization.id)).orderBy(desc(products.updatedAt)).limit(5),
    db.select({ n: sql<number>`count(*)::int` }).from(projects).where(eq(projects.organizationId, organization.id)),
  ]);

  const allProducts = await db
    .select({
      total: sql<number>`count(*)::int`,
      published: sql<number>`count(*) filter (where ${products.status} = 'PUBLISHED')::int`,
      producing: sql<number>`count(*) filter (where ${products.status} = 'IN_PRODUCTION')::int`,
    })
    .from(products)
    .where(eq(products.organizationId, organization.id));

  const stats = allProducts[0] ?? { total: 0, published: 0, producing: 0 };
  const views = totals.page_view ?? 0;
  const clicks = totals.cta_clicked ?? 0;
  const conversion = views > 0 ? ((totals.purchase_completed ?? 0) / views) * 100 : 0;

  const insights = buildInsights({
    rangeLabel: "7 dias",
    pageViews: views,
    ctaClicks: clicks,
    checkouts: totals.checkout_started ?? 0,
    purchases: totals.purchase_completed ?? 0,
    revenueCents: revenue.revenueCents,
    products: Number(stats.total),
    published: Number(stats.published),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <p className="text-xs text-[#6b7386]">Olá, {user.name.split(" ")[0]}</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-white">Visão geral</h1>
        <p className="mt-1 text-xs text-[#a5adbd]">Dados reais registrados na sua organização nos últimos 7 dias.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Produtos" value={String(stats.total)} sub={`${projectCount[0]?.n ?? 0} projeto(s)`} />
        <Stat label="Publicados" value={String(stats.published)} sub={`${stats.producing} em produção`} tone="brand" />
        <Stat label="Visualizações" value={views.toLocaleString("pt-BR")} sub={`${clicks} clique(s) em CTA`} />
        <Stat label="Faturamento" value={formatCurrency(revenue.revenueCents)} sub={`${revenue.orders} venda(s) · conv. ${conversion.toFixed(1)}%`} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="surface p-5">
            <SectionTitle title="Visualizações por dia" subtitle="Eventos page_view registrados nas páginas publicadas" />
            <DashboardChart data={series} />
          </div>
        </div>

        <div className="surface p-5">
          <div className="mb-3 flex items-center gap-2">
            <Badge tone="ai">Insights de IA</Badge>
          </div>
          <ul className="space-y-3">
            {insights.map((i) => (
              <li key={i} className="text-xs leading-relaxed text-[#c5cbd7]">
                · {i}
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-[#171b24] pt-3 text-[10px] leading-relaxed text-[#5c6577]">
            Análises calculadas exclusivamente sobre os eventos registrados na sua conta.
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <SectionTitle
            title="Seus produtos"
            subtitle="Atualizados recentemente"
            action={<Link href="/products" className="text-xs text-[#7396ff] hover:text-white">Ver todos →</Link>}
          />
          {productRows.length === 0 ? (
            <EmptyState
              title="Nenhum produto criado ainda."
              description="Comece com uma ideia. A INFORA ajudará você a transformá-la em produto."
              action={<LinkButton href="/products/new">+ Criar primeiro produto</LinkButton>}
            />
          ) : (
            <ul className="space-y-2">
              {productRows.map((p) => (
                <li key={p.id}>
                  <Link href={`/products/${p.id}`} className="surface flex items-center justify-between p-4 transition-colors hover:border-[#4f7cff]/40">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-white">{p.title}</p>
                      <p className="mt-0.5 text-[11px] text-[#6b7386]">{p.type} · atualizado {p.updatedAt.toLocaleDateString("pt-BR")}</p>
                    </div>
                    <Badge tone={p.status === "PUBLISHED" ? "success" : p.status === "IN_PRODUCTION" ? "warning" : "neutral"}>
                      {p.status}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <SectionTitle title="Atividade recente" subtitle="Eventos da sua organização" />
          {activity.length === 0 ? (
            <EmptyState title="Sem atividade ainda." description="As ações realizadas no workspace aparecerão aqui." icon="◔" />
          ) : (
            <ul className="surface divide-y divide-[#171b24] p-0">
              {activity.map((a) => (
                <li key={a.id} className="flex items-center justify-between px-4 py-3">
                  <span className="text-xs text-[#c5cbd7]">{EVENT_LABEL[a.type] ?? a.type}</span>
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
