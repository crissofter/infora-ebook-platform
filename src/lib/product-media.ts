import "server-only";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { assets, chapterBlocks } from "@/db/schema";
import { getProductChapters } from "@/lib/products";

export async function getProductMedia(productId: string, organizationId: string) {
  const cover = (await db.select({ id: assets.id, name: assets.name }).from(assets)
    .where(and(eq(assets.productId, productId), eq(assets.organizationId, organizationId), eq(assets.kind, "COVER")))
    .orderBy(desc(assets.createdAt)).limit(1))[0];
  const chapters = await getProductChapters(productId, organizationId);
  const blocks = chapters.length ? await db.select({ id: chapterBlocks.id, chapterId: chapterBlocks.chapterId, assetId: assets.id, name: assets.name, caption: chapterBlocks.content })
    .from(chapterBlocks).innerJoin(assets, eq(assets.id, chapterBlocks.assetId))
    .where(and(inArray(chapterBlocks.chapterId, chapters.map((c) => c.id)), eq(chapterBlocks.organizationId, organizationId), eq(assets.organizationId, organizationId), eq(assets.productId, productId), eq(chapterBlocks.type, "IMAGE")))
    .orderBy(asc(chapterBlocks.position), asc(chapterBlocks.createdAt)) : [];
  return {
    cover: cover ? { ...cover, url: `/api/assets/${cover.id}` } : null,
    images: blocks.map((b) => ({ id: b.id, chapterId: b.chapterId, assetId: b.assetId, name: b.name, caption: b.caption, url: `/api/assets/${b.assetId}` })),
  };
}
