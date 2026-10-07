import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { assets, chapterBlocks, chapters } from "@/db/schema";
import { apiError, apiOk, handler, parseBody, rateLimit } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { getOwnedProduct } from "@/lib/products";
import { generateIllustration } from "@/lib/ai/images";

export const maxDuration = 120;
const schema = z.object({ kind: z.enum(["COVER", "CHAPTER"]), chapterId: z.uuid().optional(), prompt: z.string().trim().min(10).max(1600) });

export const POST = handler(async (request, ctx) => {
  const { organization } = await requireSession();
  const { id } = await ctx.params;
  const product = await getOwnedProduct(id, organization.id);
  const body = await parseBody(request, schema);
  let chapter: typeof chapters.$inferSelect | undefined;
  if (body.kind === "CHAPTER") {
    if (!body.chapterId) return apiError("Selecione o capítulo.", 422);
    [chapter] = await db.select().from(chapters).where(and(eq(chapters.id, body.chapterId), eq(chapters.productId, id), eq(chapters.organizationId, organization.id))).limit(1);
    if (!chapter) return apiError("Capítulo não encontrado no seu workspace.", 403);
  }
  const apiKey = process.env.IMAGE_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) return apiError("Geração de imagens não configurada. Configure IMAGE_API_KEY na hospedagem para usar imagens por IA.", 503, "IMAGE_PROVIDER_NOT_CONFIGURED");
  if (!rateLimit(`image-ai:${organization.id}`, 5, 60_000).allowed) return apiError("Aguarde um minuto antes de gerar outra imagem.", 429);
  const prompt = `Crie uma imagem editorial para o ebook "${product.title}". Público: ${product.audience ?? "leitores"}. Estilo: ${product.designStyle}; paleta: ${product.coverPalette}. ${chapter ? `Ilustração para o capítulo "${chapter.title}". Contexto: ${chapter.summary ?? ""}.` : `Capa vertical. Inclua o título legível: ${product.title}.`} Direção artística do autor: ${body.prompt}. Não inclua marcas de terceiros, depoimentos ou estatísticas inventadas.`;
  let generated;
  try {
    generated = await generateIllustration({ apiKey, model: process.env.IMAGE_MODEL || "gpt-image-1", prompt, cover: body.kind === "COVER" });
  } catch (e) { return apiError(e instanceof Error ? e.message : "O provedor não concluiu a imagem. Tente novamente.", 502); }
  const { bytes, format } = generated;
  const image = await db.transaction(async (tx) => {
    const [asset] = await tx.insert(assets).values({ organizationId: organization.id, productId: id, kind: body.kind === "COVER" ? "COVER" : "UPLOAD", format, name: `${product.slug}-${body.kind.toLowerCase()}.${format}`, payload: bytes.toString("base64"), sizeBytes: bytes.length }).returning({ id: assets.id, name: assets.name });
    if (!chapter) return { ...asset, url: `/api/assets/${asset.id}` };
    const [last] = await tx.select({ n: sql<number>`coalesce(max(${chapterBlocks.position}), -1)::int` }).from(chapterBlocks).where(and(eq(chapterBlocks.chapterId, chapter.id), eq(chapterBlocks.organizationId, organization.id)));
    const [block] = await tx.insert(chapterBlocks).values({ organizationId: organization.id, chapterId: chapter.id, assetId: asset.id, type: "IMAGE", content: body.prompt.slice(0, 600), position: last.n + 1 }).returning({ id: chapterBlocks.id });
    return { id: block.id, assetId: asset.id, name: asset.name, url: `/api/assets/${asset.id}`, chapterId: chapter.id, caption: body.prompt.slice(0, 600) };
  });
  return apiOk(image, 201);
});
