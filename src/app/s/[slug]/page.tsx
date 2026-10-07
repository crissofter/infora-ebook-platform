import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { products, salesPages } from "@/db/schema";
import { Logo } from "@/components/brand";
import { formatCurrency } from "@/lib/slug";
import { SalesCta, SalesPageTracker } from "./tracker";
import { getProductMedia } from "@/lib/product-media";

export const dynamic = "force-dynamic";

export default async function PublicSalesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const rows = await db
    .select({ product: products, page: salesPages })
    .from(products)
    .innerJoin(salesPages, eq(salesPages.productId, products.id))
    .where(eq(products.slug, slug))
    .limit(1);

  const row = rows[0];
  if (!row || !row.page.published || row.product.status !== "PUBLISHED") notFound();

  const { product, page } = row;
  const { cover } = await getProductMedia(product.id, product.organizationId);

  return (
    <main className="min-h-screen bg-[#050609]">
      <SalesPageTracker slug={slug} />

      <section className="grid-bg border-b border-[#171b24]">
        <div className="mx-auto max-w-3xl px-5 py-24 text-center">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">{page.headline}</h1>
          {page.subheadline ? <p className="mx-auto mt-5 max-w-2xl text-sm text-[#a5adbd] sm:text-base">{page.subheadline}</p> : null}
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover.url} alt={`Capa de ${product.title}`} className="mx-auto mt-8 max-h-[420px] w-full max-w-[280px] rounded-xl object-contain shadow-2xl" />
          ) : null}
          <div className="mt-9">
            <SalesCta slug={slug} label={page.ctaLabel} price={product.priceCents} currency={product.currency} checkoutUrl={page.checkoutUrl} />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-3xl space-y-14 px-5 py-16">
        {page.problem ? (
          <section>
            <h2 className="text-lg font-semibold text-white">O problema</h2>
            <p className="mt-3 text-sm leading-relaxed text-[#a5adbd]">{page.problem}</p>
          </section>
        ) : null}

        {page.solution ? (
          <section>
            <h2 className="text-lg font-semibold text-white">A solução</h2>
            <p className="mt-3 text-sm leading-relaxed text-[#a5adbd]">{page.solution}</p>
          </section>
        ) : null}

        {page.benefits.length > 0 ? (
          <section>
            <h2 className="text-lg font-semibold text-white">Benefícios</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {page.benefits.map((b) => (
                <li key={b} className="surface p-4 text-xs leading-relaxed text-[#c5cbd7]">{b}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {page.contents.length > 0 ? (
          <section>
            <h2 className="text-lg font-semibold text-white">O que está incluído</h2>
            <ol className="mt-4 space-y-2">
              {page.contents.map((c, i) => (
                <li key={`${c}-${i}`} className="flex gap-3 rounded-lg border border-[#1f2531] bg-[#0d1017] px-4 py-3 text-xs text-[#c5cbd7]">
                  <span className="text-[#4f7cff]">{String(i + 1).padStart(2, "0")}</span>
                  {c}
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {page.differentials.length > 0 ? (
          <section>
            <h2 className="text-lg font-semibold text-white">Diferenciais</h2>
            <ul className="mt-4 space-y-2 text-xs text-[#a5adbd]">
              {page.differentials.map((d) => (
                <li key={d}>· {d}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {page.bonuses.length > 0 ? (
          <section>
            <h2 className="text-lg font-semibold text-white">Bônus</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {page.bonuses.map((b) => (
                <li key={b} className="rounded-lg border border-[#8b5cf6]/25 bg-[#8b5cf6]/8 p-4 text-xs text-[#c4b5fd]">{b}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {page.faq.length > 0 ? (
          <section>
            <h2 className="text-lg font-semibold text-white">Perguntas frequentes</h2>
            <div className="mt-4 divide-y divide-[#171b24] border-y border-[#171b24]">
              {page.faq.map((f) => (
                <details key={f.q} className="group py-4">
                  <summary className="cursor-pointer list-none text-sm text-white">
                    <span className="mr-2 text-[#4f7cff]">+</span>
                    {f.q}
                  </summary>
                  <p className="mt-2 pl-5 text-xs leading-relaxed text-[#a5adbd]">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        ) : null}

        {page.guarantee ? (
          <section className="surface p-5">
            <h2 className="text-sm font-semibold text-white">Garantia</h2>
            <p className="mt-2 text-xs leading-relaxed text-[#a5adbd]">{page.guarantee}</p>
          </section>
        ) : null}

        <section className="grid-bg rounded-2xl border border-[#171b24] px-6 py-14 text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-white">{product.title}</h2>
          {product.priceCents > 0 ? (
            <p className="mt-3 text-3xl font-semibold text-[#7396ff]">{formatCurrency(product.priceCents, product.currency)}</p>
          ) : null}
          <div className="mt-7">
            <SalesCta slug={slug} label={page.ctaLabel} price={product.priceCents} currency={product.currency} checkoutUrl={page.checkoutUrl} />
          </div>
        </section>
      </div>

      <footer className="border-t border-[#171b24] py-8">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 text-[11px] text-[#5c6577]">
          <span>Página criada na INFORA</span>
          <Logo size={22} />
        </div>
      </footer>
    </main>
  );
}
