import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { aiUsage, subscriptions } from "@/db/schema";
import { requireSession } from "@/lib/auth";
import { PLAN_CATALOG, getUsage, periodKey } from "@/lib/billing";
import { BillingClient } from "./client";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const { organization } = await requireSession();
  const usage = await getUsage(organization.id, organization.planCode);

  const [sub, byOperation, recent] = await Promise.all([
    db.select().from(subscriptions).where(eq(subscriptions.organizationId, organization.id)).limit(1),
    db
      .select({ operation: aiUsage.operation, credits: sql<number>`sum(${aiUsage.credits})::int`, runs: sql<number>`count(*)::int` })
      .from(aiUsage)
      .where(eq(aiUsage.organizationId, organization.id))
      .groupBy(aiUsage.operation)
      .orderBy(desc(sql`sum(${aiUsage.credits})`)),
    db.select().from(aiUsage).where(eq(aiUsage.organizationId, organization.id)).orderBy(desc(aiUsage.createdAt)).limit(15),
  ]);

  return (
    <BillingClient
      currentPlan={organization.planCode}
      plans={PLAN_CATALOG.map((p) => ({
        code: p.code,
        name: p.name,
        priceCents: p.priceCents ?? 0,
        monthlyCredits: p.monthlyCredits ?? 0,
        maxProducts: p.maxProducts ?? 0,
        maxProjects: p.maxProjects ?? 0,
        features: (p.features as string[]) ?? [],
      }))}
      usage={{ used: usage.creditsUsed, included: usage.creditsIncluded, periodKey: periodKey() }}
      subscription={
        sub[0]
          ? {
              status: sub[0].status,
              provider: sub[0].provider,
              currentPeriodEnd: sub[0].currentPeriodEnd.toISOString(),
              cancelAtPeriodEnd: sub[0].cancelAtPeriodEnd,
            }
          : null
      }
      byOperation={byOperation.map((o) => ({ operation: o.operation, credits: Number(o.credits), runs: Number(o.runs) }))}
      recent={recent.map((r) => ({
        id: r.id,
        operation: r.operation,
        model: r.model,
        credits: r.credits,
        createdAt: r.createdAt.toISOString(),
      }))}
    />
  );
}
