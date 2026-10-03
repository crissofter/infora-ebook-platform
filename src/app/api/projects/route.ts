import { randomBytes } from "node:crypto";
import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { products, projects } from "@/db/schema";
import { apiError, apiOk, handler, parseBody } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { getPlan } from "@/lib/billing";
import { audit } from "@/lib/logger";

const schema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  audience: z.string().max(200).optional(),
});

export const GET = handler(async () => {
  const { organization } = await requireSession();
  const rows = await db
    .select({
      project: projects,
      productCount: sql<number>`(select count(*)::int from ${products} p where p.project_id = ${projects.id})`,
    })
    .from(projects)
    .where(eq(projects.organizationId, organization.id))
    .orderBy(desc(projects.createdAt));
  return apiOk(rows);
});

export const POST = handler(async (request) => {
  const { organization, user } = await requireSession();
  const body = await parseBody(request, schema);

  const plan = await getPlan(organization.planCode);
  const count = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(projects)
    .where(eq(projects.organizationId, organization.id));
  if (Number(count[0]?.n ?? 0) >= plan.maxProjects) {
    return apiError(`Seu plano ${plan.name} permite ${plan.maxProjects} projeto(s). Faça upgrade para criar mais.`, 402, "PLAN_LIMIT");
  }

  const created = await db
    .insert(projects)
    .values({
      organizationId: organization.id,
      createdBy: user.id,
      name: body.name.trim(),
      description: body.description ?? null,
      audience: body.audience ?? null,
    })
    .returning();

  await audit({
    organizationId: organization.id,
    actorId: user.id,
    action: "project.create",
    entity: "project",
    entityId: created[0].id,
    metadata: { ref: randomBytes(3).toString("hex") },
  });

  return apiOk(created[0], 201);
});
