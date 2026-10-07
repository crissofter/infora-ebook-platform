import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { socialAccounts } from "@/db/schema";
import { apiError, apiOk, handler, parseBody } from "@/lib/api";
import { connectedMeta, graphRequest, requireMetaAdmin } from "@/lib/meta";

type MetaPage = { id: string; name: string; instagram_business_account?: { id: string; username?: string } };
type MetaAdAccount = { id: string; name: string; account_status: number; currency: string };

async function choices(token: string) {
  const [pages, accounts] = await Promise.all([
    graphRequest("me/accounts", token, { fields: "id,name,instagram_business_account{id,username}", limit: "100" }),
    graphRequest("me/adaccounts", token, { fields: "id,name,account_status,currency", limit: "100" }),
  ]);
  return { pages: (pages.data ?? []) as MetaPage[], accounts: (accounts.data ?? []) as MetaAdAccount[] };
}

export const GET = handler(async () => {
  const { organization } = await requireMetaAdmin();
  try {
    const { token } = await connectedMeta(organization.id);
    return apiOk(await choices(token));
  } catch (e) { return apiError((e as Error).message, 409); }
});

export const POST = handler(async (request) => {
  const { organization } = await requireMetaAdmin();
  const body = await parseBody(request, z.object({ pageId: z.string().regex(/^\d+$/), adAccountId: z.string().regex(/^act_\d+$/) }));
  try {
    const { token } = await connectedMeta(organization.id);
    const available = await choices(token);
    const page = available.pages.find((p) => p.id === body.pageId);
    const adAccount = available.accounts.find((a) => a.id === body.adAccountId && a.account_status === 1);
    if (!page || !adAccount) return apiError("Escolha uma Página e uma conta de anúncios ativa autorizadas na sua conexão.", 422);
    await db.transaction(async (tx) => {
      for (const account of [
        { provider: "FACEBOOK", externalId: page.id, displayName: page.name },
        { provider: "META_ADS", externalId: adAccount.id, displayName: `${adAccount.name} (${adAccount.currency})` },
        { provider: "INSTAGRAM", externalId: page.instagram_business_account?.id ?? null, displayName: page.instagram_business_account?.username ?? null },
      ]) {
        const values = { ...account, status: account.externalId ? "CONNECTED" : "NOT_CONFIGURED", connectedAt: new Date() };
        await tx.insert(socialAccounts).values({ organizationId: organization.id, ...values }).onConflictDoUpdate({ target: [socialAccounts.organizationId, socialAccounts.provider], set: values });
      }
    });
    return apiOk({ saved: true, instagramConnected: !!page.instagram_business_account });
  } catch (e) { return apiError((e as Error).message, 409); }
});

export const DELETE = handler(async () => {
  const { organization } = await requireMetaAdmin();
  await db.delete(socialAccounts).where(and(eq(socialAccounts.organizationId, organization.id), inArray(socialAccounts.provider, ["META", "META_ADS", "FACEBOOK", "INSTAGRAM"])));
  return apiOk({ disconnected: true, notice: "A conexão foi removida da INFORA. Campanhas existentes na Meta permanecem no Gerenciador de Anúncios." });
});
