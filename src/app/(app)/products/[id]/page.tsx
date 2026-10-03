import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { assets, contentItems } from "@/db/schema";
import { requireSession } from "@/lib/auth";
import { getOwnedProduct, getProductChapters, getSalesPage } from "@/lib/products";
import { eventTotals, rangeStart } from "@/lib/analytics";
import { providerStatus } from "@/lib/ai/provider";
import { ProductWorkspace } from "./workspace";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organization } = await requireSession();
  const product = await getOwnedProduct(id, organization.id);

  const [chs, salesPage, content, cover, totals] = await Promise.all([
    getProductChapters(id, organization.id),
    getSalesPage(id, organization.id),
    db
      .select()
      .from(contentItems)
      .where(and(eq(contentItems.productId, id), eq(contentItems.organizationId, organization.id)))
      .orderBy(contentItems.scheduledFor),
    db
      .select()
      .from(assets)
      .where(and(eq(assets.productId, id), eq(assets.kind, "COVER"), eq(assets.organizationId, organization.id)))
      .orderBy(desc(assets.createdAt))
      .limit(1),
    eventTotals(organization.id, rangeStart("30d")),
  ]);

  return (
    <ProductWorkspace
      product={{
        ...product,
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
        publishedAt: product.publishedAt ? product.publishedAt.toISOString() : null,
      }}
      chapters={chs.map((c) => ({
        id: c.id,
        title: c.title,
        summary: c.summary,
        content: c.content,
        kind: c.kind,
        position: c.position,
      }))}
      salesPage={
        salesPage
          ? {
              id: salesPage.id,
              headline: salesPage.headline,
              subheadline: salesPage.subheadline,
              problem: salesPage.problem,
              solution: salesPage.solution,
              benefits: salesPage.benefits,
              contents: salesPage.contents,
              differentials: salesPage.differentials,
              bonuses: salesPage.bonuses,
              faq: salesPage.faq,
              guarantee: salesPage.guarantee,
              ctaLabel: salesPage.ctaLabel,
              published: salesPage.published,
            }
          : null
      }
      content={content.map((c) => ({
        id: c.id,
        channel: c.channel,
        format: c.format,
        title: c.title,
        body: c.body,
        cta: c.cta,
        status: c.status,
        scheduledFor: c.scheduledFor ? c.scheduledFor.toISOString() : null,
      }))}
      coverSvg={cover[0]?.payload ?? null}
      metrics={{
        pageViews: totals.page_view ?? 0,
        ctaClicks: totals.cta_clicked ?? 0,
        checkouts: totals.checkout_started ?? 0,
        purchases: totals.purchase_completed ?? 0,
      }}
      aiConfigured={providerStatus().configured}
    />
  );
}
