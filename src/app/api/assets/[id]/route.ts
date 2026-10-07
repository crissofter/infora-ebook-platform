import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { assets, products, salesPages } from "@/db/schema";
import { apiError, handler } from "@/lib/api";
import { getSession } from "@/lib/auth";

export const GET = handler(async (_request, ctx) => {
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return apiError("Imagem não encontrada.", 404);
  const [asset] = await db.select().from(assets).where(eq(assets.id, id)).limit(1);
  if (!asset?.payload || !["png", "jpeg", "webp", "svg"].includes(asset.format)) return apiError("Imagem não encontrada.", 404);
  const session = await getSession();
  let allowed = session?.organization.id === asset.organizationId;
  if (!allowed && asset.kind === "COVER" && asset.productId) {
    const [published] = await db.select({ id: products.id }).from(products).innerJoin(salesPages, eq(salesPages.productId, products.id))
      .where(and(eq(products.id, asset.productId), eq(products.organizationId, asset.organizationId), eq(products.status, "PUBLISHED"), eq(salesPages.published, true))).limit(1);
    if (published) {
      const [currentCover] = await db.select({ id: assets.id }).from(assets).where(and(eq(assets.productId, asset.productId), eq(assets.organizationId, asset.organizationId), eq(assets.kind, "COVER"))).orderBy(desc(assets.createdAt)).limit(1);
      allowed = currentCover?.id === asset.id;
    }
  }
  if (!allowed) return apiError("Imagem não encontrada.", 404);
  const body = asset.format === "svg" ? Buffer.from(asset.payload) : Buffer.from(asset.payload, "base64");
  return new Response(body, { headers: { "content-type": asset.format === "svg" ? "image/svg+xml" : `image/${asset.format}`, "cache-control": "private, no-store", "x-content-type-options": "nosniff", "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox" } });
});
