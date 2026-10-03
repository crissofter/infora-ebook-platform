import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { contentItems, socialAccounts, socialPublications } from "@/db/schema";
import { apiError, apiOk, handler, parseBody } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { audit } from "@/lib/logger";

const schema = z.object({
  title: z.string().max(200).optional(),
  body: z.string().max(8000).optional(),
  cta: z.string().max(200).nullable().optional(),
  status: z.enum(["DRAFT", "AWAITING_APPROVAL", "SCHEDULED", "PUBLISHED", "FAILED"]).optional(),
  scheduledFor: z.string().datetime().nullable().optional(),
});

export const PATCH = handler(async (request, ctx) => {
  const { organization, user } = await requireSession();
  const { id } = await ctx.params;
  const payload = await parseBody(request, schema);

  const current = (
    await db
      .select()
      .from(contentItems)
      .where(and(eq(contentItems.id, id), eq(contentItems.organizationId, organization.id)))
      .limit(1)
  )[0];
  if (!current) return apiError("Conteúdo não encontrado no seu workspace.", 403);

  // Publicação real exige integração oficial conectada e aprovação do usuário.
  if (payload.status === "PUBLISHED") {
    const account = (
      await db
        .select()
        .from(socialAccounts)
        .where(and(eq(socialAccounts.organizationId, organization.id), eq(socialAccounts.status, "CONNECTED")))
        .limit(1)
    )[0];
    if (!account) {
      await db.insert(socialPublications).values({
        organizationId: organization.id,
        contentItemId: id,
        status: "FAILED",
        message: "Integration not configured",
      });
      return apiError(
        "Integration not configured. Conecte uma conta oficial do Instagram ou Facebook para publicar a partir da INFORA.",
        409,
        "INTEGRATION_NOT_CONFIGURED",
      );
    }
  }

  const updated = await db
    .update(contentItems)
    .set({
      ...payload,
      scheduledFor: payload.scheduledFor === undefined ? undefined : payload.scheduledFor ? new Date(payload.scheduledFor) : null,
      updatedAt: new Date(),
    })
    .where(and(eq(contentItems.id, id), eq(contentItems.organizationId, organization.id)))
    .returning();

  await audit({ organizationId: organization.id, actorId: user.id, action: "content.update", entity: "content_item", entityId: id });
  return apiOk(updated[0]);
});

export const DELETE = handler(async (_request, ctx) => {
  const { organization } = await requireSession();
  const { id } = await ctx.params;
  const deleted = await db
    .delete(contentItems)
    .where(and(eq(contentItems.id, id), eq(contentItems.organizationId, organization.id)))
    .returning({ id: contentItems.id });
  if (!deleted[0]) return apiError("Conteúdo não encontrado no seu workspace.", 403);
  return apiOk({ deleted: true });
});
