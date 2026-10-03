import "server-only";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { analyticsEvents, notifications } from "@/db/schema";

export const EVENT_TYPES = [
  "product_created",
  "product_generated",
  "product_exported",
  "product_published",
  "page_view",
  "cta_clicked",
  "lead_created",
  "checkout_started",
  "purchase_completed",
  "refund",
  "subscription_started",
  "subscription_cancelled",
  "campaign_created",
  "content_generated",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export async function recordEvent(params: {
  organizationId: string | null;
  type: EventType | string;
  userId?: string | null;
  productId?: string | null;
  campaignId?: string | null;
  source?: string | null;
  valueCents?: number;
  metadata?: Record<string, unknown>;
  isDemo?: boolean;
}) {
  try {
    await db.insert(analyticsEvents).values({
      organizationId: params.organizationId,
      userId: params.userId ?? null,
      productId: params.productId ?? null,
      campaignId: params.campaignId ?? null,
      type: params.type,
      source: params.source ?? null,
      valueCents: params.valueCents ?? 0,
      metadata: params.metadata ?? null,
      isDemo: params.isDemo ?? false,
    });
  } catch {
    /* analytics must never break the main flow */
  }
}

export async function notify(params: {
  organizationId: string;
  userId?: string | null;
  title: string;
  body?: string;
  level?: "INFO" | "SUCCESS" | "WARNING" | "ERROR";
}) {
  try {
    await db.insert(notifications).values({
      organizationId: params.organizationId,
      userId: params.userId ?? null,
      title: params.title,
      body: params.body ?? null,
      level: params.level ?? "INFO",
    });
  } catch {
    /* swallow */
  }
}

export function rangeStart(range: string): Date {
  const days = range === "today" ? 1 : range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 30;
  const d = new Date();
  if (range === "today") {
    d.setHours(0, 0, 0, 0);
    return d;
  }
  return new Date(Date.now() - days * 864e5);
}

export type Totals = Record<string, number>;

export async function eventTotals(organizationId: string, since: Date): Promise<Totals> {
  const rows = await db
    .select({ type: analyticsEvents.type, count: sql<number>`count(*)::int` })
    .from(analyticsEvents)
    .where(and(eq(analyticsEvents.organizationId, organizationId), gte(analyticsEvents.createdAt, since)))
    .groupBy(analyticsEvents.type);
  const totals: Totals = {};
  for (const r of rows) totals[r.type] = Number(r.count);
  return totals;
}

export async function revenueTotals(organizationId: string, since: Date) {
  const rows = await db
    .select({
      orders: sql<number>`count(*)::int`,
      revenue: sql<number>`coalesce(sum(${analyticsEvents.valueCents}),0)::int`,
    })
    .from(analyticsEvents)
    .where(
      and(
        eq(analyticsEvents.organizationId, organizationId),
        eq(analyticsEvents.type, "purchase_completed"),
        gte(analyticsEvents.createdAt, since),
      ),
    );
  return { orders: Number(rows[0]?.orders ?? 0), revenueCents: Number(rows[0]?.revenue ?? 0) };
}

export async function dailySeries(organizationId: string, since: Date, type: string) {
  const rows = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${analyticsEvents.createdAt}), 'YYYY-MM-DD')`,
      count: sql<number>`count(*)::int`,
    })
    .from(analyticsEvents)
    .where(
      and(
        eq(analyticsEvents.organizationId, organizationId),
        eq(analyticsEvents.type, type),
        gte(analyticsEvents.createdAt, since),
      ),
    )
    .groupBy(sql`date_trunc('day', ${analyticsEvents.createdAt})`)
    .orderBy(sql`date_trunc('day', ${analyticsEvents.createdAt})`);
  return rows.map((r) => ({ day: r.day, count: Number(r.count) }));
}

export async function recentActivity(organizationId: string, limit = 12) {
  return db
    .select()
    .from(analyticsEvents)
    .where(eq(analyticsEvents.organizationId, organizationId))
    .orderBy(desc(analyticsEvents.createdAt))
    .limit(limit);
}
