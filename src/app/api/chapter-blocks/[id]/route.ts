import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { assets, chapterBlocks, chapters } from "@/db/schema";
import { apiError, apiOk, handler, parseBody } from "@/lib/api";
import { requireSession } from "@/lib/auth";

const updateBlockSchema = z.object({
  position: z.number().int().min(0).optional(),
  type: z
    .enum([
      "TEXT",
      "IMAGE",
      "QUOTE",
      "CHECKLIST",
      "INFOGRAPHIC",
      "EXERCISE",
      "CTA",
    ])
    .optional(),
  content: z.string().max(80000).nullable().optional(),
  assetId: z.string().uuid().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const PATCH = handler(async (request, ctx) => {
  const { organization } = await requireSession();
  const { id } = await ctx.params;
  const body = await parseBody(request, updateBlockSchema);

  const [block] = await db
    .select({
      id: chapterBlocks.id,
      chapterId: chapterBlocks.chapterId,
    })
    .from(chapterBlocks)
    .where(
      and(
        eq(chapterBlocks.id, id),
        eq(chapterBlocks.organizationId, organization.id),
      ),
    )
    .limit(1);

  if (!block) {
    return apiError("Bloco não encontrado no seu workspace.", 404);
  }

  if (body.assetId) {
    const [asset] = await db
      .select({
        id: assets.id,
      })
      .from(assets)
      .innerJoin(
        chapters,
        eq(assets.productId, chapters.productId),
      )
      .where(
        and(
          eq(assets.id, body.assetId),
          eq(assets.organizationId, organization.id),
          eq(chapters.id, block.chapterId),
          eq(chapters.organizationId, organization.id),
        ),
      )
      .limit(1);

    if (!asset) {
      return apiError("Asset não pertence a este produto.", 403);
    }
  }

  const [updated] = await db
    .update(chapterBlocks)
    .set({
      ...body,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(chapterBlocks.id, id),
        eq(chapterBlocks.organizationId, organization.id),
      ),
    )
    .returning();

  if (!updated) {
    return apiError("Bloco não encontrado no seu workspace.", 404);
  }

  return apiOk(updated);
});

export const DELETE = handler(async (_request, ctx) => {
  const { organization } = await requireSession();
  const { id } = await ctx.params;
  const [deleted] = await db.delete(chapterBlocks).where(and(eq(chapterBlocks.id, id), eq(chapterBlocks.organizationId, organization.id))).returning({ id: chapterBlocks.id });
  if (!deleted) return apiError("Bloco não encontrado no seu workspace.", 404);
  return apiOk({ deleted: true });
});
