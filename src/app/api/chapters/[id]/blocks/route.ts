import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { chapterBlocks, chapters } from "@/db/schema";
import { apiError, apiOk, handler, parseBody } from "@/lib/api";
import { requireSession } from "@/lib/auth";

const createBlockSchema = z.object({
  position: z.number().int().min(0).optional(),
  type: z.enum([
    "TEXT",
    "IMAGE",
    "QUOTE",
    "CHECKLIST",
    "INFOGRAPHIC",
    "EXERCISE",
    "CTA",
  ]),
  content: z.string().max(80000).nullable().optional(),
  assetId: z.string().uuid().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const GET = handler(async (_request, ctx) => {
  const { organization } = await requireSession();
  const { id: chapterId } = await ctx.params;

  const blocks = await db
    .select()
    .from(chapterBlocks)
    .where(
      and(
        eq(chapterBlocks.chapterId, chapterId),
        eq(chapterBlocks.organizationId, organization.id),
      ),
    )
    .orderBy(asc(chapterBlocks.position));

  return apiOk(blocks);
});

export const POST = handler(async (request, ctx) => {
  const { organization } = await requireSession();
  const { id: chapterId } = await ctx.params;
  const body = await parseBody(request, createBlockSchema);

  const chapter = await db
    .select({ id: chapters.id })
    .from(chapters)
    .where(
      and(
        eq(chapters.id, chapterId),
        eq(chapters.organizationId, organization.id),
      )
    )
    .limit(1);

  if (!chapter[0]) {
    return apiError("Capítulo não encontrado no seu workspace.", 403);
  }

  const [block] = await db
    .insert(chapterBlocks)
    .values({
      organizationId: organization.id,
      chapterId,
      position: body.position ?? 0,
      type: body.type,
      content: body.content ?? null,
      assetId: body.assetId ?? null,
      metadata: body.metadata ?? null,
    })
    .returning();

  return apiOk(block);
});


const reorderBlocksSchema = z.object({
  order: z.array(z.string().uuid()).min(1),
});

export const PUT = handler(async (request, ctx) => {
  const { organization } = await requireSession();
  const { id: chapterId } = await ctx.params;
  const body = await parseBody(request, reorderBlocksSchema);

  const [chapter] = await db
    .select({ id: chapters.id })
    .from(chapters)
    .where(
      and(
        eq(chapters.id, chapterId),
        eq(chapters.organizationId, organization.id),
      ),
    )
    .limit(1);

  if (!chapter) {
    return apiError("Capítulo não encontrado no seu workspace.", 403);
  }

  const blocks = await db
    .select({ id: chapterBlocks.id })
    .from(chapterBlocks)
    .where(
      and(
        eq(chapterBlocks.chapterId, chapterId),
        eq(chapterBlocks.organizationId, organization.id),
      ),
    );

  const existingIds = new Set(blocks.map((block) => block.id));

  if (
    body.order.length !== blocks.length ||
    body.order.some((blockId) => !existingIds.has(blockId))
  ) {
    return apiError(
      "A ordem enviada não corresponde aos blocos deste capítulo.",
      400,
    );
  }

  for (const [position, blockId] of body.order.entries()) {
    await db
      .update(chapterBlocks)
      .set({
        position,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(chapterBlocks.id, blockId),
          eq(chapterBlocks.chapterId, chapterId),
          eq(chapterBlocks.organizationId, organization.id),
        ),
      );
  }

  const reordered = await db
    .select()
    .from(chapterBlocks)
    .where(
      and(
        eq(chapterBlocks.chapterId, chapterId),
        eq(chapterBlocks.organizationId, organization.id),
      ),
    )
    .orderBy(asc(chapterBlocks.position));

  return apiOk(reordered);
});