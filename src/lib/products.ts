import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { chapters, products, projects, salesPages } from "@/db/schema";
import { AuthError } from "@/lib/auth";

/** Loads a product guaranteeing it belongs to the caller's organization. */
export async function getOwnedProduct(productId: string, organizationId: string) {
  const rows = await db
    .select()
    .from(products)
    .where(and(eq(products.id, productId), eq(products.organizationId, organizationId)))
    .limit(1);
  const product = rows[0];
  if (!product) {
    const err = new AuthError("PRODUCT_NOT_FOUND");
    err.status = 403;
    throw err;
  }
  return product;
}

export async function getProductChapters(productId: string, organizationId: string) {
  return db
    .select()
    .from(chapters)
    .where(and(eq(chapters.productId, productId), eq(chapters.organizationId, organizationId)))
    .orderBy(asc(chapters.position));
}

export async function getSalesPage(productId: string, organizationId: string) {
  const rows = await db
    .select()
    .from(salesPages)
    .where(and(eq(salesPages.productId, productId), eq(salesPages.organizationId, organizationId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function ensureDefaultProject(organizationId: string, userId: string) {
  const rows = await db.select().from(projects).where(eq(projects.organizationId, organizationId)).limit(1);
  if (rows[0]) return rows[0];
  const created = await db
    .insert(projects)
    .values({ organizationId, createdBy: userId, name: "Meu primeiro projeto", description: "Projeto inicial criado automaticamente." })
    .returning();
  return created[0];
}

export const PRODUCT_TYPES = ["EBOOK", "GUIDE", "PLANNER", "TEMPLATE", "COURSE", "BUNDLE"] as const;
export const DESIGN_STYLES = ["PREMIUM", "MINIMALISTA", "MODERNO", "ELEGANTE", "EDITORIAL", "CORPORATIVO", "CRIATIVO"] as const;

export { PALETTES, buildCoverSvg } from "./design";
