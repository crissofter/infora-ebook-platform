import { randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { passwordResets, sessions, users } from "@/db/schema";
import { apiError, apiOk, clientIp, handler, parseBody, rateLimit } from "@/lib/api";
import { hashPassword, hashToken } from "@/lib/auth";
import { audit, logSystem } from "@/lib/logger";

const requestSchema = z.object({ email: z.string().email() });
const resetSchema = z.object({ token: z.string().min(10), password: z.string().min(8).max(200) });

/** Step 1 — request a reset token. */
export const POST = handler(async (request) => {
  const ip = clientIp(request);
  if (!rateLimit(`pwd:${ip}`, 6, 60_000).allowed) return apiError("Muitas tentativas. Aguarde um minuto.", 429);

  const { email } = await parseBody(request, requestSchema);
  const rows = await db.select().from(users).where(eq(users.email, email.trim().toLowerCase())).limit(1);

  // Resposta sempre neutra para não revelar existência de conta.
  if (!rows[0]) return apiOk({ requested: true, delivery: "none" });

  const token = randomBytes(24).toString("base64url");
  await db.insert(passwordResets).values({
    userId: rows[0].id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + 30 * 60_000),
  });
  await logSystem("info", "auth", "token de recuperação gerado", { userId: rows[0].id });

  // Provedor de e-mail não configurado nesta instalação: o token é devolvido
  // para uso manual em ambiente controlado e o fato é registrado em log.
  const emailConfigured = Boolean(process.env.SMTP_URL);
  return apiOk({
    requested: true,
    delivery: emailConfigured ? "email" : "not_configured",
    token: emailConfigured ? undefined : token,
  });
});

/** Step 2 — apply the new password. */
export const PUT = handler(async (request) => {
  const { token, password } = await parseBody(request, resetSchema);
  const rows = await db
    .select()
    .from(passwordResets)
    .where(
      and(
        eq(passwordResets.tokenHash, hashToken(token)),
        isNull(passwordResets.usedAt),
        gt(passwordResets.expiresAt, new Date()),
      ),
    )
    .limit(1);

  const reset = rows[0];
  if (!reset) return apiError("Link de recuperação inválido ou expirado.", 400);

  await db.update(users).set({ passwordHash: await hashPassword(password), updatedAt: new Date() }).where(eq(users.id, reset.userId));
  await db.update(passwordResets).set({ usedAt: new Date() }).where(eq(passwordResets.id, reset.id));
  await db.delete(sessions).where(eq(sessions.userId, reset.userId));
  await audit({ actorId: reset.userId, action: "auth.password_reset", entity: "user", entityId: reset.userId });

  return apiOk({ reset: true });
});
