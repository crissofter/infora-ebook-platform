import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { chapterBlocks } from "@/db/schema";
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

  const [deleted] = await db
    .delete(chapterBlocks)
    .where(
      and(
        eq(chapterBlocks.id, id),
        eq(chapterBlocks.organizationId, organization.id),
      ),
    )
    .returning({ id: chapterBlocks.id });

  if (!deleted) {
    return apiError("Bloco não encontrado no seu workspace.", 404);
  }

  return apiOk({ deleted: true });
});