import "server-only";
import { randomBytes, scrypt as _scrypt, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
import { cookies, headers } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { memberships, organizations, sessions, users } from "@/db/schema";

const scrypt = promisify(_scrypt) as (p: string, s: Buffer, k: number) => Promise<Buffer>;

export const SESSION_COOKIE = "infora_session";
const SESSION_TTL_DAYS = 14;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const derived = await scrypt(password, Buffer.from(saltHex, "hex"), 64);
  const expected = Buffer.from(hashHex, "hex");
  if (expected.length !== derived.length) return false;
  return timingSafeEqual(derived, expected);
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const hdrs = await headers();
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 864e5);
  await db.insert(sessions).values({
    userId,
    tokenHash: hashToken(token),
    userAgent: hdrs.get("user-agent")?.slice(0, 250) ?? null,
    ip: hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    expiresAt,
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
  return token;
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  }
  jar.delete(SESSION_COOKIE);
}

export type SessionContext = {
  user: typeof users.$inferSelect;
  organization: typeof organizations.$inferSelect;
  membershipRole: string;
};

/** Returns the authenticated context or null. Never throws. */
export async function getSession(): Promise<SessionContext | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const rows = await db
    .select({ user: users, session: sessions })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  const orgRows = await db
    .select({ org: organizations, role: memberships.role })
    .from(memberships)
    .innerJoin(organizations, eq(organizations.id, memberships.organizationId))
    .where(eq(memberships.userId, row.user.id))
    .limit(1);

  const orgRow = orgRows[0];
  if (!orgRow) return null;

  return { user: row.user, organization: orgRow.org, membershipRole: orgRow.role };
}

export class AuthError extends Error {
  status = 401;
}

export async function requireSession(): Promise<SessionContext> {
  const ctx = await getSession();
  if (!ctx) throw new AuthError("NOT_AUTHENTICATED");
  return ctx;
}

export function isPlatformAdmin(role: string) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export async function requireAdmin(): Promise<SessionContext> {
  const ctx = await requireSession();
  if (!isPlatformAdmin(ctx.user.role)) {
    const err = new AuthError("FORBIDDEN");
    err.status = 403;
    throw err;
  }
  return ctx;
}
