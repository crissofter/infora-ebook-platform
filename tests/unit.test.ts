/**
 * Unit tests for pure domain logic.
 * Run with:  node --experimental-strip-types --test tests/
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { slugify, uniqueSlug, formatCurrency, percent } from "../src/lib/slug.ts";
import { buildInsights } from "../src/lib/ai/insights.ts";
import { buildCoverSvg } from "../src/lib/design.ts";
import { localBlueprint, localSalesPage, localMarketingPack } from "../src/lib/ai/local.ts";
import { CREDIT_COST } from "../src/lib/ai/types.ts";

test("slugify normaliza acentos e símbolos", () => {
  assert.equal(slugify("Comunicação & Conexão para Casais!"), "comunicacao-conexao-para-casais");
  assert.equal(slugify("   "), "item");
});

test("uniqueSlug adiciona sufixo determinístico", () => {
  assert.equal(uniqueSlug("Meu Produto", "AB12cd34"), "meu-produto-ab12cd");
});

test("formatCurrency e percent", () => {
  assert.match(formatCurrency(4900), /49,00/);
  assert.equal(percent(1, 4), 25);
  assert.equal(percent(1, 0), 0);
});

test("insights nunca inventam dados quando não há eventos", () => {
  const out = buildInsights({
    rangeLabel: "7 dias",
    pageViews: 0,
    ctaClicks: 0,
    checkouts: 0,
    purchases: 0,
    revenueCents: 0,
    products: 0,
    published: 0,
  });
  assert.equal(out.length, 1);
  assert.match(out[0], /Ainda não há dados suficientes/);
});

test("insights derivam CTR e ticket médio dos números reais", () => {
  const out = buildInsights({
    rangeLabel: "30 dias",
    pageViews: 100,
    ctaClicks: 20,
    checkouts: 10,
    purchases: 4,
    revenueCents: 40000,
    products: 2,
    published: 1,
  }).join(" ");
  assert.match(out, /20\.0%/);
  assert.match(out, /100\.00/); // ticket médio R$ 100,00
});

test("cover SVG escapa conteúdo e aplica paleta", () => {
  const svg = buildCoverSvg({ title: "Guia <Teste> & Cia", subtitle: "sub", author: "Autor", style: "EDITORIAL", palette: "VIOLET" });
  assert.ok(svg.startsWith("<svg"));
  assert.ok(!svg.includes("<Teste>"));
  assert.ok(svg.includes("#120B1F"));
});

test("blueprint local usa os dados informados pelo usuário", () => {
  const bp = localBlueprint({
    idea: "Comunicação para casais",
    audience: "casais",
    objective: "melhorar o diálogo",
    problem: "discussões repetitivas",
    type: "EBOOK",
  });
  assert.ok(bp.chapters.length >= 8);
  assert.ok(bp.chapters.some((c) => c.kind === "INTRO"));
  assert.ok(bp.chapters.some((c) => c.kind === "CONCLUSION"));
  assert.match(bp.concept, /casais/);
});

test("sales page e marketing pack produzem estrutura completa", () => {
  const sp = localSalesPage({ title: "Produto", chapters: [{ title: "Cap 1", summary: null }] });
  assert.ok(sp.headline.length > 0);
  assert.ok(sp.faq.length >= 3);

  const mk = localMarketingPack({ title: "Produto", audience: "público", promise: "resultado" });
  assert.ok(mk.items.length >= 8);
  for (const ch of ["INSTAGRAM", "FACEBOOK", "EMAIL", "ADS"]) {
    assert.ok(mk.items.some((i) => i.channel === ch), `canal ausente: ${ch}`);
  }
});

test("custos de crédito são positivos e definidos para toda operação", () => {
  for (const [op, cost] of Object.entries(CREDIT_COST)) {
    assert.ok(cost > 0, `${op} sem custo`);
  }
});
