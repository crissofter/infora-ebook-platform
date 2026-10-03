import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { organizations, plans, subscriptions, usageLimits } from "@/db/schema";

export type PlanSeed = typeof plans.$inferInsert;

export const PLAN_CATALOG: PlanSeed[] = [
  {
    code: "FREE",
    name: "Free",
    priceCents: 0,
    monthlyCredits: 1000,
    maxProducts: 1,
    maxProjects: 1,
    sortOrder: 1,
    features: ["1 projeto", "1 produto", "1.000 créditos de IA/mês", "Exportação com marca INFORA"],
  },
  {
    code: "STARTER",
    name: "Starter",
    priceCents: 4900,
    monthlyCredits: 10000,
    maxProducts: 5,
    maxProjects: 3,
    sortOrder: 2,
    features: ["3 projetos", "5 produtos", "10.000 créditos/mês", "Página de vendas", "Exportação PDF"],
  },
  {
    code: "CREATOR",
    name: "Creator",
    priceCents: 9900,
    monthlyCredits: 30000,
    maxProducts: 20,
    maxProjects: 10,
    sortOrder: 3,
    features: ["10 projetos", "20 produtos", "30.000 créditos/mês", "Marketing Engine", "Calendário de conteúdo"],
  },
  {
    code: "PRO",
    name: "Pro",
    priceCents: 19900,
    monthlyCredits: 80000,
    maxProducts: 100,
    maxProjects: 50,
    sortOrder: 4,
    features: ["50 projetos", "100 produtos", "80.000 créditos/mês", "Analytics avançado", "Integrações sociais"],
  },
  {
    code: "BUSINESS",
    name: "Business",
    priceCents: 49900,
    monthlyCredits: 250000,
    maxProducts: 1000,
    maxProjects: 500,
    sortOrder: 5,
    features: ["Projetos ilimitados na prática", "250.000 créditos/mês", "Multiusuário", "Suporte prioritário"],
  },
];

export function periodKey(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function ensurePlans() {
  for (const plan of PLAN_CATALOG) {
    await db
      .insert(plans)
      .values(plan)
      .onConflictDoUpdate({
        target: plans.code,
        set: {
          name: plan.name,
          priceCents: plan.priceCents,
          monthlyCredits: plan.monthlyCredits,
          maxProducts: plan.maxProducts,
          maxProjects: plan.maxProjects,
          features: plan.features,
          sortOrder: plan.sortOrder,
        },
      });
  }
}

export async function getPlan(code: string) {
  const rows = await db.select().from(plans).where(eq(plans.code, code)).limit(1);
  if (rows[0]) return rows[0];
  const fallback = PLAN_CATALOG.find((p) => p.code === code) ?? PLAN_CATALOG[0];
  return { ...fallback, features: fallback.features ?? [] } as typeof plans.$inferSelect;
}

export async function getUsage(organizationId: string, planCode: string) {
  const key = periodKey();
  const plan = await getPlan(planCode);
  const rows = await db
    .select()
    .from(usageLimits)
    .where(and(eq(usageLimits.organizationId, organizationId), eq(usageLimits.periodKey, key)))
    .limit(1);
  let row = rows[0];
  if (!row) {
    const inserted = await db
      .insert(usageLimits)
      .values({ organizationId, periodKey: key, creditsIncluded: plan.monthlyCredits, creditsUsed: 0 })
      .onConflictDoNothing()
      .returning();
    row =
      inserted[0] ??
      (
        await db
          .select()
          .from(usageLimits)
          .where(and(eq(usageLimits.organizationId, organizationId), eq(usageLimits.periodKey, key)))
          .limit(1)
      )[0];
  }
  const included = row?.creditsIncluded ?? plan.monthlyCredits;
  const used = row?.creditsUsed ?? 0;
  return { periodKey: key, plan, creditsIncluded: included, creditsUsed: used, creditsLeft: Math.max(0, included - used) };
}

export async function consumeCredits(organizationId: string, planCode: string, credits: number) {
  const usage = await getUsage(organizationId, planCode);
  if (usage.creditsLeft < credits) {
    return { ok: false as const, usage };
  }
  await db
    .update(usageLimits)
    .set({ creditsUsed: sql`${usageLimits.creditsUsed} + ${credits}`, updatedAt: new Date() })
    .where(and(eq(usageLimits.organizationId, organizationId), eq(usageLimits.periodKey, usage.periodKey)));
  return { ok: true as const, usage: { ...usage, creditsUsed: usage.creditsUsed + credits, creditsLeft: usage.creditsLeft - credits } };
}

export async function ensureSubscription(organizationId: string, planCode = "FREE") {
  const existing = await db.select().from(subscriptions).where(eq(subscriptions.organizationId, organizationId)).limit(1);
  if (existing[0]) return existing[0];
  const periodEnd = new Date(Date.now() + 30 * 864e5);
  const created = await db
    .insert(subscriptions)
    .values({ organizationId, planCode, status: "ACTIVE", provider: "none", currentPeriodEnd: periodEnd })
    .returning();
  return created[0];
}

export async function changePlan(organizationId: string, planCode: string) {
  const plan = await getPlan(planCode);
  await ensureSubscription(organizationId, planCode);
  await db
    .update(subscriptions)
    .set({ planCode, status: "ACTIVE", updatedAt: new Date() })
    .where(eq(subscriptions.organizationId, organizationId));
  await db.update(organizations).set({ planCode, updatedAt: new Date() }).where(eq(organizations.id, organizationId));
  await db
    .update(usageLimits)
    .set({ creditsIncluded: plan.monthlyCredits })
    .where(and(eq(usageLimits.organizationId, organizationId), eq(usageLimits.periodKey, periodKey())));
  return plan;
}
