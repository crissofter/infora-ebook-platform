import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { contentItems } from "@/db/schema";
import { requireSession } from "@/lib/auth";
import { getOwnedProduct, getProductChapters, getSalesPage } from "@/lib/products";
import { eventTotals, rangeStart } from "@/lib/analytics";
import { providerStatus } from "@/lib/ai/provider";
import { ProductWorkspace } from "./workspace";
import { getProductMedia } from "@/lib/product-media";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organization } = await requireSession();
  const product = await getOwnedProduct(id, organization.id);

  const [chs, salesPage, content, totals, media] = await Promise.all([
    getProductChapters(id, organization.id),
    getSalesPage(id, organization.id),
    db
      .select()
      .from(contentItems)
      .where(and(eq(contentItems.productId, id), eq(contentItems.organizationId, organization.id)))
      .orderBy(contentItems.scheduledFor),
    eventTotals(organization.id, rangeStart("30d")),
    getProductMedia(id, organization.id),
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
              checkoutUrl: salesPage.checkoutUrl,
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
      coverImage={media.cover}
      chapterImages={media.images}
      imageConfigured={Boolean(process.env.IMAGE_API_KEY || process.env.OPENAI_API_KEY)}
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
