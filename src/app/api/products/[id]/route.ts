import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { chapters, contentItems, products, salesPages } from "@/db/schema";
import { apiOk, handler, parseBody } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { recordEvent } from "@/lib/analytics";
import { audit } from "@/lib/logger";
import { getOwnedProduct, getProductChapters, getSalesPage } from "@/lib/products";

const patchSchema = z.object({
  title: z.string().min(2).max(160).optional(),
  subtitle: z.string().max(200).nullable().optional(),
  promise: z.string().max(400).nullable().optional(),
  concept: z.string().max(2000).nullable().optional(),
  audience: z.string().max(240).nullable().optional(),
  objective: z.string().max(240).nullable().optional(),
  problem: z.string().max(400).nullable().optional(),
  designStyle: z.string().max(30).optional(),
  coverPalette: z.string().max(30).optional(),
  priceCents: z.number().int().min(0).max(100_000_00).optional(),
  status: z.enum(["DRAFT", "IN_PRODUCTION", "READY", "PUBLISHED", "ARCHIVED"]).optional(),
});

export const GET = handler(async (_request, ctx) => {
  const { organization } = await requireSession();
  const { id } = await ctx.params;
  const product = await getOwnedProduct(id, organization.id);
  const [chs, sp] = await Promise.all([getProductChapters(id, organization.id), getSalesPage(id, organization.id)]);
  const content = await db
    .select()
    .from(contentItems)
    .where(and(eq(contentItems.productId, id), eq(contentItems.organizationId, organization.id)));
  return apiOk({ product, chapters: chs, salesPage: sp, content });
});

export const PATCH = handler(async (request, ctx) => {
  const { organization, user } = await requireSession();
  const { id } = await ctx.params;
  await getOwnedProduct(id, organization.id);
  const body = await parseBody(request, patchSchema);

  const updated = await db
    .update(products)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(products.id, id), eq(products.organizationId, organization.id)))
    .returning();

  if (body.status === "PUBLISHED") {
    await db.update(products).set({ publishedAt: new Date() }).where(eq(products.id, id));
    await db.update(salesPages).set({ published: true }).where(eq(salesPages.productId, id));
    await recordEvent({ organizationId: organization.id, userId: user.id, productId: id, type: "product_published" });
  }

  await audit({ organizationId: organization.id, actorId: user.id, action: "product.update", entity: "product", entityId: id });
  return apiOk(updated[0]);
});

export const DELETE = handler(async (_request, ctx) => {
  const { organization, user } = await requireSession();
  const { id } = await ctx.params;
  await getOwnedProduct(id, organization.id);

  await db.delete(chapters).where(and(eq(chapters.productId, id), eq(chapters.organizationId, organization.id)));
  await db.delete(salesPages).where(and(eq(salesPages.productId, id), eq(salesPages.organizationId, organization.id)));
  await db.delete(contentItems).where(and(eq(contentItems.productId, id), eq(contentItems.organizationId, organization.id)));
  await db.delete(products).where(and(eq(products.id, id), eq(products.organizationId, organization.id)));

  await audit({ organizationId: organization.id, actorId: user.id, action: "product.delete", entity: "product", entityId: id });
  return apiOk({ deleted: true });
});
