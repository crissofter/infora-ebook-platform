import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { chapters } from "@/db/schema";
import { apiOk, handler, parseBody } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { getOwnedProduct, getProductChapters } from "@/lib/products";

const createSchema = z.object({
  title: z.string().min(1).max(200).default("Novo capítulo"),
  kind: z.enum(["INTRO", "CHAPTER", "BONUS", "CONCLUSION", "CTA"]).default("CHAPTER"),
  content: z.string().max(60000).default(""),
  duplicateOf: z.string().uuid().optional(),
});

const reorderSchema = z.object({ order: z.array(z.string().uuid()).min(1) });

export const POST = handler(async (request, ctx) => {
  const { organization } = await requireSession();
  const { id } = await ctx.params;
  await getOwnedProduct(id, organization.id);
  const body = await parseBody(request, createSchema);

  const max = await db
    .select({ n: sql<number>`coalesce(max(${chapters.position}), -1)::int` })
    .from(chapters)
    .where(eq(chapters.productId, id));
  const position = Number(max[0]?.n ?? -1) + 1;

  let values: { title: string; kind: string; content: string; summary: string | null } = {
    title: body.title,
    kind: body.kind,
    content: body.content,
    summary: null,
  };
  if (body.duplicateOf) {
    const src = (
      await db
        .select()
        .from(chapters)
        .where(and(eq(chapters.id, body.duplicateOf), eq(chapters.organizationId, organization.id)))
        .limit(1)
    )[0];
    if (src) values = { title: `${src.title} (cópia)`, kind: src.kind, content: src.content, summary: src.summary };
  }

  const created = await db
    .insert(chapters)
    .values({ organizationId: organization.id, productId: id, position, ...values })
    .returning();
  return apiOk(created[0], 201);
});

export const PUT = handler(async (request, ctx) => {
  const { organization } = await requireSession();
  const { id } = await ctx.params;
  await getOwnedProduct(id, organization.id);
  const { order } = await parseBody(request, reorderSchema);

  for (let i = 0; i < order.length; i += 1) {
    await db
      .update(chapters)
      .set({ position: i, updatedAt: new Date() })
      .where(and(eq(chapters.id, order[i]), eq(chapters.organizationId, organization.id), eq(chapters.productId, id)));
  }
  return apiOk(await getProductChapters(id, organization.id));
});
