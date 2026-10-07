import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { assets, chapterBlocks, chapters } from "@/db/schema";
import { apiError, apiOk, handler, rateLimit } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { getOwnedProduct } from "@/lib/products";
import { imageFormat, MAX_IMAGE_BYTES } from "@/lib/media";

export const POST = handler(async (request, ctx) => {
  const { organization } = await requireSession();
  const { id } = await ctx.params;
  await getOwnedProduct(id, organization.id);
  if (!rateLimit(`images:${organization.id}`, 30, 60_000).allowed) return apiError("Aguarde um instante antes de enviar outra imagem.", 429);
  if (Number(request.headers.get("content-length")) > MAX_IMAGE_BYTES + 16384) return apiError("Use uma imagem de até 3 MB.", 413);
  let form: FormData;
  try { form = await request.formData(); } catch { return apiError("Envie a imagem como arquivo.", 422); }
  const file = form.get("file");
  const kind = form.get("kind");
  const chapterId = form.get("chapterId");
  if (!(file instanceof File) || !["COVER", "CHAPTER"].includes(String(kind))) return apiError("Selecione uma capa ou imagem de capítulo.", 422);
  if (!file.size || file.size > MAX_IMAGE_BYTES) return apiError("Use uma imagem de até 3 MB.", 413);
  if (kind === "CHAPTER") {
    if (typeof chapterId !== "string" || !/^[0-9a-f-]{36}$/i.test(chapterId)) return apiError("Selecione o capítulo.", 422);
    const [chapter] = await db.select({ id: chapters.id }).from(chapters).where(and(eq(chapters.id, chapterId), eq(chapters.productId, id), eq(chapters.organizationId, organization.id))).limit(1);
    if (!chapter) return apiError("Capítulo não encontrado no seu workspace.", 403);
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const format = imageFormat(bytes);
  if (!format) return apiError("Envie uma imagem PNG, JPEG ou WebP válida.", 422);
  const caption = String(form.get("caption") ?? "").trim().slice(0, 600);
  const image = await db.transaction(async (tx) => {
    const [asset] = await tx.insert(assets).values({ organizationId: organization.id, productId: id, kind: kind === "COVER" ? "COVER" : "UPLOAD", format, name: file.name.replace(/[^\p{L}\p{N}._ -]/gu, "").slice(0, 160) || `imagem.${format}`, payload: bytes.toString("base64"), sizeBytes: bytes.length }).returning({ id: assets.id, name: assets.name });
    if (kind === "COVER") {
      // Retain previous covers: an older cover may also be referenced by a chapter.
      return { ...asset, url: `/api/assets/${asset.id}` };
    }
    const [last] = await tx.select({ n: sql<number>`coalesce(max(${chapterBlocks.position}), -1)::int` }).from(chapterBlocks).where(and(eq(chapterBlocks.chapterId, String(chapterId)), eq(chapterBlocks.organizationId, organization.id)));
    const [block] = await tx.insert(chapterBlocks).values({ organizationId: organization.id, chapterId: String(chapterId), type: "IMAGE", assetId: asset.id, position: last.n + 1, content: caption }).returning({ id: chapterBlocks.id });
    return { id: block.id, assetId: asset.id, name: asset.name, url: `/api/assets/${asset.id}`, chapterId, caption };
  });
  return apiOk(image, 201);
});
