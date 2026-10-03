"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge, Button, Field, Input, Modal, SectionTitle, Select, Stat, Tabs, Textarea, cx, useToast } from "@/components/ui";

type Chapter = { id: string; title: string; summary: string | null; content: string; kind: string; position: number };
type SalesPage = {
  id: string;
  headline: string;
  subheadline: string | null;
  problem: string | null;
  solution: string | null;
  benefits: string[];
  contents: string[];
  differentials: string[];
  bonuses: string[];
  faq: { q: string; a: string }[];
  guarantee: string | null;
  ctaLabel: string;
  published: boolean;
};
type ContentItem = {
  id: string;
  channel: string;
  format: string;
  title: string;
  body: string;
  cta: string | null;
  status: string;
  scheduledFor: string | null;
};
type Product = {
  id: string;
  title: string;
  subtitle: string | null;
  slug: string;
  type: string;
  status: string;
  idea: string | null;
  audience: string | null;
  objective: string | null;
  problem: string | null;
  promise: string | null;
  concept: string | null;
  designStyle: string;
  coverPalette: string;
  priceCents: number;
  currency: string;
};

const STYLES = ["PREMIUM", "MINIMALISTA", "MODERNO", "ELEGANTE", "EDITORIAL", "CORPORATIVO", "CRIATIVO"];
const PALETTES = ["MIDNIGHT", "VIOLET", "IVORY", "GRAPHITE", "EMERALD"];

export function ProductWorkspace({
  product: initialProduct,
  chapters: initialChapters,
  salesPage: initialSalesPage,
  content: initialContent,
  coverSvg: initialCover,
  metrics,
  aiConfigured,
}: {
  product: Product & { createdAt: string; updatedAt: string; publishedAt: string | null };
  chapters: Chapter[];
  salesPage: SalesPage | null;
  content: ContentItem[];
  coverSvg: string | null;
  metrics: { pageViews: number; ctaClicks: number; checkouts: number; purchases: number };
  aiConfigured: boolean;
}) {
  const router = useRouter();
  const { push } = useToast();
  const [tab, setTab] = useState("blueprint");
  const [product, setProduct] = useState(initialProduct);
  const [chapters, setChapters] = useState(initialChapters);
  const [salesPage, setSalesPage] = useState(initialSalesPage);
  const [content, setContent] = useState(initialContent);
  const [cover, setCover] = useState(initialCover);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function call(url: string, method: string, body?: unknown) {
    const res = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error ?? "Não conseguimos concluir esta operação agora.");
    return json.data;
  }

  async function patchProduct(patch: Partial<Product>) {
    setProduct((p) => ({ ...p, ...patch }));
    try {
      await call(`/api/products/${product.id}`, "PATCH", patch);
    } catch (e) {
      push((e as Error).message, "error");
    }
  }

  async function generate(kind: "sales_page" | "marketing" | "cover") {
    setBusy(kind);
    try {
      const data = await call(`/api/products/${product.id}/generate`, "POST", { kind });
      if (kind === "cover") {
        setCover(data.asset.payload);
        push("Capa gerada.", "success");
      } else if (kind === "sales_page") {
        setSalesPage(data.salesPage);
        push("Página de vendas gerada.", "success");
      } else {
        setContent(data.items);
        push(`${data.items.length} conteúdos promocionais gerados.`, "success");
      }
      router.refresh();
    } catch (e) {
      push((e as Error).message, "error");
    } finally {
      setBusy(null);
    }
  }

  async function exportProduct() {
    setBusy("export");
    try {
      await call(`/api/products/${product.id}/export`, "POST");
      window.open(`/products/${product.id}/export`, "_blank");
      push("Exportação registrada. Use 'Salvar como PDF' na janela aberta.", "success");
    } catch (e) {
      push((e as Error).message, "error");
    } finally {
      setBusy(null);
    }
  }

  async function publish(next: boolean) {
    if (!salesPage) {
      push("Gere a página de vendas antes de publicar.", "error");
      return;
    }
    setBusy("publish");
    try {
      await call(`/api/products/${product.id}/sales-page`, "PATCH", { published: next });
      setSalesPage({ ...salesPage, published: next });
      setProduct((p) => ({ ...p, status: next ? "PUBLISHED" : "READY" }));
      push(next ? "Produto publicado." : "Publicação revertida.", "success");
      router.refresh();
    } catch (e) {
      push((e as Error).message, "error");
    } finally {
      setBusy(null);
    }
  }

  async function removeProduct() {
    try {
      await call(`/api/products/${product.id}`, "DELETE");
      push("Produto excluído.", "success");
      router.push("/products");
      router.refresh();
    } catch (e) {
      push((e as Error).message, "error");
    }
  }

  const tabs = [
    { id: "blueprint", label: "Blueprint" },
    { id: "editor", label: "Editor", badge: String(chapters.length) },
    { id: "design", label: "Design" },
    { id: "export", label: "Exportação" },
    { id: "sales", label: "Página de vendas" },
    { id: "marketing", label: "Marketing", badge: String(content.length) },
    { id: "analytics", label: "Analytics" },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Link href="/products" className="text-[11px] text-[#6b7386] hover:text-white">Produtos</Link>
            <span className="text-[11px] text-[#39404f]">/</span>
            <Badge tone={product.status === "PUBLISHED" ? "success" : product.status === "IN_PRODUCTION" ? "warning" : "neutral"}>
              {product.status}
            </Badge>
          </div>
          <h1 className="mt-2 truncate text-xl font-semibold tracking-tight text-white">{product.title}</h1>
          {product.subtitle ? <p className="mt-1 text-xs text-[#a5adbd]">{product.subtitle}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {salesPage?.published ? (
            <a
              href={`/s/${product.slug}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-[10px] border border-[#232936] bg-[#11141b] px-4 py-2 text-xs text-white hover:bg-[#1f2531]"
            >
              Ver página pública ↗
            </a>
          ) : null}
          <Button size="sm" variant="secondary" loading={busy === "export"} onClick={exportProduct}>
            Exportar
          </Button>
          <Button size="sm" loading={busy === "publish"} onClick={() => publish(!salesPage?.published)}>
            {salesPage?.published ? "Despublicar" : "Publicar"}
          </Button>
        </div>
      </div>

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === "blueprint" ? (
        <BlueprintTab product={product} chapters={chapters} onPatch={patchProduct} onDelete={() => setConfirmDelete(true)} />
      ) : null}

      {tab === "editor" ? (
        <EditorTab productId={product.id} chapters={chapters} setChapters={setChapters} push={push} />
      ) : null}

      {tab === "design" ? (
        <DesignTab
          product={product}
          cover={cover}
          busy={busy === "cover"}
          onPatch={patchProduct}
          onGenerate={() => generate("cover")}
        />
      ) : null}

      {tab === "export" ? (
        <div className="surface space-y-4 p-5">
          <SectionTitle title="Exportação" subtitle="Documento com capa, apresentação, sumário, capítulos, conclusão e CTA" />
          <ul className="space-y-1.5 text-xs text-[#a5adbd]">
            <li>· {chapters.length} seções incluídas</li>
            <li>· Capa {cover ? "gerada" : "ainda não gerada"}</li>
            <li>· Formato: PDF via impressão do navegador (sem dependências externas)</li>
          </ul>
          <div className="flex gap-2">
            <Button loading={busy === "export"} onClick={exportProduct}>Gerar documento</Button>
            <Link
              href={`/products/${product.id}/export`}
              target="_blank"
              className="rounded-[10px] border border-[#232936] bg-[#11141b] px-4 py-2 text-xs text-white hover:bg-[#1f2531]"
            >
              Pré-visualizar
            </Link>
          </div>
          <p className="text-[11px] leading-relaxed text-[#5c6577]">
            Formatos adicionais (EPUB, DOCX) e armazenamento em bucket externo ainda não configurados nesta instalação —
            a camada de storage já está abstraída no banco.
          </p>
        </div>
      ) : null}

      {tab === "sales" ? (
        <SalesTab
          product={product}
          salesPage={salesPage}
          setSalesPage={setSalesPage}
          busy={busy === "sales_page"}
          onGenerate={() => generate("sales_page")}
          onPatchProduct={patchProduct}
          push={push}
          aiConfigured={aiConfigured}
        />
      ) : null}

      {tab === "marketing" ? (
        <MarketingTab content={content} setContent={setContent} busy={busy === "marketing"} onGenerate={() => generate("marketing")} push={push} />
      ) : null}

      {tab === "analytics" ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <Stat label="Visualizações" value={String(metrics.pageViews)} />
            <Stat label="Cliques em CTA" value={String(metrics.ctaClicks)} tone="brand" />
            <Stat label="Checkouts" value={String(metrics.checkouts)} />
            <Stat label="Compras" value={String(metrics.purchases)} />
          </div>
          <div className="surface p-5 text-xs leading-relaxed text-[#a5adbd]">
            Métricas dos últimos 30 dias registradas na organização. Eventos de página pública são gravados
            automaticamente quando o produto está publicado.
            <Link href="/analytics" className="ml-1 text-[#7396ff] hover:text-white">Ver analytics completo →</Link>
          </div>
        </div>
      ) : null}

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Excluir produto"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Cancelar</Button>
            <Button variant="danger" onClick={removeProduct}>Excluir definitivamente</Button>
          </>
        }
      >
        Esta ação remove o produto, seus capítulos, página de vendas e conteúdos promocionais. Não é possível desfazer.
      </Modal>
    </div>
  );
}

/* ------------------------------------------------------------- BLUEPRINT */

function BlueprintTab({
  product,
  chapters,
  onPatch,
  onDelete,
}: {
  product: Product;
  chapters: Chapter[];
  onPatch: (p: Partial<Product>) => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState(product);
  useEffect(() => setDraft(product), [product]);

  return (
    <div className="space-y-5">
      <div className="surface space-y-4 p-5">
        <SectionTitle title="Conceito do produto" subtitle="Revise e aprove o que a IA propôs" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Título">
            <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} onBlur={() => onPatch({ title: draft.title })} />
          </Field>
          <Field label="Subtítulo">
            <Input value={draft.subtitle ?? ""} onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })} onBlur={() => onPatch({ subtitle: draft.subtitle })} />
          </Field>
        </div>
        <Field label="Promessa">
          <Textarea rows={2} value={draft.promise ?? ""} onChange={(e) => setDraft({ ...draft, promise: e.target.value })} onBlur={() => onPatch({ promise: draft.promise })} />
        </Field>
        <Field label="Conceito">
          <Textarea rows={3} value={draft.concept ?? ""} onChange={(e) => setDraft({ ...draft, concept: e.target.value })} onBlur={() => onPatch({ concept: draft.concept })} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Público">
            <Input value={draft.audience ?? ""} onChange={(e) => setDraft({ ...draft, audience: e.target.value })} onBlur={() => onPatch({ audience: draft.audience })} />
          </Field>
          <Field label="Objetivo">
            <Input value={draft.objective ?? ""} onChange={(e) => setDraft({ ...draft, objective: e.target.value })} onBlur={() => onPatch({ objective: draft.objective })} />
          </Field>
          <Field label="Preço (R$)">
            <Input
              type="number"
              min={0}
              value={draft.priceCents / 100}
              onChange={(e) => setDraft({ ...draft, priceCents: Math.round(Number(e.target.value) * 100) })}
              onBlur={() => onPatch({ priceCents: draft.priceCents })}
            />
          </Field>
        </div>
        <p className="text-[11px] text-[#5c6577]">As alterações são salvas automaticamente ao sair do campo.</p>
      </div>

      <div className="surface p-5">
        <SectionTitle title="Estrutura" subtitle={`${chapters.length} seções`} />
        <ol className="space-y-1.5">
          {chapters.map((c) => (
            <li key={c.id} className="flex items-start gap-3 rounded-lg border border-[#1f2531] bg-[#0d1017] px-3 py-2.5">
              <Badge tone={c.kind === "BONUS" ? "ai" : c.kind === "CTA" ? "brand" : "neutral"}>{c.kind}</Badge>
              <div className="min-w-0">
                <p className="text-xs text-white">{c.title}</p>
                {c.summary ? <p className="mt-0.5 text-[11px] text-[#6b7386]">{c.summary}</p> : null}
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex justify-end">
        <Button variant="danger" size="sm" onClick={onDelete}>Excluir produto</Button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- EDITOR */

function EditorTab({
  productId,
  chapters,
  setChapters,
  push,
}: {
  productId: string;
  chapters: Chapter[];
  setChapters: (c: Chapter[]) => void;
  push: (m: string, t?: "info" | "success" | "error") => void;
}) {
  const [activeId, setActiveId] = useState(chapters[0]?.id ?? null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = useMemo(() => chapters.find((c) => c.id === activeId) ?? null, [chapters, activeId]);

  const autosave = useCallback(
    (id: string, patch: Partial<Chapter>) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        setSaving(true);
        try {
          await fetch(`/api/chapters/${id}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(patch),
          });
          setSavedAt(new Date().toLocaleTimeString("pt-BR"));
        } catch {
          push("Não conseguimos salvar agora. Sua edição continua na tela.", "error");
        } finally {
          setSaving(false);
        }
      }, 900);
    },
    [push],
  );

  function update(id: string, patch: Partial<Chapter>) {
    setChapters(chapters.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    autosave(id, patch);
  }

  async function add(duplicateOf?: string) {
    const res = await fetch(`/api/products/${productId}/chapters`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(duplicateOf ? { duplicateOf } : { title: "Novo capítulo" }),
    });
    const json = await res.json();
    if (!res.ok) return push(json.error ?? "Não foi possível adicionar.", "error");
    setChapters([...chapters, json.data]);
    setActiveId(json.data.id);
  }

  async function remove(id: string) {
    const res = await fetch(`/api/chapters/${id}`, { method: "DELETE" });
    if (!res.ok) return push("Não foi possível excluir o capítulo.", "error");
    const next = chapters.filter((c) => c.id !== id);
    setChapters(next);
    setActiveId(next[0]?.id ?? null);
  }

  async function move(id: string, dir: -1 | 1) {
    const idx = chapters.findIndex((c) => c.id === id);
    const target = idx + dir;
    if (target < 0 || target >= chapters.length) return;
    const next = [...chapters];
    [next[idx], next[target]] = [next[target], next[idx]];
    setChapters(next.map((c, i) => ({ ...c, position: i })));
    await fetch(`/api/products/${productId}/chapters`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ order: next.map((c) => c.id) }),
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      <div className="surface h-fit p-3">
        <div className="mb-2 flex items-center justify-between px-1">
          <span className="text-[10px] uppercase tracking-wider text-[#6b7386]">Seções</span>
          <button onClick={() => add()} className="text-[11px] text-[#7396ff] hover:text-white">+ add</button>
        </div>
        <ul className="space-y-1">
          {chapters.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => setActiveId(c.id)}
                className={cx(
                  "w-full truncate rounded-lg px-2.5 py-2 text-left text-xs",
                  activeId === c.id ? "bg-[#171b24] text-white" : "text-[#8a93a6] hover:bg-white/5 hover:text-white",
                )}
              >
                {c.title}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="surface p-5">
        {!active ? (
          <p className="py-10 text-center text-xs text-[#6b7386]">Nenhuma seção selecionada.</p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#6b7386]">
                {saving ? "Salvando…" : savedAt ? `Salvo automaticamente às ${savedAt}` : "Autosave ativo"}
              </span>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => move(active.id, -1)}>↑</Button>
                <Button size="sm" variant="ghost" onClick={() => move(active.id, 1)}>↓</Button>
                <Button size="sm" variant="ghost" onClick={() => add(active.id)}>Duplicar</Button>
                <Button size="sm" variant="danger" onClick={() => remove(active.id)}>Excluir</Button>
              </div>
            </div>
            <Field label="Título">
              <Input value={active.title} onChange={(e) => update(active.id, { title: e.target.value })} />
            </Field>
            <Field label="Resumo">
              <Input value={active.summary ?? ""} onChange={(e) => update(active.id, { summary: e.target.value })} />
            </Field>
            <Field label="Tipo">
              <Select value={active.kind} onChange={(e) => update(active.id, { kind: e.target.value })}>
                {["INTRO", "CHAPTER", "BONUS", "CONCLUSION", "CTA"].map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </Select>
            </Field>
            <Field label="Conteúdo">
              <Textarea rows={18} value={active.content} onChange={(e) => update(active.id, { content: e.target.value })} />
            </Field>
            <p className="text-[11px] text-[#5c6577]">{active.content.split(/\s+/).filter(Boolean).length} palavras</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- DESIGN */

function DesignTab({
  product,
  cover,
  busy,
  onPatch,
  onGenerate,
}: {
  product: Product;
  cover: string | null;
  busy: boolean;
  onPatch: (p: Partial<Product>) => void;
  onGenerate: () => void;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="surface space-y-5 p-5">
        <SectionTitle title="Design Engine" subtitle="Estilo aplicado à capa e ao miolo exportado" />
        <div>
          <p className="mb-2 text-xs text-[#a5adbd]">Estilo</p>
          <div className="flex flex-wrap gap-2">
            {STYLES.map((s) => (
              <button
                key={s}
                onClick={() => onPatch({ designStyle: s })}
                className={cx(
                  "rounded-lg border px-3 py-1.5 text-[11px]",
                  product.designStyle === s ? "border-[#4f7cff] bg-[#4f7cff]/10 text-white" : "border-[#232936] text-[#8a93a6] hover:text-white",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs text-[#a5adbd]">Paleta</p>
          <div className="flex flex-wrap gap-2">
            {PALETTES.map((p) => (
              <button
                key={p}
                onClick={() => onPatch({ coverPalette: p })}
                className={cx(
                  "rounded-lg border px-3 py-1.5 text-[11px]",
                  product.coverPalette === p ? "border-[#8b5cf6] bg-[#8b5cf6]/10 text-white" : "border-[#232936] text-[#8a93a6] hover:text-white",
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <Button variant="ai" loading={busy} onClick={onGenerate}>Gerar capa</Button>
        <p className="text-[11px] leading-relaxed text-[#5c6577]">
          A capa é gerada como vetor (SVG) pela própria plataforma — sem custo de crédito e sem dependência externa.
          Geração de imagens por IA pode ser conectada futuramente pela mesma camada de assets.
        </p>
      </div>

      <div className="surface flex items-center justify-center p-5">
        {cover ? (
          <div className="w-full max-w-[280px]" dangerouslySetInnerHTML={{ __html: cover }} />
        ) : (
          <p className="text-xs text-[#6b7386]">Nenhuma capa gerada ainda.</p>
        )}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- SALES */

function SalesTab({
  product,
  salesPage,
  setSalesPage,
  busy,
  onGenerate,
  onPatchProduct,
  push,
  aiConfigured,
}: {
  product: Product;
  salesPage: SalesPage | null;
  setSalesPage: (s: SalesPage) => void;
  busy: boolean;
  onGenerate: () => void;
  onPatchProduct: (p: Partial<Product>) => void;
  push: (m: string, t?: "info" | "success" | "error") => void;
  aiConfigured: boolean;
}) {
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!salesPage) return;
    setSaving(true);
    const res = await fetch(`/api/products/${product.id}/sales-page`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        headline: salesPage.headline,
        subheadline: salesPage.subheadline,
        problem: salesPage.problem,
        solution: salesPage.solution,
        benefits: salesPage.benefits,
        bonuses: salesPage.bonuses,
        differentials: salesPage.differentials,
        contents: salesPage.contents,
        faq: salesPage.faq,
        guarantee: salesPage.guarantee,
        ctaLabel: salesPage.ctaLabel,
      }),
    });
    setSaving(false);
    push(res.ok ? "Página de vendas salva." : "Não foi possível salvar agora.", res.ok ? "success" : "error");
  }

  if (!salesPage) {
    return (
      <div className="surface space-y-4 p-6 text-center">
        <p className="text-sm text-white">Nenhuma página de vendas ainda.</p>
        <p className="mx-auto max-w-md text-xs leading-relaxed text-[#a5adbd]">
          A IA gera headline, problema, solução, benefícios, bônus, FAQ e CTA a partir do seu produto. Depois você edita
          tudo livremente. {aiConfigured ? "" : "Sem provedor de IA configurado, o motor local monta a estrutura a partir dos seus dados."}
        </p>
        <Button variant="ai" loading={busy} onClick={onGenerate}>Gerar página de vendas (300 créditos)</Button>
      </div>
    );
  }

  const listField = (key: "benefits" | "contents" | "differentials" | "bonuses", label: string) => (
    <Field label={label} hint="Um item por linha.">
      <Textarea
        rows={4}
        value={salesPage[key].join("\n")}
        onChange={(e) => setSalesPage({ ...salesPage, [key]: e.target.value.split("\n").filter(Boolean) })}
      />
    </Field>
  );

  return (
    <div className="space-y-5">
      <div className="surface space-y-4 p-5">
        <SectionTitle
          title="Página de vendas"
          subtitle={salesPage.published ? "Publicada" : "Rascunho"}
          action={
            <div className="flex gap-2">
              <Button size="sm" variant="ai" loading={busy} onClick={onGenerate}>Regerar</Button>
              <Button size="sm" loading={saving} onClick={save}>Salvar</Button>
            </div>
          }
        />
        <Field label="Headline">
          <Input value={salesPage.headline} onChange={(e) => setSalesPage({ ...salesPage, headline: e.target.value })} />
        </Field>
        <Field label="Subheadline">
          <Input value={salesPage.subheadline ?? ""} onChange={(e) => setSalesPage({ ...salesPage, subheadline: e.target.value })} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Problema">
            <Textarea rows={4} value={salesPage.problem ?? ""} onChange={(e) => setSalesPage({ ...salesPage, problem: e.target.value })} />
          </Field>
          <Field label="Solução">
            <Textarea rows={4} value={salesPage.solution ?? ""} onChange={(e) => setSalesPage({ ...salesPage, solution: e.target.value })} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {listField("benefits", "Benefícios")}
          {listField("contents", "O que está incluído")}
          {listField("differentials", "Diferenciais")}
          {listField("bonuses", "Bônus")}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Garantia" hint="Defina apenas se você realmente oferece.">
            <Textarea rows={2} value={salesPage.guarantee ?? ""} onChange={(e) => setSalesPage({ ...salesPage, guarantee: e.target.value })} />
          </Field>
          <div className="space-y-4">
            <Field label="Texto do CTA">
              <Input value={salesPage.ctaLabel} onChange={(e) => setSalesPage({ ...salesPage, ctaLabel: e.target.value })} />
            </Field>
            <Field label="Preço (R$)">
              <Input
                type="number"
                min={0}
                defaultValue={product.priceCents / 100}
                onBlur={(e) => onPatchProduct({ priceCents: Math.round(Number(e.target.value) * 100) })}
              />
            </Field>
          </div>
        </div>
        <Field label="FAQ" hint="Formato: pergunta | resposta (um por linha).">
          <Textarea
            rows={5}
            value={salesPage.faq.map((f) => `${f.q} | ${f.a}`).join("\n")}
            onChange={(e) =>
              setSalesPage({
                ...salesPage,
                faq: e.target.value
                  .split("\n")
                  .filter(Boolean)
                  .map((line) => {
                    const [q, ...rest] = line.split("|");
                    return { q: q.trim(), a: rest.join("|").trim() };
                  }),
              })
            }
          />
        </Field>
      </div>

      <div className="surface p-5 text-[11px] leading-relaxed text-[#5c6577]">
        Checkout: gateway de pagamento não configurado nesta instalação. O botão da página pública registra o evento
        <span className="text-[#a5adbd]"> checkout_started </span> e cria um pedido PENDING — nenhuma venda é simulada.
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- MARKETING */

const CHANNEL_TONE: Record<string, "brand" | "ai" | "neutral"> = {
  INSTAGRAM: "ai",
  FACEBOOK: "brand",
  EMAIL: "neutral",
  ADS: "brand",
};

function MarketingTab({
  content,
  setContent,
  busy,
  onGenerate,
  push,
}: {
  content: ContentItem[];
  setContent: (c: ContentItem[]) => void;
  busy: boolean;
  onGenerate: () => void;
  push: (m: string, t?: "info" | "success" | "error") => void;
}) {
  async function setStatus(id: string, status: string) {
    const res = await fetch(`/api/content/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      push(json.error ?? "Não foi possível atualizar.", "error");
      return;
    }
    setContent(content.map((c) => (c.id === id ? { ...c, status } : c)));
    push("Status atualizado.", "success");
  }

  if (content.length === 0) {
    return (
      <div className="surface space-y-4 p-6 text-center">
        <p className="text-sm text-white">Nenhum conteúdo promocional ainda.</p>
        <p className="mx-auto max-w-md text-xs leading-relaxed text-[#a5adbd]">
          Gere posts, Stories, roteiros de Reels, e-mails de lançamento e variações de anúncio conectados a este produto.
        </p>
        <Button variant="ai" loading={busy} onClick={onGenerate}>Gerar conteúdo (350 créditos)</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SectionTitle
        title="Conteúdo promocional"
        subtitle={`${content.length} itens no calendário`}
        action={<Button size="sm" variant="ai" loading={busy} onClick={onGenerate}>Gerar mais</Button>}
      />
      <div className="grid gap-3 md:grid-cols-2">
        {content.map((c) => (
          <div key={c.id} className="surface p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge tone={CHANNEL_TONE[c.channel] ?? "neutral"}>{c.channel}</Badge>
                <span className="text-[10px] uppercase tracking-wider text-[#6b7386]">{c.format}</span>
              </div>
              <span className="text-[10px] text-[#5c6577]">
                {c.scheduledFor ? new Date(c.scheduledFor).toLocaleDateString("pt-BR") : "sem data"}
              </span>
            </div>
            <p className="mt-2.5 text-xs font-medium text-white">{c.title}</p>
            <p className="mt-1.5 whitespace-pre-wrap text-[11px] leading-relaxed text-[#a5adbd]">{c.body}</p>
            {c.cta ? <p className="mt-2 text-[11px] text-[#7396ff]">CTA: {c.cta}</p> : null}
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#171b24] pt-3">
              <Badge tone={c.status === "PUBLISHED" ? "success" : c.status === "SCHEDULED" ? "brand" : c.status === "FAILED" ? "danger" : "neutral"}>
                {c.status}
              </Badge>
              <Button size="sm" variant="ghost" onClick={() => setStatus(c.id, "AWAITING_APPROVAL")}>Aprovar depois</Button>
              <Button size="sm" variant="ghost" onClick={() => setStatus(c.id, "SCHEDULED")}>Agendar</Button>
              <Button size="sm" variant="ghost" onClick={() => setStatus(c.id, "PUBLISHED")}>Publicar</Button>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[11px] leading-relaxed text-[#5c6577]">
        Publicação direta em redes sociais exige integração oficial conectada e aprovação explícita. Enquanto não houver
        conta conectada, a ação de publicar retorna <span className="text-[#a5adbd]">Integration not configured</span>.
      </p>
    </div>
  );
}
