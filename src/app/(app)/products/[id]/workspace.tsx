"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ImageUpload, type ChapterImage } from "@/components/image-upload";
import { ImageGenerate } from "@/components/image-generate";
import type { ProductImage } from "@/lib/media";
import { MarketingEditor } from "@/components/marketing-editor";
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
  checkoutUrl: string | null;
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

function salesPatch(page: SalesPage) {
  const { headline, subheadline, problem, solution, benefits, contents, differentials, bonuses, faq, guarantee, ctaLabel, checkoutUrl } = page;
  return { headline, subheadline, problem, solution, benefits, contents, differentials, bonuses, faq, guarantee, ctaLabel, checkoutUrl };
}

const STYLES = ["PREMIUM", "MINIMALISTA", "MODERNO", "ELEGANTE", "EDITORIAL", "CORPORATIVO", "CRIATIVO"];
const PALETTES = ["MIDNIGHT", "VIOLET", "IVORY", "GRAPHITE", "EMERALD"];

export function ProductWorkspace({
  product: initialProduct,
  chapters: initialChapters,
  salesPage: initialSalesPage,
  content: initialContent,
  coverImage: initialCover,
  chapterImages: initialImages,
  imageConfigured,
  metrics,
  aiConfigured,
}: {
  product: Product & { createdAt: string; updatedAt: string; publishedAt: string | null };
  chapters: Chapter[];
  salesPage: SalesPage | null;
  content: ContentItem[];
  coverImage: ProductImage | null;
  chapterImages: ChapterImage[];
  imageConfigured: boolean;
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
  const [images, setImages] = useState(initialImages);
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
        setCover({ id: data.asset.id, name: data.asset.name, url: `/api/assets/${data.asset.id}` });
        push("Capa gerada.", "success");
      } else if (kind === "sales_page") {
        setSalesPage(data.salesPage);
        push("Página de vendas gerada.", "success");
      } else {
        setContent((previous) => [...previous, ...data.items]);
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
    const preview = window.open("", "_blank");
    setBusy("export");
    try {
      await call(`/api/products/${product.id}/export`, "POST");
      if (preview) { preview.opener = null; preview.location.href = `/products/${product.id}/export`; }
      else throw new Error("Permita a janela de exportação ou use Pré-visualizar.");
      push("Exportação registrada. Use 'Salvar como PDF' na janela aberta.", "success");
    } catch (e) {
      preview?.close();
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
      await call(`/api/products/${product.id}/sales-page`, "PATCH", { ...salesPatch(salesPage), published: next });
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
        <EditorTab productId={product.id} chapters={chapters} setChapters={setChapters} push={push} images={images} setImages={setImages} imageConfigured={imageConfigured} />
      ) : null}

      {tab === "design" ? (
        <DesignTab
          product={product}
          cover={cover}
          onCover={setCover}
          imageConfigured={imageConfigured}
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
        <MarketingEditor content={content} onChange={setContent} cover={cover} salesPath={salesPage?.published ? `/s/${product.slug}` : null} busy={busy === "marketing"} onGenerate={() => generate("marketing")} />
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
  images,
  setImages,
  imageConfigured,
}: {
  productId: string;
  chapters: Chapter[];
  setChapters: (c: Chapter[]) => void;
  images: ChapterImage[];
  setImages: (images: ChapterImage[]) => void;
  imageConfigured: boolean;
  push: (m: string, t?: "info" | "success" | "error") => void;
}) {
  const [activeId, setActiveId] = useState(chapters[0]?.id ?? null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const pending = useRef(new Map<string, Partial<Chapter>>());
  const queues = useRef(new Map<string, Promise<void>>());
  const active = useMemo(() => chapters.find((c) => c.id === activeId) ?? null, [chapters, activeId]);

  const saveChapter = useCallback((id: string) => {
    const queued = (queues.current.get(id) ?? Promise.resolve()).then(async () => {
      const patch = pending.current.get(id);
      if (!patch) return;
      pending.current.delete(id);
      setSaving(true);
      try {
        const res = await fetch(`/api/chapters/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error ?? "Não conseguimos salvar agora.");
        }
        setSavedAt(new Date().toLocaleTimeString("pt-BR"));
      } catch (e) {
        pending.current.set(id, { ...patch, ...pending.current.get(id) });
        push((e as Error).message, "error");
      } finally { setSaving(false); }
    });
    queues.current.set(id, queued);
    return queued;
  }, [push]);

  useEffect(() => {
    const scheduled = timers.current;
    const changes = pending.current;
    return () => {
      scheduled.forEach(clearTimeout);
      for (const id of changes.keys()) void saveChapter(id);
    };
  }, [saveChapter]);

  function autosave(id: string, patch: Partial<Chapter>) {
    clearTimeout(timers.current.get(id));
    pending.current.set(id, { ...pending.current.get(id), ...patch });
    timers.current.set(id, setTimeout(() => void saveChapter(id), 900));
  }

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
    clearTimeout(timers.current.get(id));
    pending.current.delete(id);
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
            <Button size="sm" variant="secondary" loading={saving} onClick={() => void saveChapter(active.id)}>Salvar alterações</Button>
            <div className="space-y-4 border-t border-[#232936] pt-5">
              <h3 className="text-sm text-white">Imagens do capítulo</h3>
              <ImageGenerate key={`ai-${active.id}`} productId={productId} chapterId={active.id} configured={imageConfigured} onGenerated={(image) => setImages([...images, image])} />
              <ImageUpload key={active.id} productId={productId} chapterId={active.id} onUploaded={(image) => setImages([...images, image])} />
              {images.filter((image) => image.chapterId === active.id).map((image) => <figure key={image.id} className="space-y-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt={image.caption || image.name} className="max-h-80 w-full rounded-lg object-contain" />
                {image.caption ? <figcaption className="text-xs text-[#a5adbd]">{image.caption}</figcaption> : null}
                <Button size="sm" variant="danger" onClick={async () => {
                  const res = await fetch(`/api/chapter-blocks/${image.id}`, { method: "DELETE" });
                  if (!res.ok) return push("Não foi possível remover a imagem.", "error");
                  setImages(images.filter((item) => item.id !== image.id));
                }}>Remover do capítulo</Button>
              </figure>)}
            </div>
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
  onCover,
  imageConfigured,
  busy,
  onPatch,
  onGenerate,
}: {
  product: Product;
  cover: ProductImage | null;
  onCover: (image: ProductImage) => void;
  imageConfigured: boolean;
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
        <ImageGenerate productId={product.id} configured={imageConfigured} onGenerated={onCover} />
        <ImageUpload productId={product.id} onUploaded={onCover} />
        <Button variant="secondary" loading={busy} onClick={onGenerate}>Gerar capa tipográfica gratuita</Button>
        <p className="text-[11px] leading-relaxed text-[#5c6577]">
          A capa é gerada como vetor (SVG) pela própria plataforma — sem custo de crédito e sem dependência externa.
          Para uma capa ilustrada, use a geração por IA acima ou envie sua própria imagem.
        </p>
      </div>

            <div className="surface flex items-center justify-center p-5">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover.url} alt={`Capa de ${product.title}`} className="w-full max-w-[280px] rounded-lg" />
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
    try {
      const res = await fetch(`/api/products/${product.id}/sales-page`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(salesPatch(salesPage)) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Não foi possível salvar agora.");
      setSalesPage(json.data);
      push("Página de vendas salva.", "success");
    } catch (e) { push((e as Error).message, "error"); } finally { setSaving(false); }
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
        <Field label="Link de checkout" hint="Cole o endereço HTTPS do pagamento (Hotmart, Kiwify, Stripe ou outro). Sem link, a compra fica desativada.">
          <Input type="url" maxLength={2000} placeholder="https://..." value={salesPage.checkoutUrl ?? ""} onChange={(e) => setSalesPage({ ...salesPage, checkoutUrl: e.target.value })} />
        </Field>
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
        Revise o texto, salve e use Publicar para disponibilizar sua página. O checkout externo é responsável pelo pagamento e pela entrega; a INFORA registra os acessos e cliques, sem confirmar vendas automaticamente.
        {salesPage.published ? <a href={`/s/${product.slug}`} target="_blank" rel="noreferrer" className="mt-3 block text-[#7396ff]">Abrir página de vendas ↗</a> : null}
      </div>
    </div>
  );
}
