import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { campaigns, contentItems, products, socialAccounts } from "@/db/schema";
import { MarketingEditor } from "@/components/marketing-editor";
import { Badge, EmptyState, LinkButton, SectionTitle } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { metaConfig } from "@/lib/meta";
import { MetaConnection } from "@/components/meta-connection";

export const dynamic = "force-dynamic";

const STATUS_FLOW = ["DRAFT", "AWAITING_APPROVAL", "SCHEDULED", "PUBLISHED", "FAILED"];

export default async function MarketingPage({ searchParams }: { searchParams: Promise<{ meta?: string }> }) {
  const { organization, membershipRole } = await requireSession();
  const query = await searchParams;

  const [items, camps, accounts] = await Promise.all([
    db
      .select({ item: contentItems, productTitle: products.title })
      .from(contentItems)
      .leftJoin(products, eq(products.id, contentItems.productId))
      .where(eq(contentItems.organizationId, organization.id))
      .orderBy(asc(contentItems.scheduledFor)),
    db.select().from(campaigns).where(eq(campaigns.organizationId, organization.id)),
    db.select({ provider: socialAccounts.provider, displayName: socialAccounts.displayName, status: socialAccounts.status }).from(socialAccounts).where(eq(socialAccounts.organizationId, organization.id)),
  ]);

  const counts = STATUS_FLOW.map((s) => ({ s, n: items.filter((i) => i.item.status === s).length }));

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <SectionTitle
        title="Marketing"
        subtitle={`${camps.length} campanha(s) · ${items.length} conteúdo(s) no calendário`}
        action={<LinkButton href="/products" size="sm" variant="secondary">Gerar a partir de um produto</LinkButton>}
      />

      <div className="grid gap-3 sm:grid-cols-5">
        {counts.map((c) => (
          <div key={c.s} className="surface p-4">
            <p className="text-[10px] uppercase tracking-wider text-[#6b7386]">{c.s}</p>
            <p className="mt-1.5 text-xl font-semibold text-white">{c.n}</p>
          </div>
        ))}
      </div>

      <MetaConnection configured={!!metaConfig()} canManage={["OWNER", "ADMIN"].includes(membershipRole)} accounts={accounts} campaigns={camps.map((c) => ({ id: c.id, name: c.name, metaCampaignId: c.metaCampaignId }))} result={query.meta} />

      <div className="surface p-5">
        <SectionTitle title="Integrações sociais" subtitle="Publicação exige conta oficial conectada e sua aprovação" />
        <div className="grid gap-3 sm:grid-cols-2">
          {["INSTAGRAM", "FACEBOOK"].map((provider) => {
            const acc = accounts.find((a) => a.provider === provider);
            const connected = acc?.status === "CONNECTED";
            return (
              <div key={provider} className="flex items-center justify-between rounded-lg border border-[#1f2531] bg-[#0d1017] px-4 py-3">
                <div>
                  <p className="text-xs text-white">{provider}</p>
                  <p className="mt-0.5 text-[11px] text-[#6b7386]">
                    {connected ? acc?.displayName ?? "Conta conectada" : "Integration not configured"}
                  </p>
                </div>
                <Badge tone={connected ? "success" : "neutral"}>{connected ? "CONECTADO" : "NÃO CONFIGURADO"}</Badge>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-[11px] leading-relaxed text-[#5c6577]">
          A INFORA usa apenas APIs oficiais. Não há publicação automática sem autorização, nem automação de contas.
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="Nenhum conteúdo planejado ainda."
          description="Gere o pacote promocional de um produto para preencher o calendário de conteúdo."
          action={<LinkButton href="/products">Ir para produtos</LinkButton>}
          icon="◈"
        />
      ) : (
        <div className="space-y-5">
          <SectionTitle title="Calendário de conteúdo" subtitle="Agrupado por data prevista" />
          <MarketingEditor content={items.map(({ item }) => ({ ...item, scheduledFor: item.scheduledFor?.toISOString() ?? null }))} />
        </div>
      )}
    </div>
  );
}
