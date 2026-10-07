import { eq, inArray, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  analyticsEvents,
  aiGenerations, aiUsage, socialAccounts, socialPublications, subscriptions, usageLimits, customers, orders, orderItems, payments, coupons, creators, affiliates, commissions, notifications, auditLogs, systemLogs, jobs, organizationCounters, passwordResets,
  assets,
  campaigns,
  chapters,
  chapterBlocks,
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
import { createSession, destroySession, hashPassword, requireSession, verifyPassword } from "@/lib/auth";
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
  const [prj, prd, chs, sp, ci, ev, cmp, ast, blocks] = await Promise.all([
    db.select().from(projects).where(eq(projects.organizationId, organization.id)),
    db.select().from(products).where(eq(products.organizationId, organization.id)),
    db.select().from(chapters).where(eq(chapters.organizationId, organization.id)),
    db.select().from(salesPages).where(eq(salesPages.organizationId, organization.id)),
    db.select().from(contentItems).where(eq(contentItems.organizationId, organization.id)),
    db.select().from(analyticsEvents).where(eq(analyticsEvents.organizationId, organization.id)),
    db.select().from(campaigns).where(eq(campaigns.organizationId, organization.id)),
    db.select().from(assets).where(eq(assets.organizationId, organization.id)),
    db.select().from(chapterBlocks).where(eq(chapterBlocks.organizationId, organization.id)),
  ]);

  return apiOk({
    exportedAt: new Date().toISOString(),
    user: { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt },
    organization,
    projects: prj,
    products: prd,
    chapters: chs,
    chapterBlocks: blocks,
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
    await db.delete(sessions).where(eq(sessions.userId, user.id));
    await createSession(user.id);
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
  const { user, organization, membershipRole } = await requireSession();
  if (membershipRole !== "OWNER") return apiError("Somente o proprietário pode excluir a organização.", 403);
  const orgId = organization.id;
  await db.transaction(async (tx) => {
    const ownedOrders = await tx.select({ id: orders.id }).from(orders).where(eq(orders.organizationId, orgId));
    const ownedAffiliates = await tx.select({ id: affiliates.id }).from(affiliates).where(eq(affiliates.organizationId, orgId));
    if (ownedOrders.length) {
      await tx.delete(orderItems).where(inArray(orderItems.orderId, ownedOrders.map((o) => o.id)));
      await tx.delete(commissions).where(inArray(commissions.orderId, ownedOrders.map((o) => o.id)));
    }
    if (ownedAffiliates.length) await tx.delete(commissions).where(inArray(commissions.affiliateId, ownedAffiliates.map((a) => a.id)));
    const organizationTables = [aiUsage, aiGenerations, socialPublications, socialAccounts, payments, orders, subscriptions, usageLimits, customers, coupons, creators, affiliates, analyticsEvents, notifications, jobs, organizationCounters, contentItems, campaigns, chapterBlocks, assets, salesPages, chapters, productVersions, products, projects, memberships];
    for (const table of organizationTables) await tx.delete(table).where(eq(table.organizationId, orgId));
    await tx.delete(auditLogs).where(or(eq(auditLogs.organizationId, orgId), eq(auditLogs.actorId, user.id)));
    await tx.delete(systemLogs).where(or(eq(systemLogs.organizationId, orgId), eq(systemLogs.userId, user.id)));
    await tx.delete(passwordResets).where(eq(passwordResets.userId, user.id));
    await tx.delete(sessions).where(eq(sessions.userId, user.id));
    await tx.delete(organizations).where(eq(organizations.id, orgId));
    await tx.delete(users).where(eq(users.id, user.id));
  });

  await destroySession();
  return apiOk({ deleted: true });
});
