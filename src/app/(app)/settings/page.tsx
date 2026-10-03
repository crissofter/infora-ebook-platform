import { requireSession } from "@/lib/auth";
import { providerStatus } from "@/lib/ai/provider";
import { SettingsClient } from "./client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { user, organization, membershipRole } = await requireSession();
  const ai = providerStatus();

  return (
    <SettingsClient
      user={{ name: user.name, email: user.email, goal: user.goal, creatorType: user.creatorType, role: user.role }}
      organization={{ name: organization.name, slug: organization.slug, planCode: organization.planCode, role: membershipRole }}
      integrations={{
        ai: ai.configured ? `${ai.provider} · ${ai.model}` : "Integration not configured (motor local de composição)",
        payments: process.env.PAYMENT_PROVIDER ?? "Integration not configured",
        email: process.env.SMTP_URL ? "SMTP configurado" : "Integration not configured",
        social: process.env.META_APP_ID ? "Meta app configurado" : "Integration not configured",
        storage: process.env.STORAGE_BUCKET ?? "Armazenamento local no banco (driver db)",
      }}
    />
  );
}
