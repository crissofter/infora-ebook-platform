import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { assets, campaigns, contentItems, salesPages } from "@/db/schema";
import { apiError, apiOk, handler, parseBody, rateLimit } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { CreditError, generateMarketingPack, generateSalesPage } from "@/lib/ai/engine";
import { notify, recordEvent } from "@/lib/analytics";
import { audit } from "@/lib/logger";
import { buildCoverSvg, getOwnedProduct, getProductChapters, getSalesPage } from "@/lib/products";

const schema = z.object({ kind: z.enum(["sales_page", "marketing", "cover"]) });

export const POST = handler(async (request, ctx) => {
  const { organization, user } = await requireSession();
  const { id } = await ctx.params;
  const product = await getOwnedProduct(id, organization.id);
  const { kind } = await parseBody(request, schema);

  if (!rateLimit(`gen:${organization.id}`, 30, 60_000).allowed) {
    return apiError("Muitas gerações em sequência. Aguarde um instante.", 429);
  }

  const aiCtx = { organizationId: organization.id, userId: user.id, planCode: organization.planCode, productId: product.id };

  try {
    if (kind === "cover") {
      const svg = buildCoverSvg({
        title: product.title,
        subtitle: product.subtitle,
        author: user.name,
        style: product.designStyle,
        palette: product.coverPalette,
      });
      await db
        .delete(assets)
        .where(and(eq(assets.productId, product.id), eq(assets.kind, "COVER"), eq(assets.organizationId, organization.id)));
      const created = await db
        .insert(assets)
        .values({
          organizationId: organization.id,
          productId: product.id,
          kind: "COVER",
          format: "svg",
          name: `${product.slug}-cover.svg`,
          payload: svg,
          sizeBytes: Buffer.byteLength(svg),
        })
        .returning();
      await audit({ organizationId: organization.id, actorId: user.id, action: "product.cover", entity: "product", entityId: product.id });
      return apiOk({ asset: created[0] });
    }

    if (kind === "sales_page") {
      const chs = await getProductChapters(product.id, organization.id);
      const { result, provider } = await generateSalesPage(aiCtx, {
        title: product.title,
        subtitle: product.subtitle,
        audience: product.audience,
        problem: product.problem,
        objective: product.objective,
        promise: product.promise,
        chapters: chs.map((c) => ({ title: c.title, summary: c.summary })),
      });

      const existing = await getSalesPage(product.id, organization.id);
      const values = {
        organizationId: organization.id,
        productId: product.id,
        headline: result.headline,
        subheadline: result.subheadline,
        problem: result.problem,
        solution: result.solution,
        benefits: result.benefits ?? [],
        contents: result.contents ?? [],
        differentials: result.differentials ?? [],
        bonuses: result.bonuses ?? [],
        faq: result.faq ?? [],
        guarantee: result.guarantee ?? null,
        ctaLabel: result.ctaLabel ?? "Quero agora",
        updatedAt: new Date(),
      };
      const saved = existing
        ? await db.update(salesPages).set(values).where(eq(salesPages.id, existing.id)).returning()
        : await db.insert(salesPages).values(values).returning();

      await notify({ organizationId: organization.id, userId: user.id, title: "Página de vendas gerada", body: product.title, level: "SUCCESS" });
      return apiOk({ salesPage: saved[0], provider });
    }

    // marketing
    const { result, provider } = await generateMarketingPack(aiCtx, {
      title: product.title,
      audience: product.audience,
      promise: product.promise,
    });

    let campaign = (
      await db
        .select()
        .from(campaigns)
        .where(and(eq(campaigns.productId, product.id), eq(campaigns.organizationId, organization.id)))
        .limit(1)
    )[0];
    if (!campaign) {
      campaign = (
        await db
          .insert(campaigns)
          .values({
            organizationId: organization.id,
            productId: product.id,
            name: `Lançamento — ${product.title}`.slice(0, 120),
            objective: product.objective,
            status: "ACTIVE",
          })
          .returning()
      )[0];
      await recordEvent({ organizationId: organization.id, userId: user.id, productId: product.id, campaignId: campaign.id, type: "campaign_created" });
    }

    const baseDate = Date.now();
    const inserted = await db
      .insert(contentItems)
      .values(
        result.items.slice(0, 20).map((item, i) => ({
          organizationId: organization.id,
          campaignId: campaign.id,
          productId: product.id,
          channel: item.channel,
          format: item.format,
          title: item.title.slice(0, 200),
          body: item.body,
          cta: item.cta ?? null,
          status: "DRAFT",
          scheduledFor: new Date(baseDate + (i + 1) * 864e5),
        })),
      )
      .returning();

    await notify({ organizationId: organization.id, userId: user.id, title: "Conteúdo promocional gerado", body: `${inserted.length} itens adicionados ao calendário.`, level: "SUCCESS" });
    return apiOk({ campaign, items: inserted, provider });
  } catch (error) {
    if (error instanceof CreditError) {
      return apiError(
        `Créditos insuficientes: esta operação consome ${error.creditsNeeded} créditos e restam ${error.creditsLeft} no período.`,
        402,
        "NO_CREDITS",
      );
    }
    throw error;
  }
});
