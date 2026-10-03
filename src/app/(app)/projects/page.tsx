import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { products, projects } from "@/db/schema";
import { requireSession } from "@/lib/auth";
import { getPlan } from "@/lib/billing";
import { ProjectsClient } from "./client";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const { organization } = await requireSession();
  const rows = await db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      audience: projects.audience,
      createdAt: projects.createdAt,
      productCount: sql<number>`(select count(*)::int from ${products} p where p.project_id = ${projects.id})`,
    })
    .from(projects)
    .where(eq(projects.organizationId, organization.id))
    .orderBy(desc(projects.createdAt));

  const plan = await getPlan(organization.planCode);

  return (
    <ProjectsClient
      initial={rows.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        audience: r.audience,
        createdAt: r.createdAt.toISOString(),
        productCount: Number(r.productCount),
      }))}
      planName={plan.name}
      maxProjects={plan.maxProjects}
    />
  );
}
