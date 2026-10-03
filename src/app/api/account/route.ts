import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  analyticsEvents,
  assets,
  campaigns,
  chapters,
  contentItems,
  memberships,
  organizations,
  productVersions,
  products,
  projects,
  salesPages,
  sessions,
  users,
} from "@/db/schema";
import { apiError, apiOk, handler, parseBody } from "@/lib/api";
import { destroySession, hashPassword, requireSession, verifyPassword } from "@/lib/auth";
import { audit } from "@/lib/logger";

const patchSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  goal: z.string().max(200).nullable().optional(),
  creatorType: z.string().max(80).nullable().optional(),
  organizationName: z.string().min(2).max(120).optional(),
  currentPassword: z.string().max(200).optional(),
  newPassword: z.string().min(8).max(200).optional(),
});

/** LGPD — data export of everything stored for the caller's organization. */
export const GET = handler(async () => {
  const { user, organization } = await requireSession();
  const [prj, prd, chs, sp, ci, ev, cmp, ast] = await Promise.all([
    db.select().from(projects).where(eq(projects.organizationId, organization.id)),
    db.select().from(products).where(eq(products.organizationId, organization.id)),
    db.select().from(chapters).where(eq(chapters.organizationId, organization.id)),
    db.select().from(salesPages).where(eq(salesPages.organizationId, organization.id)),
    db.select().from(contentItems).where(eq(contentItems.organizationId, organization.id)),
    db.select().from(analyticsEvents).where(eq(analyticsEvents.organizationId, organization.id)),
    db.select().from(campaigns).where(eq(campaigns.organizationId, organization.id)),
    db.select({ id: assets.id, kind: assets.kind, name: assets.name }).from(assets).where(eq(assets.organizationId, organization.id)),
  ]);

  return apiOk({
    exportedAt: new Date().toISOString(),
    user: { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt },
    organization,
    projects: prj,
    products: prd,
    chapters: chs,
    salesPages: sp,
    contentItems: ci,
    campaigns: cmp,
    assets: ast,
    analyticsEvents: ev,
  });
});

export const PATCH = handler(async (request) => {
  const { user, organization } = await requireSession();
  const body = await parseBody(request, patchSchema);

  if (body.newPassword) {
    if (!body.currentPassword || !(await verifyPassword(body.currentPassword, user.passwordHash))) {
      return apiError("Senha atual incorreta.", 400);
    }
    await db.update(users).set({ passwordHash: await hashPassword(body.newPassword), updatedAt: new Date() }).where(eq(users.id, user.id));
  }

  if (body.name || body.goal !== undefined || body.creatorType !== undefined) {
    await db
      .update(users)
      .set({
        name: body.name ?? user.name,
        goal: body.goal === undefined ? user.goal : body.goal,
        creatorType: body.creatorType === undefined ? user.creatorType : body.creatorType,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));
  }

  if (body.organizationName) {
    await db.update(organizations).set({ name: body.organizationName, updatedAt: new Date() }).where(eq(organizations.id, organization.id));
  }

  await audit({ organizationId: organization.id, actorId: user.id, action: "account.update" });
  return apiOk({ updated: true });
});

/** LGPD — account + organization data deletion. */
export const DELETE = handler(async () => {
  const { user, organization } = await requireSession();
  const orgId = organization.id;

  await db.delete(analyticsEvents).where(eq(analyticsEvents.organizationId, orgId));
  await db.delete(contentItems).where(eq(contentItems.organizationId, orgId));
  await db.delete(campaigns).where(eq(campaigns.organizationId, orgId));
  await db.delete(assets).where(eq(assets.organizationId, orgId));
  await db.delete(salesPages).where(eq(salesPages.organizationId, orgId));
  await db.delete(chapters).where(eq(chapters.organizationId, orgId));
  await db.delete(productVersions).where(eq(productVersions.organizationId, orgId));
  await db.delete(products).where(eq(products.organizationId, orgId));
  await db.delete(projects).where(eq(projects.organizationId, orgId));
  await db.delete(memberships).where(eq(memberships.organizationId, orgId));
  await db.delete(sessions).where(eq(sessions.userId, user.id));
  await db.delete(organizations).where(eq(organizations.id, orgId));
  await db.delete(users).where(eq(users.id, user.id));

  await audit({ action: "account.delete", entity: "user", entityId: user.id });
  await destroySession();
  return apiOk({ deleted: true });
});
