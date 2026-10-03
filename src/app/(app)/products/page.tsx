import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { products, projects } from "@/db/schema";
import { Badge, EmptyState, LinkButton, SectionTitle } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { formatCurrency } from "@/lib/slug";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const { organization } = await requireSession();
  const rows = await db
    .select({ product: products, projectName: projects.name })
    .from(products)
    .leftJoin(projects, eq(projects.id, products.projectId))
    .where(eq(products.organizationId, organization.id))
    .orderBy(desc(products.updatedAt));

  return (
    <div className="mx-auto max-w-6xl">
      <SectionTitle
        title="Produtos"
        subtitle="Todos os produtos digitais da sua organização"
        action={<LinkButton href="/products/new" size="sm">+ Novo produto</LinkButton>}
      />

      {rows.length === 0 ? (
        <EmptyState
          title="Nenhum produto criado ainda."
          description="Comece com uma ideia. A INFORA ajudará você a transformá-la em produto."
          action={<LinkButton href="/products/new">+ Criar primeiro produto</LinkButton>}
        />
      ) : (
        <div className="surface overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="border-b border-[#171b24] text-[10px] uppercase tracking-wider text-[#5c6577]">
              <tr>
                <th className="px-4 py-3 font-medium">Produto</th>
                <th className="px-4 py-3 font-medium">Projeto</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Preço</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Atualizado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#171b24]">
              {rows.map(({ product: p, projectName }) => (
                <tr key={p.id} className="transition-colors hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <Link href={`/products/${p.id}`} className="text-white hover:text-[#7396ff]">
                      {p.title}
                    </Link>
                    {p.subtitle ? <p className="mt-0.5 max-w-sm truncate text-[11px] text-[#6b7386]">{p.subtitle}</p> : null}
                  </td>
                  <td className="px-4 py-3 text-[#a5adbd]">{projectName ?? "—"}</td>
                  <td className="px-4 py-3 text-[#a5adbd]">{p.type}</td>
                  <td className="px-4 py-3 text-[#a5adbd]">{p.priceCents > 0 ? formatCurrency(p.priceCents, p.currency) : "—"}</td>
                  <td className="px-4 py-3">
                    <Badge tone={p.status === "PUBLISHED" ? "success" : p.status === "IN_PRODUCTION" ? "warning" : "neutral"}>
                      {p.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-[#6b7386]">{p.updatedAt.toLocaleDateString("pt-BR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
