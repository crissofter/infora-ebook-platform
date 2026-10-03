/** Pure analytics interpretation — derives statements strictly from real numbers. */
export type InsightInput = {
  rangeLabel: string;
  pageViews: number;
  ctaClicks: number;
  checkouts: number;
  purchases: number;
  revenueCents: number;
  products: number;
  published: number;
};

export function buildInsights(data: InsightInput): string[] {
  const out: string[] = [];
  if (data.pageViews === 0 && data.products === 0) {
    return ["Ainda não há dados suficientes. Crie seu primeiro produto para começar a registrar eventos reais."];
  }
  out.push(
    `Nos últimos ${data.rangeLabel}, suas páginas registraram ${data.pageViews} visualização(ões) e ${data.ctaClicks} clique(s) em CTA.`,
  );
  if (data.pageViews > 0) {
    const ctr = (data.ctaClicks / data.pageViews) * 100;
    out.push(`A taxa de clique no CTA é de ${ctr.toFixed(1)}% sobre as visualizações registradas.`);
    if (ctr < 5 && data.pageViews >= 20) {
      out.push("O CTA está com baixa taxa de clique. Considere testar uma headline mais específica sobre o resultado prometido.");
    }
  }
  if (data.ctaClicks > 0 && data.purchases === 0) {
    out.push("Há cliques em CTA sem compras registradas: verifique se o checkout está configurado e acessível.");
  }
  if (data.purchases > 0) {
    const ticket = data.revenueCents / data.purchases / 100;
    out.push(`Foram ${data.purchases} compra(s) registrada(s), com ticket médio de R$ ${ticket.toFixed(2)}.`);
  }
  if (data.products > 0 && data.published === 0) {
    out.push("Você tem produtos criados, mas nenhum publicado. Publicar a página de vendas começa a gerar dados de tráfego.");
  }
  return out;
}
