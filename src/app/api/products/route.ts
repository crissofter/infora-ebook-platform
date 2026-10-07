import { randomBytes } from "node:crypto";
import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { assets, chapters, productVersions, products, projects } from "@/db/schema";
import { apiError, apiOk, handler, parseBody, rateLimit } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { getPlan } from "@/lib/billing";
import { CreditError, generateBlueprint } from "@/lib/ai/engine";
import { notify, recordEvent } from "@/lib/analytics";
import { audit } from "@/lib/logger";
import { buildCoverSvg, ensureDefaultProject, PRODUCT_TYPES } from "@/lib/products";
import { uniqueSlug } from "@/lib/slug";

const schema = z.object({
  projectId: z.string().uuid().optional(),
  type: z.enum(PRODUCT_TYPES),
  idea: z.string().min(10).max(600),
  audience: z.string().min(3).max(240),
  objective: z.string().min(3).max(240),
  problem: z.string().min(3).max(400),
  designStyle: z.string().max(30).optional(),
  generate: z.boolean().default(true),
});

export const GET = handler(async () => {
  const { organization } = await requireSession();
  const rows = await db
    .select()
    .from(products)
    .where(eq(products.organizationId, organization.id))
    .orderBy(desc(products.updatedAt));
  return apiOk(rows);
});

export const POST = handler(async (request) => {
  const { organization, user } = await requireSession();
  if (!rateLimit(`product:${organization.id}`, 20, 60_000).allowed) {
    return apiError("Muitas criações em sequência. Aguarde um instante.", 429);
  }

  const body = await parseBody(request, schema);
  const plan = await getPlan(organization.planCode);

  const count = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(products)
    .where(eq(products.organizationId, organization.id));
  if (Number(count[0]?.n ?? 0) >= plan.maxProducts) {
    return apiError(`Seu plano ${plan.name} permite ${plan.maxProducts} produto(s). Faça upgrade para criar mais.`, 402, "PLAN_LIMIT");
  }

  const project = body.projectId
    ? (await db.select().from(projects).where(eq(projects.id, body.projectId)).limit(1))[0]
    : await ensureDefaultProject(organization.id, user.id);

  if (!project || project.organizationId !== organization.id) {
    return apiError("Projeto não encontrado no seu workspace.", 403);
  }

  const provisionalTitle = body.idea.slice(0, 70);
  const created = await db
    .insert(products)
    .values({
      organizationId: organization.id,
      projectId: project.id,
      createdBy: user.id,
      type: body.type,
      title: provisionalTitle,
      slug: uniqueSlug(provisionalTitle, randomBytes(4).toString("hex")),
      idea: body.idea,
      audience: body.audience,
      objective: body.objective,
      problem: body.problem,
      designStyle: body.designStyle ?? "PREMIUM",
      status: "IN_PRODUCTION",
    })
    .returning();
  const product = created[0];
  const cover = buildCoverSvg({ title: product.title, subtitle: product.subtitle, author: user.name, style: product.designStyle, palette: product.coverPalette });
  await db.insert(assets).values({ organizationId: organization.id, productId: product.id, kind: "COVER", format: "svg", name: `${product.slug}-cover.svg`, payload: cover, sizeBytes: Buffer.byteLength(cover) });

  await recordEvent({ organizationId: organization.id, userId: user.id, productId: product.id, type: "product_created" });
  await audit({ organizationId: organization.id, actorId: user.id, action: "product.create", entity: "product", entityId: product.id });

  if (!body.generate) return apiOk({ product, generated: false }, 201);

  try {
    const { result, provider } = await generateBlueprint(
      { organizationId: organization.id, userId: user.id, planCode: organization.planCode, productId: product.id },
      { idea: body.idea, audience: body.audience, objective: body.objective, problem: body.problem, type: body.type },
    );

    await db
      .update(products)
      .set({
        title: result.title.slice(0, 160),
        subtitle: result.subtitle?.slice(0, 200) ?? null,
        promise: result.promise ?? null,
        concept: result.concept ?? null,
        audience: result.audience || body.audience,
        updatedAt: new Date(),
      })
      .where(eq(products.id, product.id));

    await db.insert(chapters).values(
      result.chapters.map((c, i) => ({
        organizationId: organization.id,
        productId: product.id,
        position: i,
        title: c.title.slice(0, 200),
        summary: c.summary ?? null,
        content: c.content ?? "",
        kind: c.kind ?? "CHAPTER",
        status: "GENERATED",
      })),
    );

    await db.insert(productVersions).values({
      organizationId: organization.id,
      productId: product.id,
      version: 1,
      label: "Blueprint inicial",
      snapshot: result,
      createdBy: user.id,
    });
    const generatedCover = buildCoverSvg({ title: result.title, subtitle: result.subtitle, author: user.name, style: product.designStyle, palette: product.coverPalette });
    await db.insert(assets).values({ organizationId: organization.id, productId: product.id, kind: "COVER", format: "svg", name: `${product.slug}-cover.svg`, payload: generatedCover, sizeBytes: Buffer.byteLength(generatedCover) });

    await notify({
      organizationId: organization.id,
      userId: user.id,
      title: "Blueprint gerado",
      body: `A estrutura de "${result.title}" está pronta para revisão.`,
      level: "SUCCESS",
    });

    return apiOk({ product: { ...product, title: result.title }, generated: true, provider }, 201);
  } catch (error) {
    if (error instanceof CreditError) {
      return apiError(
        `Créditos insuficientes: esta operação consome ${error.creditsNeeded} créditos e você tem ${error.creditsLeft}. O produto foi criado como rascunho.`,
        402,
        "NO_CREDITS",
      );
    }
    throw error;
  }
});
