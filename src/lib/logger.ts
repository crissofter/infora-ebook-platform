import "server-only";
import { db } from "@/db";
import { auditLogs, systemLogs } from "@/db/schema";

type Level = "info" | "warn" | "error";

/** Persist an observability log. Never throws — logging must not break the request. */
export async function logSystem(
  level: Level,
  scope: string,
  message: string,
  metadata?: Record<string, unknown>,
  ctx?: { organizationId?: string | null; userId?: string | null },
) {
  try {
    // eslint-disable-next-line no-console
    console[level === "error" ? "error" : "log"](`[infora:${scope}] ${message}`);
    await db.insert(systemLogs).values({
      level,
      scope,
      message: message.slice(0, 1000),
      metadata: metadata ?? null,
      organizationId: ctx?.organizationId ?? null,
      userId: ctx?.userId ?? null,
    });
  } catch {
    /* swallow */
  }
}

export async function audit(params: {
  organizationId?: string | null;
  actorId?: string | null;
  action: string;
  entity?: string;
  entityId?: string;
  ip?: string | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    await db.insert(auditLogs).values({
      organizationId: params.organizationId ?? null,
      actorId: params.actorId ?? null,
      action: params.action,
      entity: params.entity ?? null,
      entityId: params.entityId ?? null,
      ip: params.ip ?? null,
      metadata: params.metadata ?? null,
    });
  } catch {
    /* swallow */
  }
}
