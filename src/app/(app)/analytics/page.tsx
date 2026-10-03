import Link from "next/link";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { analyticsEvents, products } from "@/db/schema";
import { Badge, SectionTitle, Stat } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { dailySeries, eventTotals, rangeStart, revenueTotals } from "@/lib/analytics";
import { buildInsights } from "@/lib/ai/engine";
import { formatCurrency } from "@/lib/slug";
import { DashboardChart } from "../dashboard/chart";

export const dynamic = "force-dynamic";

const RANGES = [
  { id: "today", label: "Hoje" },
  { id: "7d", label: "7 dias" },
  { id: "30d", label: "30 dias" },
  { id: "90d", label: "90 dias" },
];

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range = "30d" } = await searchParams;
  const { organization } = await requireSession();
  const since = rangeStart(range);
  const label = RANGES.find((r) => r.id === range)?.label ?? "30 dias";

  const [totals, revenue, views, clicks, byProduct, bySource, productCount] = await Promise.all([
    eventTotals(organization.id, since),
    revenueTotals(organization.id, since),
    dailySeries(organization.id, since, "page_view"),
    dailySeries(organization.id, since, "cta_clicked"),
    db
      .select({
        title: products.title,
        id: products.id,
        views: sql<number>`count(*) filter (where ${analyticsEvents.type} = 'page_view')::int`,
        clicks: sql<number>`count(*) filter (where ${analyticsEvents.type} = 'cta_clicked')::int`,
        checkouts: sql<number>`count(*) filter (where ${analyticsEvents.type} = 'checkout_started')::int`,
        purchases: sql<number>`count(*) filter (where ${analyticsEvents.type} = 'purchase_completed')::int`,
      })
      .from(analyticsEvents)
      .innerJoin(products, eq(products.id, analyticsEvents.productId))
      .where(and(eq(analyticsEvents.organizationId, organization.id), gte(analyticsEvents.createdAt, since)))
      .groupBy(products.id, products.title)
      .orderBy(desc(sql`count(*)`))
      .limit(10),
    db
      .select({ source: analyticsEvents.source, n: sql<number>`count(*)::int` })
      .from(analyticsEvents)
      .where(and(eq(analyticsEvents.organizationId, organization.id), gte(analyticsEvents.createdAt, since)))
      .groupBy(analyticsEvents.source)
      .orderBy(desc(sql`count(*)`))
      .limit(8),
    db.select({ n: sql<number>`count(*)::int` }).from(products).where(eq(products.organizationId, organization.id)),
  ]);

  const pageViews = totals.page_view ?? 0;
  const ctaClicks = totals.cta_clicked ?? 0;
  const purchases = totals.purchase_completed ?? 0;
  const conversion = pageViews > 0 ? (purchases / pageViews) * 100 : 0;
  const ticket = purchases > 0 ? revenue.revenueCents / purchases : 0;

  const insights = buildInsights({
    rangeLabel: label.toLowerCase(),
    pageViews,
    ctaClicks,
    checkouts: totals.checkout_started ?? 0,
    purchases,
    revenueCents: revenue.revenueCents,
    products: Number(productCount[0]?.n ?? 0),
    published: 0,
  });

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <SectionTitle
        title="Analytics"
        subtitle="Eventos reais registrados na sua organização"
        action={
          <div className="flex gap-1 rounded-xl border border-[#232936] bg-[#0d1017] p-1">
            {RANGES.map((r) => (
              <Link
                key={r.id}
                href={`/analytics?range=${r.id}`}
                className={`rounded-lg px-3 py-1.5 text-xs ${range === r.id ? "bg-[#1f2531] text-white" : "text-[#8a93a6] hover:text-white"}`}
              >
                {r.label}
              </Link>
            ))}
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Visualizações" value={pageViews.toLocaleString("pt-BR")} />
        <Stat label="Cliques em CTA" value={ctaClicks.toLocaleString("pt-BR")} tone="brand" />
        <Stat label="Checkouts" value={String(totals.checkout_started ?? 0)} />
        <Stat label="Conversão" value={`${conversion.toFixed(1)}%`} />
        <Stat label="Faturamento" value={formatCurrency(revenue.revenueCents)} sub={`ticket médio ${formatCurrency(ticket)}`} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="surface p-5">
          <SectionTitle title="Visualizações" subtitle={`page_view · ${label}`} />
          <DashboardChart data={views} />
        </div>
        <div className="surface p-5">
          <SectionTitle title="Cliques em CTA" subtitle={`cta_clicked · ${label}`} />
          <DashboardChart data={clicks} />
        </div>
      </div>

      <div className="surface p-5">
        <div className="mb-3 flex items-center gap-2">
          <Badge tone="ai">AI Analytics</Badge>
        </div>
        <ul className="space-y-2.5">
          {insights.map((i) => (
            <li key={i} className="text-xs leading-relaxed text-[#c5cbd7]">· {i}</li>
          ))}
        </ul>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="surface overflow-x-auto p-0">
          <div className="p-5 pb-3">
            <SectionTitle title="Por produto" subtitle="Top 10 no período" />
          </div>
          {byProduct.length === 0 ? (
            <p className="px-5 pb-6 text-xs text-[#6b7386]">Nenhum evento por produto no período.</p>
          ) : (
            <table className="w-full min-w-[520px] text-left text-xs">
              <thead className="border-y border-[#171b24] text-[10px] uppercase tracking-wider text-[#5c6577]">
                <tr>
                  <th className="px-5 py-2.5 font-medium">Produto</th>
                  <th className="px-3 py-2.5 font-medium">Views</th>
                  <th className="px-3 py-2.5 font-medium">CTA</th>
                  <th className="px-3 py-2.5 font-medium">Checkout</th>
                  <th className="px-3 py-2.5 font-medium">Compras</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#171b24]">
                {byProduct.map((r) => (
                  <tr key={r.id}>
                    <td className="px-5 py-2.5">
                      <Link href={`/products/${r.id}`} className="text-white hover:text-[#7396ff]">{r.title}</Link>
                    </td>
                    <td className="px-3 py-2.5 text-[#a5adbd]">{r.views}</td>
                    <td className="px-3 py-2.5 text-[#a5adbd]">{r.clicks}</td>
                    <td className="px-3 py-2.5 text-[#a5adbd]">{r.checkouts}</td>
                    <td className="px-3 py-2.5 text-[#a5adbd]">{r.purchases}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="surface p-5">
          <SectionTitle title="Origem dos eventos" subtitle="source registrado no evento" />
          {bySource.length === 0 ? (
            <p className="text-xs text-[#6b7386]">Sem dados de origem no período.</p>
          ) : (
            <ul className="space-y-2">
              {bySource.map((s) => (
                <li key={s.source ?? "n/a"} className="flex items-center justify-between rounded-lg border border-[#1f2531] bg-[#0d1017] px-3 py-2 text-xs">
                  <span className="text-[#c5cbd7]">{s.source ?? "não informado"}</span>
                  <span className="text-[#6b7386]">{s.n}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
