import { requireSession } from "@/lib/auth";
import { providerStatus } from "@/lib/ai/provider";
import { SettingsClient } from "./client";
import { metaConfig } from "@/lib/meta";

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
        images: process.env.IMAGE_API_KEY || process.env.OPENAI_API_KEY ? "Geração de imagens por IA configurada" : "Não configurada — defina IMAGE_API_KEY na hospedagem",
        payments: process.env.PAYMENT_PROVIDER ?? "Integration not configured",
        email: "Recuperação por e-mail ainda não integrada",
        social: metaConfig() ? "Aplicativo Meta configurado — conecte sua conta em Marketing" : "Aplicativo Meta não configurado — consulte a configuração de integrações",
        storage: process.env.STORAGE_BUCKET ?? "Armazenamento local no banco (driver db)",
      }}
    />
  );
}
