import { db } from "@/db";
import { assets } from "@/db/schema";
import { apiOk, handler } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { notify, recordEvent } from "@/lib/analytics";
import { audit } from "@/lib/logger";
import { getOwnedProduct, getProductChapters } from "@/lib/products";

/** Registers an export run. The document itself is rendered by /produtos/[id]/export. */
export const POST = handler(async (_request, ctx) => {
  const { organization, user } = await requireSession();
  const { id } = await ctx.params;
  const product = await getOwnedProduct(id, organization.id);
  const chs = await getProductChapters(id, organization.id);

  const created = await db
    .insert(assets)
    .values({
      organizationId: organization.id,
      productId: product.id,
      kind: "EXPORT",
      format: "pdf",
      name: `${product.slug}.pdf`,
      storageDriver: "browser-print",
      url: `/products/${product.id}/export`,
    })
    .returning();

  await recordEvent({
    organizationId: organization.id,
    userId: user.id,
    productId: product.id,
    type: "product_exported",
    metadata: { chapters: chs.length },
  });
  await notify({ organizationId: organization.id, userId: user.id, title: "Exportação concluída", body: `${product.title} pronto para download.`, level: "SUCCESS" });
  await audit({ organizationId: organization.id, actorId: user.id, action: "product.export", entity: "product", entityId: product.id });

  return apiOk({ asset: created[0], chapters: chs.length });
});
