import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { memberships, organizations, users } from "@/db/schema";
import { apiError, apiOk, clientIp, handler, parseBody, rateLimit } from "@/lib/api";
import { createSession, hashPassword } from "@/lib/auth";
import { ensurePlans, ensureSubscription, getUsage } from "@/lib/billing";
import { audit, logSystem } from "@/lib/logger";
import { notify, recordEvent } from "@/lib/analytics";
import { uniqueSlug } from "@/lib/slug";

const schema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(180),
  password: z.string().min(8).max(200),
  goal: z.string().max(200).optional(),
  creatorType: z.string().max(80).optional(),
  organizationName: z.string().max(120).optional(),
  acceptTerms: z.boolean(),
});

export const POST = handler(async (request) => {
  const ip = clientIp(request);
  if (!rateLimit(`signup:${ip}`, 10, 60_000).allowed) {
    return apiError("Muitas tentativas. Aguarde um minuto e tente novamente.", 429);
  }

  const body = await parseBody(request, schema);
  if (!body.acceptTerms) return apiError("É necessário aceitar os Termos de Uso e a Política de Privacidade.", 422);

  const email = body.email.trim().toLowerCase();
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing[0]) return apiError("Este e-mail já está cadastrado. Tente entrar na sua conta.", 409);

  await ensurePlans();

  const passwordHash = await hashPassword(body.password);
  const isFirstUser = (await db.select({ id: users.id }).from(users).limit(1)).length === 0;

  const created = await db
    .insert(users)
    .values({
      email,
      name: body.name.trim(),
      passwordHash,
      goal: body.goal ?? null,
      creatorType: body.creatorType ?? null,
      role: isFirstUser ? "SUPER_ADMIN" : "USER",
      emailVerifiedAt: new Date(), // verificação por e-mail: pendente de provedor SMTP
    })
    .returning();
  const user = created[0];

  const orgName = body.organizationName?.trim() || `${body.name.split(" ")[0]} Workspace`;
  const org = (
    await db
      .insert(organizations)
      .values({ name: orgName, slug: uniqueSlug(orgName, randomBytes(4).toString("hex")), ownerId: user.id, planCode: "FREE" })
      .returning()
  )[0];

  await db.insert(memberships).values({ userId: user.id, organizationId: org.id, role: "OWNER" });
  await ensureSubscription(org.id, "FREE");
  await getUsage(org.id, "FREE");
  await createSession(user.id);

  await notify({
    organizationId: org.id,
    userId: user.id,
    title: "Bem-vindo à INFORA",
    body: "Sua conta foi criada. O próximo passo é transformar uma ideia em produto.",
    level: "SUCCESS",
  });
  await recordEvent({ organizationId: org.id, userId: user.id, type: "subscription_started", source: "signup" });
  await audit({ organizationId: org.id, actorId: user.id, action: "auth.signup", entity: "user", entityId: user.id, ip });
  await logSystem("info", "auth", "novo usuário cadastrado", { email }, { organizationId: org.id, userId: user.id });

  return apiOk({ userId: user.id, organizationId: org.id });
});
