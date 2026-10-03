import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { products, salesPages } from "@/db/schema";
import { apiError, apiOk, handler, parseBody } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { recordEvent } from "@/lib/analytics";
import { audit } from "@/lib/logger";
import { getOwnedProduct, getSalesPage } from "@/lib/products";

const schema = z.object({
  headline: z.string().min(3).max(240).optional(),
  subheadline: z.string().max(400).nullable().optional(),
  problem: z.string().max(2000).nullable().optional(),
  solution: z.string().max(2000).nullable().optional(),
  benefits: z.array(z.string().max(300)).max(20).optional(),
  contents: z.array(z.string().max(300)).max(30).optional(),
  differentials: z.array(z.string().max(300)).max(20).optional(),
  bonuses: z.array(z.string().max(300)).max(20).optional(),
  faq: z.array(z.object({ q: z.string().max(300), a: z.string().max(1200) })).max(20).optional(),
  guarantee: z.string().max(600).nullable().optional(),
  ctaLabel: z.string().max(60).optional(),
  published: z.boolean().optional(),
});

export const PATCH = handler(async (request, ctx) => {
  const { organization, user } = await requireSession();
  const { id } = await ctx.params;
  const product = await getOwnedProduct(id, organization.id);
  const body = await parseBody(request, schema);

  const existing = await getSalesPage(id, organization.id);
  if (!existing) return apiError("Gere a página de vendas antes de editá-la.", 404);

  const updated = await db
    .update(salesPages)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(salesPages.id, existing.id))
    .returning();

  if (body.published === true) {
    await db.update(products).set({ status: "PUBLISHED", publishedAt: new Date(), updatedAt: new Date() }).where(eq(products.id, product.id));
    await recordEvent({ organizationId: organization.id, userId: user.id, productId: product.id, type: "product_published" });
  }
  if (body.published === false && product.status === "PUBLISHED") {
    await db.update(products).set({ status: "READY", updatedAt: new Date() }).where(eq(products.id, product.id));
  }

  await audit({ organizationId: organization.id, actorId: user.id, action: "sales_page.update", entity: "product", entityId: product.id });
  return apiOk(updated[0]);
});
