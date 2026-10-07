import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { campaigns, products, salesPages, socialAccounts } from "@/db/schema";
import { apiError, apiOk, handler, parseBody, rateLimit } from "@/lib/api";
import { connectedMeta, graphRequest, requireMetaAdmin } from "@/lib/meta";
import { audit } from "@/lib/logger";
import { pausedCampaignPayload } from "@/lib/meta-security";

export const POST = handler(async (request) => {
  const { organization, user } = await requireMetaAdmin();
  const body = await parseBody(request, z.object({ campaignId: z.uuid(), confirmPaused: z.literal(true) }));
  if (!rateLimit(`meta-campaign:${organization.id}`, 5, 60_000).allowed) return apiError("Aguarde um minuto antes de criar outra campanha.", 429);
  try {
    const { token } = await connectedMeta(organization.id);
    const [adAccount] = await db.select().from(socialAccounts).where(and(eq(socialAccounts.organizationId, organization.id), eq(socialAccounts.provider, "META_ADS"), eq(socialAccounts.status, "CONNECTED"))).limit(1);
    if (!adAccount?.externalId) return apiError("Escolha a conta de anúncios na conexão Meta.", 409);
    const result = await db.transaction(async (tx) => {
      const [campaign] = await tx.select().from(campaigns).where(and(eq(campaigns.id, body.campaignId), eq(campaigns.organizationId, organization.id))).limit(1).for("update");
      if (!campaign?.productId) throw new Error("Campanha não encontrada no seu workspace.");
      if (campaign.metaCampaignId) return { campaignId: campaign.metaCampaignId, alreadyCreated: true };
      const [page] = await tx.select({ id: products.id }).from(products).innerJoin(salesPages, eq(salesPages.productId, products.id)).where(and(eq(products.id, campaign.productId), eq(products.organizationId, organization.id), eq(products.status, "PUBLISHED"), eq(salesPages.published, true))).limit(1);
      if (!page) throw new Error("Publique a página de vendas antes de preparar o anúncio.");
      // Deliberately no budget, ad sets, ad creatives or activation: nothing can spend.
      const created = await graphRequest(`${adAccount.externalId}/campaigns`, token, pausedCampaignPayload(campaign.name), "POST");
      if (!created.id) throw new Error("A Meta não confirmou a criação. Confira o Gerenciador antes de tentar novamente.");
      await tx.update(campaigns).set({ metaCampaignId: created.id, updatedAt: new Date() }).where(eq(campaigns.id, campaign.id));
      return { campaignId: String(created.id), alreadyCreated: false };
    });
    await audit({ organizationId: organization.id, actorId: user.id, action: "meta.campaign.paused", entity: "campaign", entityId: body.campaignId, metadata: result });
    return apiOk({ ...result, status: "PAUSED", managerUrl: `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${adAccount.externalId.replace("act_", "")}` });
  } catch (e) { return apiError((e as Error).message, 409); }
});
