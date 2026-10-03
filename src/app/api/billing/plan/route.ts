import { z } from "zod";
import { apiOk, handler, parseBody } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { changePlan, getUsage } from "@/lib/billing";
import { recordEvent } from "@/lib/analytics";
import { audit } from "@/lib/logger";

const schema = z.object({ planCode: z.enum(["FREE", "STARTER", "CREATOR", "PRO", "BUSINESS"]) });

export const POST = handler(async (request) => {
  const { organization, user, membershipRole } = await requireSession();
  if (membershipRole !== "OWNER" && membershipRole !== "ADMIN") {
    return apiOk({ changed: false, reason: "Somente administradores da organização podem alterar o plano." }, 403);
  }
  const { planCode } = await parseBody(request, schema);
  const previous = organization.planCode;
  const plan = await changePlan(organization.id, planCode);

  await recordEvent({
    organizationId: organization.id,
    userId: user.id,
    type: planCode === "FREE" ? "subscription_cancelled" : "subscription_started",
    metadata: { from: previous, to: planCode, gateway: "not_configured" },
  });
  await audit({ organizationId: organization.id, actorId: user.id, action: "billing.change_plan", metadata: { from: previous, to: planCode } });

  const usage = await getUsage(organization.id, planCode);
  return apiOk({
    plan,
    usage,
    notice: "Gateway de pagamento não configurado nesta instalação: a alteração foi registrada apenas na plataforma.",
  });
});
