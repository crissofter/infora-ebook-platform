import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { chapterBlocks, chapters } from "@/db/schema";
import { apiError, apiOk, handler, parseBody } from "@/lib/api";
import { requireSession } from "@/lib/auth";

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  summary: z.string().max(600).nullable().optional(),
  content: z.string().max(80000).optional(),
  kind: z.enum(["INTRO", "CHAPTER", "BONUS", "CONCLUSION", "CTA"]).optional(),
  status: z.enum(["DRAFT", "GENERATED", "REVIEWED"]).optional(),
});

export const PATCH = handler(async (request, ctx) => {
  const { organization } = await requireSession();
  const { id } = await ctx.params;
  const body = await parseBody(request, patchSchema);

  const updated = await db
    .update(chapters)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(chapters.id, id), eq(chapters.organizationId, organization.id)))
    .returning();

  if (!updated[0]) return apiError("Capítulo não encontrado no seu workspace.", 403);
  return apiOk(updated[0]);
});

export const DELETE = handler(async (_request, ctx) => {
  const { organization } = await requireSession();
  const { id } = await ctx.params;
  await db.delete(chapterBlocks).where(and(eq(chapterBlocks.chapterId, id), eq(chapterBlocks.organizationId, organization.id)));
  const deleted = await db
    .delete(chapters)
    .where(and(eq(chapters.id, id), eq(chapters.organizationId, organization.id)))
    .returning({ id: chapters.id });
  if (!deleted[0]) return apiError("Capítulo não encontrado no seu workspace.", 403);
  return apiOk({ deleted: true });
});
