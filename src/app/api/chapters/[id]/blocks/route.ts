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