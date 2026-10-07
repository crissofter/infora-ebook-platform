"use client";

import { useState } from "react";
import { Badge, Button, Field, Select, useToast } from "@/components/ui";

type Account = { provider: string; displayName: string | null; status: string };
type Page = { id: string; name: string; instagram_business_account?: { id: string; username?: string } };
type AdAccount = { id: string; name: string; currency: string; account_status: number };

export function MetaConnection({ configured, canManage, accounts, campaigns, result }: { configured: boolean; canManage: boolean; accounts: Account[]; campaigns: { id: string; name: string; metaCampaignId: string | null }[]; result?: string }) {
  const { push } = useToast();
  const connected = accounts.some((a) => a.provider === "META" && a.status === "CONNECTED");
  const adsConnected = accounts.some((a) => a.provider === "META_ADS" && a.status === "CONNECTED");
  const [choices, setChoices] = useState<{ pages: Page[]; accounts: AdAccount[] } | null>(null);
  const [pageId, setPageId] = useState("");
  const [adAccountId, setAdAccountId] = useState("");
  const [campaignId, setCampaignId] = useState(campaigns[0]?.id ?? "");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [manager, setManager] = useState<string | null>(null);

  async function request(url: string, method: string, body?: unknown) {
    setBusy(true);
    try {
      const res = await fetch(url, { method, ...(body ? { headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {}) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Não foi possível concluir a operação.");
      return json.data;
    } catch (e) { push((e as Error).message, "error"); return null; } finally { setBusy(false); }
  }

  return <div className="surface space-y-4 p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-sm font-semibold text-white">Facebook e Instagram · Meta</h2><Badge tone={connected ? "success" : "neutral"}>{connected ? "AUTORIZADO" : "NÃO CONECTADO"}</Badge></div>
    {result ? <p role="status" className="text-xs text-[#a5adbd]">{result === "connected" ? "Autorização recebida. Escolha a Página e a conta de anúncios abaixo." : result === "cancelled" ? "Você cancelou a autorização. Nenhuma campanha foi criada." : "Não foi possível autorizar. Verifique o aplicativo Meta e tente novamente."}</p> : null}
    <p className="text-xs leading-relaxed text-[#a5adbd]">Conecte sua conta pela autorização oficial da Meta. Os anúncios serão preparados como campanhas pausadas; orçamento, público, peças e ativação ficam no Gerenciador de Anúncios.</p>
    {!configured ? <p className="rounded-lg border border-[#232936] p-3 text-xs text-[#a5adbd]">O administrador precisa configurar o aplicativo Meta na hospedagem antes de conectar. A conta de anúncios também precisa de uma forma de pagamento cadastrada na Meta.</p> : null}
    <div className="flex flex-wrap gap-2">
      {configured && canManage ? <a href="/api/meta/connect" className="rounded-lg bg-[#4f7cff] px-4 py-2 text-xs text-white">{connected ? "Reconectar Meta" : "Conectar com a Meta"}</a> : null}
      {connected && canManage ? <><Button size="sm" variant="secondary" loading={busy} onClick={async () => { const data = await request("/api/meta/accounts", "GET"); if (data) setChoices(data); }}>Escolher Página e conta de anúncios</Button><Button size="sm" variant="ghost" loading={busy} onClick={async () => { if (!window.confirm("Desconectar da INFORA? Campanhas existentes na Meta continuarão no Gerenciador.")) return; if (await request("/api/meta/accounts", "DELETE")) window.location.assign("/marketing"); }}>Desconectar</Button></> : null}
      <a href="https://business.facebook.com/" target="_blank" rel="noopener noreferrer" className="px-3 py-2 text-xs text-[#7396ff]">Abrir Meta Business Suite ↗</a>
    </div>
    {accounts.filter((a) => ["FACEBOOK", "INSTAGRAM", "META_ADS"].includes(a.provider)).map((a) => <p key={a.provider} className="text-xs text-[#a5adbd]">{a.provider}: {a.status === "CONNECTED" ? a.displayName || "Conectado" : "Não vinculado"}</p>)}
    {choices ? <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Página do Facebook"><Select value={pageId} onChange={(e) => setPageId(e.target.value)}><option value="">Selecione</option>{choices.pages.map((page) => <option key={page.id} value={page.id}>{page.name}{page.instagram_business_account ? " · Instagram vinculado" : ""}</option>)}</Select></Field>
      <Field label="Conta de anúncios"><Select value={adAccountId} onChange={(e) => setAdAccountId(e.target.value)}><option value="">Selecione</option>{choices.accounts.filter((a) => a.account_status === 1).map((a) => <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>)}</Select></Field>
      <Button size="sm" disabled={!pageId || !adAccountId} loading={busy} onClick={async () => { if (await request("/api/meta/accounts", "POST", { pageId, adAccountId })) window.location.assign("/marketing"); }}>Salvar conexão</Button>
      {!choices.pages.length || !choices.accounts.length ? <p className="text-xs text-[#a5adbd]">Não encontramos Página ou conta de anúncios autorizada. Crie esses recursos na Meta e conceda acesso na conexão.</p> : null}
    </div> : null}
    {adsConnected && canManage && campaigns.length ? <div className="space-y-3 border-t border-[#232936] pt-4">
      <Field label="Campanha do produto"><Select value={campaignId} onChange={(e) => { setCampaignId(e.target.value); setConfirmed(false); }}>{campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}{c.metaCampaignId ? " · já enviada à Meta" : ""}</option>)}</Select></Field>
      <label className="flex items-start gap-2 text-xs text-[#a5adbd]"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />Autorizo criar uma campanha pausada na Meta, sem orçamento ou veiculação.</label>
      <Button size="sm" loading={busy} disabled={!confirmed || !campaignId} onClick={async () => { const data = await request("/api/meta/campaigns", "POST", { campaignId, confirmPaused: true }); if (data) { setManager(data.managerUrl); push(data.alreadyCreated ? "Campanha já preparada na Meta." : "Campanha criada pausada. Revise no Gerenciador.", "success"); } }}>Preparar campanha pausada</Button>
      {manager ? <a href={manager} target="_blank" rel="noopener noreferrer" className="block text-xs text-[#7396ff]">Revisar público, orçamento e peças no Gerenciador de Anúncios ↗</a> : null}
    </div> : null}
  </div>;
}
