"use client";

import { useState } from "react";
import { Badge, Button, Field, Input, Modal, SectionTitle, Select, Textarea, useToast } from "@/components/ui";
import type { ProductImage } from "@/lib/media";

export type MarketingContent = { id: string; channel: string; format: string; title: string; body: string; cta: string | null; status: string; scheduledFor: string | null };

function download(contents: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}

function localDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function ContentCard({ item, cover, salesPath, onSaved }: { item: MarketingContent; cover?: ProductImage | null; salesPath?: string | null; onSaved: (item: MarketingContent) => void }) {
  const [draft, setDraft] = useState(item);
  const [date, setDate] = useState(localDateTime(item.scheduledFor));
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const { push } = useToast();

  async function save(manual = false) {
    setBusy(true);
    try {
      const res = await fetch(`/api/content/${item.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: draft.title, body: draft.body, cta: draft.cta, status: manual ? "PUBLISHED" : draft.status, scheduledFor: date ? new Date(date).toISOString() : null, ...(manual ? { publication: "manual" } : {}) }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Não foi possível salvar.");
      setDraft(json.data); onSaved(json.data); setConfirm(false); push("Conteúdo salvo.", "success");
    } catch (e) { push((e as Error).message, "error"); } finally { setBusy(false); }
  }

  function text() {
    const link = salesPath ? new URL(salesPath, window.location.origin).href : "";
    return [draft.body, draft.cta, link].filter(Boolean).join("\n\n");
  }

  return <div className="surface space-y-4 p-4">
    <div className="flex items-center justify-between gap-2"><Badge tone={item.channel === "INSTAGRAM" ? "ai" : "brand"}>{item.channel} · {item.format}</Badge><Badge tone={draft.status === "PUBLISHED" ? "success" : "neutral"}>{draft.status}</Badge></div>
    {cover ? <div className="flex items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={cover.url} alt="Capa do produto para divulgação" className="h-28 w-20 rounded object-contain" />
      <a href={cover.url} download={cover.name} className="text-xs text-[#7396ff]">Baixar imagem do produto</a>
    </div> : null}
    <Field label="Título"><Input maxLength={200} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></Field>
    <Field label="Texto promocional"><Textarea rows={7} maxLength={8000} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} /></Field>
    <Field label="Chamada para ação"><Input maxLength={200} value={draft.cta ?? ""} onChange={(e) => setDraft({ ...draft, cta: e.target.value })} /></Field>
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Data planejada"><Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <Field label="Status"><Select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
        <option value="DRAFT">Rascunho</option><option value="AWAITING_APPROVAL">Em revisão</option><option value="SCHEDULED">Planejado no calendário</option>
        {draft.status === "PUBLISHED" ? <option value="PUBLISHED">Publicado manualmente</option> : null}
        {draft.status === "FAILED" ? <option value="FAILED">Falhou</option> : null}
      </Select></Field>
    </div>
    <div className="flex flex-wrap gap-2">
      <Button size="sm" loading={busy} onClick={() => save()}>Salvar conteúdo</Button>
      <Button size="sm" variant="secondary" onClick={async () => { try { await navigator.clipboard.writeText(text()); push("Texto e link copiados.", "success"); } catch { push("Não foi possível copiar. Use Baixar texto.", "error"); } }}>Copiar texto</Button>
      <Button size="sm" variant="ghost" onClick={() => download(text(), `infora-${item.channel.toLowerCase()}-${item.id}.txt`, "text/plain;charset=utf-8")}>Baixar texto</Button>
      <Button size="sm" variant="ghost" disabled={draft.status === "PUBLISHED"} onClick={() => setConfirm(true)}>Marcar como publicado</Button>
    </div>
    <Modal open={confirm} onClose={() => setConfirm(false)} title="Confirmar publicação manual" footer={<><Button variant="ghost" onClick={() => setConfirm(false)}>Cancelar</Button><Button loading={busy} onClick={() => save(true)}>Já publiquei, registrar</Button></>}>
      Confirme apenas depois de publicar este conteúdo na sua própria conta. Essa ação registra o status no calendário; não envia o post à rede social.
    </Modal>
  </div>;
}

export function MarketingEditor({ content, onChange, cover, salesPath, busy, onGenerate }: { content: MarketingContent[]; onChange?: (items: MarketingContent[]) => void; cover?: ProductImage | null; salesPath?: string | null; busy?: boolean; onGenerate?: () => void }) {
  const [items, setItems] = useState(content);
  const displayed = onChange ? content : items;
  function saved(item: MarketingContent) { const next = displayed.map((c) => c.id === item.id ? item : c); if (onChange) onChange(next); else setItems(next); }
  function exportCalendar() {
    // Formula-like cells are prefixed so editable text is safe in spreadsheets.
    const cell = (v: string) => `"${(/^[=+@-]/.test(v) ? "'" + v : v).replaceAll('"', '""')}"`;
    const rows = [["Canal", "Formato", "Título", "Texto", "CTA", "Data (UTC)", "Status"], ...displayed.map((c) => [c.channel, c.format, c.title, c.body, c.cta ?? "", c.scheduledFor ?? "", c.status])];
    download("\uFEFF" + rows.map((row) => row.map(cell).join(";")).join("\r\n"), "infora-calendario.csv", "text/csv;charset=utf-8");
  }
  return <div className="space-y-4">
    <SectionTitle title="Conteúdo promocional" subtitle={`${displayed.length} itens para revisar e divulgar`} action={<div className="flex flex-wrap gap-2">{displayed.length ? <Button size="sm" variant="secondary" onClick={exportCalendar}>Baixar calendário</Button> : null}{onGenerate ? <Button size="sm" variant="ai" loading={busy} onClick={onGenerate}>{displayed.length ? "Gerar mais" : "Gerar conteúdo (350 créditos)"}</Button> : null}</div>} />
    <p className="text-xs leading-relaxed text-[#a5adbd]">Revise os textos, ajuste as datas e copie ou baixe o material para divulgar. As datas organizam seu calendário; o envio automático às redes sociais ainda não está disponível.</p>
    {!displayed.length ? <p className="surface p-6 text-xs text-[#a5adbd]">Gere o pacote promocional na aba Marketing de um produto.</p> : <div className="grid gap-4 md:grid-cols-2">{displayed.map((item) => <ContentCard key={item.id} item={item} cover={cover} salesPath={salesPath} onSaved={saved} />)}</div>}
  </div>;
}
