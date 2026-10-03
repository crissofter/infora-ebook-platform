"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, Button, SectionTitle, cx, useToast } from "@/components/ui";
import { formatCurrency } from "@/lib/slug";

type Plan = {
  code: string;
  name: string;
  priceCents: number;
  monthlyCredits: number;
  maxProducts: number;
  maxProjects: number;
  features: string[];
};

export function BillingClient({
  currentPlan,
  plans,
  usage,
  subscription,
  byOperation,
  recent,
}: {
  currentPlan: string;
  plans: Plan[];
  usage: { used: number; included: number; periodKey: string };
  subscription: { status: string; provider: string; currentPeriodEnd: string; cancelAtPeriodEnd: boolean } | null;
  byOperation: { operation: string; credits: number; runs: number }[];
  recent: { id: string; operation: string; model: string; credits: number; createdAt: string }[];
}) {
  const router = useRouter();
  const { push } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const pct = usage.included > 0 ? Math.min(100, (usage.used / usage.included) * 100) : 0;

  async function change(planCode: string) {
    setLoading(planCode);
    const res = await fetch("/api/billing/plan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ planCode }),
    });
    const json = await res.json();
    setLoading(null);
    if (!res.ok) {
      push(json.error ?? "Não foi possível alterar o plano.", "error");
      return;
    }
    push(`Plano alterado para ${planCode}. ${json.data.notice}`, "success");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <SectionTitle title="Plano e consumo" subtitle={`Período ${usage.periodKey}`} />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="surface p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#6b7386]">Créditos de IA</p>
              <p className="mt-1.5 text-2xl font-semibold text-white">
                {usage.used.toLocaleString("pt-BR")}
                <span className="text-sm font-normal text-[#6b7386]"> / {usage.included.toLocaleString("pt-BR")}</span>
              </p>
            </div>
            <Badge tone="brand">{currentPlan}</Badge>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#1f2531]">
            <div className="h-full rounded-full bg-[#8b5cf6]" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-[#5c6577]">
            Custos por operação: blueprint 450 · página de vendas 300 · pacote de marketing 350 · reescrita 120 · insights 80.
            O consumo é registrado por operação, modelo e data.
          </p>
        </div>

        <div className="surface p-5">
          <p className="text-[10px] uppercase tracking-wider text-[#6b7386]">Assinatura</p>
          {subscription ? (
            <ul className="mt-3 space-y-1.5 text-xs text-[#a5adbd]">
              <li>Status: <span className="text-white">{subscription.status}</span></li>
              <li>Renovação: {new Date(subscription.currentPeriodEnd).toLocaleDateString("pt-BR")}</li>
              <li>Gateway: {subscription.provider === "none" ? "não configurado" : subscription.provider}</li>
            </ul>
          ) : (
            <p className="mt-3 text-xs text-[#6b7386]">Nenhuma assinatura registrada.</p>
          )}
          <p className="mt-4 text-[11px] leading-relaxed text-[#5c6577]">
            Cobrança automática indisponível nesta instalação: nenhum gateway de pagamento foi configurado.
          </p>
        </div>
      </div>

      <div>
        <SectionTitle title="Planos" subtitle="Alterações são registradas na plataforma" />
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
          {plans.map((p) => {
            const active = p.code === currentPlan;
            return (
              <div key={p.code} className={cx("surface flex flex-col p-5", active && "border-[#4f7cff]/50")}>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">{p.name}</h3>
                  {active ? <Badge tone="brand">Atual</Badge> : null}
                </div>
                <p className="mt-3 text-xl font-semibold text-white">
                  {p.priceCents === 0 ? "R$ 0" : formatCurrency(p.priceCents)}
                  <span className="text-[11px] font-normal text-[#6b7386]">/mês</span>
                </p>
                <ul className="mt-4 flex-1 space-y-1.5 text-[11px] text-[#a5adbd]">
                  {p.features.map((f) => (
                    <li key={f}>· {f}</li>
                  ))}
                </ul>
                <Button
                  className="mt-5"
                  size="sm"
                  variant={active ? "ghost" : "secondary"}
                  disabled={active}
                  loading={loading === p.code}
                  onClick={() => change(p.code)}
                >
                  {active ? "Plano atual" : p.priceCents === 0 ? "Fazer downgrade" : "Selecionar"}
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="surface p-5">
          <SectionTitle title="Consumo por operação" subtitle="Histórico total da organização" />
          {byOperation.length === 0 ? (
            <p className="text-xs text-[#6b7386]">Nenhuma operação de IA registrada ainda.</p>
          ) : (
            <ul className="space-y-2">
              {byOperation.map((o) => (
                <li key={o.operation} className="flex items-center justify-between rounded-lg border border-[#1f2531] bg-[#0d1017] px-3 py-2 text-xs">
                  <span className="text-[#c5cbd7]">{o.operation}</span>
                  <span className="text-[#6b7386]">{o.runs} execução(ões) · {o.credits.toLocaleString("pt-BR")} créditos</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="surface p-5">
          <SectionTitle title="Últimas operações" subtitle="Registro detalhado" />
          {recent.length === 0 ? (
            <p className="text-xs text-[#6b7386]">Sem registros.</p>
          ) : (
            <ul className="divide-y divide-[#171b24] text-xs">
              {recent.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-2">
                  <span className="text-[#c5cbd7]">{r.operation}</span>
                  <span className="text-[11px] text-[#5c6577]">{r.model} · {r.credits} cr · {new Date(r.createdAt).toLocaleDateString("pt-BR")}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
