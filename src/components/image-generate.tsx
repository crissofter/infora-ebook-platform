"use client";

import { useState } from "react";
import { Button, Field, Textarea, useToast } from "@/components/ui";
import type { ChapterImage } from "@/components/image-upload";

export function ImageGenerate({ productId, chapterId, configured, onGenerated }: { productId: string; chapterId?: string; configured: boolean; onGenerated: (image: ChapterImage) => void }) {
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const { push } = useToast();
  async function generate() {
    setBusy(true);
    try {
      const res = await fetch(`/api/products/${productId}/images/generate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: chapterId ? "CHAPTER" : "COVER", chapterId, prompt }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Não foi possível gerar a imagem.");
      onGenerated(json.data); push("Imagem gerada e salva.", "success");
    } catch (e) { push((e as Error).message, "error"); } finally { setBusy(false); }
  }
  return <div className="space-y-3">
    <Field label="Descreva a imagem que deseja" hint="Informe a cena, as cores e o estilo. O tema do ebook será incluído automaticamente.">
      <Textarea rows={3} maxLength={1600} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Ex.: ilustração acolhedora, luz natural, tons suaves e composição editorial" />
    </Field>
    <Button variant="ai" loading={busy} disabled={!configured || prompt.trim().length < 10} onClick={generate}>Gerar imagem com IA</Button>
    <p className="text-[11px] text-[#8a93a6]">{configured ? "A geração pode levar até dois minutos e usa o saldo do provedor de imagens, separado dos créditos de texto." : "A geração de imagens precisa ser ativada pelo administrador nas integrações da hospedagem."}</p>
  </div>;
}
