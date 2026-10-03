import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { aiGenerations, aiUsage } from "@/db/schema";
import { consumeCredits, periodKey } from "@/lib/billing";
import { logSystem } from "@/lib/logger";
import { recordEvent } from "@/lib/analytics";
import { resolveProvider } from "./provider";
import { localBlueprint, localMarketingPack, localSalesPage, type IdeaInput } from "./local";
import { CREDIT_COST, type AIOperation, type Blueprint, type MarketingPack, type SalesPageDraft } from "./types";

export class CreditError extends Error {
  constructor(public creditsNeeded: number, public creditsLeft: number) {
    super("INSUFFICIENT_CREDITS");
  }
}

type RunCtx = {
  organizationId: string;
  userId: string;
  planCode: string;
  productId?: string | null;
};

const SYSTEM = `Você é o AI Product Engine da INFORA, uma plataforma que transforma ideias em produtos digitais comercializáveis.
Escreva em português do Brasil, com linguagem clara, profissional e sem clichês de marketing agressivo.
Nunca invente dados, métricas, depoimentos ou resultados. Responda sempre em JSON válido no formato solicitado.`;

async function run<T>(
  op: AIOperation,
  ctx: RunCtx,
  input: Record<string, unknown>,
  prompt: string,
  fallback: () => T,
): Promise<{ result: T; provider: string; model: string; generationId: string }> {
  const credits = CREDIT_COST[op];
  const spend = await consumeCredits(ctx.organizationId, ctx.planCode, credits);
  if (!spend.ok) throw new CreditError(credits, spend.usage.creditsLeft);

  const provider = resolveProvider();
  const started = Date.now();
  const inserted = await db
    .insert(aiGenerations)
    .values({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      productId: ctx.productId ?? null,
      operation: op,
      provider: provider.id,
      model: provider.model,
      status: "PROCESSING",
      input,
    })
    .returning({ id: aiGenerations.id });
  const generationId = inserted[0].id;

  let result: T;
  let usedProvider = provider.id;
  let usedModel = provider.model;

  try {
    if (provider.configured) {
      const raw = await provider.completeJson({ system: SYSTEM, prompt });
      result = parseJson<T>(raw);
    } else {
      result = fallback();
      usedProvider = "local-composer";
      usedModel = "infora-local-composer-v1";
    }
  } catch (error) {
    await logSystem("warn", "ai", `Falha no provedor ${provider.id}, usando motor local.`, {
      operation: op,
      detail: error instanceof Error ? error.message : "unknown",
    });
    result = fallback();
    usedProvider = "local-composer(fallback)";
    usedModel = "infora-local-composer-v1";
  }

  await db
    .update(aiGenerations)
    .set({
      status: "COMPLETED",
      provider: usedProvider,
      model: usedModel,
      output: result as unknown as Record<string, unknown>,
      latencyMs: Date.now() - started,
      completedAt: new Date(),
    })
    .where(eq(aiGenerations.id, generationId));

  await db.insert(aiUsage).values({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    generationId,
    operation: op,
    model: usedModel,
    credits,
    periodKey: periodKey(),
  });

  await recordEvent({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    productId: ctx.productId ?? null,
    type: op === "product_blueprint" ? "product_generated" : "content_generated",
    source: usedProvider,
    metadata: { operation: op, credits },
  });

  return { result, provider: usedProvider, model: usedModel, generationId };
}

function parseJson<T>(raw: string): T {
  const trimmed = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "");
  return JSON.parse(trimmed) as T;
}

/* --------------------------------------------------------------- OPERATIONS */

export function generateBlueprint(ctx: RunCtx, input: IdeaInput) {
  const prompt = `Crie o blueprint de um ${input.type} digital.
Ideia/tema: ${input.idea}
Público: ${input.audience}
Objetivo: ${input.objective}
Problema a resolver: ${input.problem}

Retorne JSON: {"title","subtitle","promise","concept","audience","chapters":[{"title","kind":"INTRO|CHAPTER|BONUS|CONCLUSION|CTA","summary","content"}],"bonuses":[string],"cta"}
Gere entre 8 e 10 capítulos, cada "content" com 3 a 5 parágrafos reais.`;
  return run<Blueprint>("product_blueprint", ctx, { ...input }, prompt, () => localBlueprint(input));
}

export function generateSalesPage(
  ctx: RunCtx,
  product: {
    title: string;
    subtitle?: string | null;
    audience?: string | null;
    problem?: string | null;
    objective?: string | null;
    promise?: string | null;
    chapters: { title: string; summary?: string | null }[];
  },
) {
  const prompt = `Crie o rascunho de uma página de vendas para o produto digital abaixo.
Título: ${product.title}
Subtítulo: ${product.subtitle ?? ""}
Público: ${product.audience ?? ""}
Problema: ${product.problem ?? ""}
Objetivo: ${product.objective ?? ""}
Capítulos: ${product.chapters.map((c) => c.title).join("; ")}

Retorne JSON: {"headline","subheadline","problem","solution","benefits":[],"contents":[],"differentials":[],"bonuses":[],"faq":[{"q","a"}],"guarantee","ctaLabel"}
Não invente provas sociais nem números.`;
  return run<SalesPageDraft>("sales_page", ctx, { title: product.title }, prompt, () => localSalesPage(product));
}

export function generateMarketingPack(
  ctx: RunCtx,
  product: { title: string; audience?: string | null; promise?: string | null },
) {
  const prompt = `Crie um pacote de conteúdo promocional para o produto "${product.title}".
Público: ${product.audience ?? ""}. Promessa: ${product.promise ?? ""}.
Retorne JSON: {"items":[{"channel":"INSTAGRAM|FACEBOOK|EMAIL|ADS","format":"POST|STORY|REEL|EMAIL|AD","title","body","cta"}]}
Inclua ao menos 8 itens cobrindo Instagram, Facebook, e-mail e anúncios.`;
  return run<MarketingPack>("marketing_pack", ctx, { title: product.title }, prompt, () => localMarketingPack(product));
}

export { buildInsights, type InsightInput } from "./insights";
