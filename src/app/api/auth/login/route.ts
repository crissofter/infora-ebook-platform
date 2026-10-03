import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { apiError, apiOk, clientIp, handler, parseBody, rateLimit } from "@/lib/api";
import { createSession, verifyPassword } from "@/lib/auth";
import { audit, logSystem } from "@/lib/logger";

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });

export const POST = handler(async (request) => {
  const ip = clientIp(request);
  if (!rateLimit(`login:${ip}`, 12, 60_000).allowed) {
    return apiError("Muitas tentativas de login. Aguarde um minuto.", 429);
  }

  const body = await parseBody(request, schema);
  const email = body.email.trim().toLowerCase();
  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = rows[0];

  if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
    await logSystem("warn", "auth", "tentativa de login inválida", { email, ip });
    return apiError("E-mail ou senha incorretos.", 401);
  }

  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  await createSession(user.id);
  await audit({ actorId: user.id, action: "auth.login", entity: "user", entityId: user.id, ip });

  return apiOk({ userId: user.id });
});
