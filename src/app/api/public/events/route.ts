import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { customers, orderItems, orders, payments, products } from "@/db/schema";
import { apiError, apiOk, clientIp, handler, parseBody, rateLimit } from "@/lib/api";
import { notify, recordEvent } from "@/lib/analytics";

const schema = z.object({
  slug: z.string().min(2).max(120),
  type: z.enum(["page_view", "cta_clicked", "checkout_started", "lead_created"]),
  source: z.string().max(120).optional(),
  email: z.string().email().optional(),
});

/** Public endpoint used by published sales pages to record real events. */
export const POST = handler(async (request) => {
  const ip = clientIp(request);
  if (!rateLimit(`pub:${ip}`, 120, 60_000).allowed) return apiError("Muitas requisições.", 429);

  const body = await parseBody(request, schema);
  const rows = await db.select().from(products).where(eq(products.slug, body.slug)).limit(1);
  const product = rows[0];
  if (!product || product.status !== "PUBLISHED") return apiOk({ recorded: false });

  await recordEvent({
    organizationId: product.organizationId,
    productId: product.id,
    type: body.type,
    source: body.source ?? "sales_page",
  });

  if (body.type === "lead_created" && body.email) {
    await db
      .insert(customers)
      .values({ organizationId: product.organizationId, email: body.email, source: "sales_page" });
    await notify({
      organizationId: product.organizationId,
      title: "Novo lead capturado",
      body: `${body.email} demonstrou interesse em ${product.title}.`,
      level: "INFO",
    });
  }

  if (body.type === "checkout_started") {
    // Gateway de pagamento não configurado: o pedido fica PENDING e nenhuma
    // venda é simulada. O registro permite conectar o gateway depois.
    const order = (
      await db
        .insert(orders)
        .values({
          organizationId: product.organizationId,
          productId: product.id,
          status: "PENDING",
          totalCents: product.priceCents,
          currency: product.currency,
        })
        .returning()
    )[0];
    await db.insert(orderItems).values({
      orderId: order.id,
      productId: product.id,
      description: product.title,
      quantity: 1,
      unitPriceCents: product.priceCents,
    });
    await db.insert(payments).values({
      organizationId: product.organizationId,
      orderId: order.id,
      provider: "none",
      status: "AWAITING_GATEWAY",
      amountCents: product.priceCents,
    });
    return apiOk({ recorded: true, checkout: "gateway_not_configured", orderId: order.id });
  }

  return apiOk({ recorded: true });
});
