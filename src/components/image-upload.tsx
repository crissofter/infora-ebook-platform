"use client";

import { useState } from "react";
import { Field, Input, Button, useToast } from "@/components/ui";
import type { ProductImage } from "@/lib/media";

export type ChapterImage = ProductImage & { chapterId: string; assetId: string; caption: string | null };

export function ImageUpload({ productId, chapterId, onUploaded }: { productId: string; chapterId?: string; onUploaded: (image: ChapterImage & ProductImage) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [inputKey, setInputKey] = useState(0);
  const { push } = useToast();
  async function upload() {
    if (!file) return;
    setBusy(true);
    try {
      if (file.size > 3 * 1024 * 1024) throw new Error("Use uma imagem de até 3 MB.");
      const form = new FormData();
      form.set("file", file); form.set("kind", chapterId ? "CHAPTER" : "COVER");
      if (chapterId) { form.set("chapterId", chapterId); form.set("caption", caption); }
      const res = await fetch(`/api/products/${productId}/images`, { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Não foi possível enviar a imagem.");
      onUploaded(json.data); setFile(null); setCaption(""); setInputKey((v) => v + 1);
      push("Imagem salva.", "success");
    } catch (e) { push((e as Error).message, "error"); } finally { setBusy(false); }
  }
  return <div className="space-y-3">
    <Field label={chapterId ? "Adicionar imagem ao capítulo" : "Enviar sua capa"} hint="PNG, JPEG ou WebP, até 3 MB. Use imagens que você tem direito de publicar.">
      <Input key={inputKey} type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
    </Field>
    {chapterId ? <Field label="Legenda e descrição da imagem"><Input maxLength={600} value={caption} onChange={(e) => setCaption(e.target.value)} /></Field> : null}
    <Button size="sm" variant="secondary" disabled={!file} loading={busy} onClick={upload}>Enviar imagem</Button>
  </div>;
}
