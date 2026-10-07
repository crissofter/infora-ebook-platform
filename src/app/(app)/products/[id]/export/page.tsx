import { requireSession } from "@/lib/auth";
import { getOwnedProduct, getProductChapters } from "@/lib/products";
import { PrintButton } from "./print-button";
import { getProductMedia } from "@/lib/product-media";

export const dynamic = "force-dynamic";

export default async function ExportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organization, user } = await requireSession();
  const product = await getOwnedProduct(id, organization.id);
  const chapters = await getProductChapters(id, organization.id);
  const { cover, images } = await getProductMedia(id, organization.id);

  return (
    <div className="mx-auto max-w-3xl bg-white text-[#101319]">
      <div className="no-print sticky top-0 z-10 flex items-center justify-between border-b border-[#232936] bg-[#0b0d12] px-5 py-3">
        <p className="text-xs text-[#a5adbd]">Pré-visualização de exportação — use &ldquo;Salvar como PDF&rdquo; na impressão.</p>
        <PrintButton />
      </div>

      <article className="px-5 py-12 leading-relaxed sm:px-10">
        {/* Capa */}
        <section className="page-break flex min-h-[900px] flex-col justify-center">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover.url} alt={`Capa de ${product.title}`} className="mx-auto w-full max-w-[360px]" />
          ) : (
            <div className="border-y-4 border-[#4F7CFF] py-12">
              <p className="text-xs uppercase tracking-[0.3em] text-[#4F7CFF]">{product.designStyle}</p>
              <h1 className="mt-6 text-4xl font-semibold leading-tight">{product.title}</h1>
              {product.subtitle ? <p className="mt-4 text-lg text-[#5C6577]">{product.subtitle}</p> : null}
            </div>
          )}
        </section>

        {/* Folha de apresentação */}
        <section className="page-break py-16">
          <h2 className="text-2xl font-semibold">Apresentação</h2>
          <p className="mt-4 text-sm">{product.concept ?? product.idea}</p>
          {product.promise ? <p className="mt-4 text-sm font-medium">{product.promise}</p> : null}
          <dl className="mt-8 space-y-1 text-xs text-[#5C6577]">
            <div><dt className="inline font-medium">Autor: </dt><dd className="inline">{user.name}</dd></div>
            <div><dt className="inline font-medium">Público: </dt><dd className="inline">{product.audience ?? "—"}</dd></div>
            <div><dt className="inline font-medium">Produzido com: </dt><dd className="inline">INFORA</dd></div>
          </dl>
        </section>

        {/* Sumário */}
        <section className="page-break py-16">
          <h2 className="text-2xl font-semibold">Sumário</h2>
          <ol className="mt-5 space-y-2 text-sm">
            {chapters.map((c, i) => (
              <li key={c.id} className="flex justify-between border-b border-dashed border-[#d7dbe3] pb-1">
                <span>{c.title}</span>
                <span className="text-[#5C6577]">{i + 1}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* Capítulos */}
        {chapters.map((c) => (
          <section key={c.id} className="page-break py-14">
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#4F7CFF]">{c.kind}</p>
            <h2 className="mt-3 text-2xl font-semibold">{c.title}</h2>
            {c.summary ? <p className="mt-2 text-sm italic text-[#5C6577]">{c.summary}</p> : null}
            <div className="mt-6 space-y-4 text-sm leading-7">
              {c.content.split("\n\n").map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            {images.filter((image) => image.chapterId === c.id).map((image) => (
              <figure key={image.id} className="my-6 break-inside-avoid">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt={image.caption || image.name} className="mx-auto max-h-[600px] w-full rounded-lg object-contain" />
                {image.caption ? <figcaption className="mt-2 text-center text-xs text-[#5C6577]">{image.caption}</figcaption> : null}
              </figure>
            ))}
          </section>
        ))}

        <footer className="border-t border-[#d7dbe3] py-8 text-center text-[10px] text-[#5C6577]">
          {product.title} · Produzido na INFORA
        </footer>
      </article>
    </div>
  );
}
