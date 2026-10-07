import { and, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { passwordResets, sessions, users } from "@/db/schema";
import { apiError, apiOk, clientIp, handler, parseBody, rateLimit } from "@/lib/api";
import { hashPassword, hashToken } from "@/lib/auth";
import { audit } from "@/lib/logger";

const requestSchema = z.object({ email: z.string().email() });
const resetSchema = z.object({ token: z.string().min(10), password: z.string().min(8).max(200) });

/** Step 1 — request a reset token. */
export const POST = handler(async (request) => {
  const ip = clientIp(request);
  if (!rateLimit(`pwd:${ip}`, 6, 60_000).allowed) return apiError("Muitas tentativas. Aguarde um minuto.", 429);

  await parseBody(request, requestSchema);
  // Never return account recovery credentials over a public endpoint. Merely
  // setting SMTP_URL does not implement delivery; fail closed until it exists.
  return apiError("Recuperação por e-mail indisponível nesta instalação. Entre em contato com o suporte.", 503, "EMAIL_DELIVERY_NOT_CONFIGURED");
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
