"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Badge, Button, Field, Input, Select, Textarea, cx, useToast } from "@/components/ui";

const TYPES = [
  { v: "EBOOK", l: "E-book" },
  { v: "GUIDE", l: "Guia" },
  { v: "PLANNER", l: "Planner" },
  { v: "TEMPLATE", l: "Template" },
  { v: "COURSE", l: "Curso" },
  { v: "BUNDLE", l: "Bundle" },
];

const STYLES = ["PREMIUM", "MINIMALISTA", "MODERNO", "ELEGANTE", "EDITORIAL", "CORPORATIVO", "CRIATIVO"];

const STAGES = ["Registrando a ideia", "Definindo conceito e promessa", "Montando a estrutura", "Gerando capítulos"];

function NewProductForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { push } = useToast();
  const onboarding = params.get("onboarding") === "1";

  const [form, setForm] = useState({
    type: "EBOOK",
    idea: "",
    audience: "",
    objective: "",
    problem: "",
    designStyle: "PREMIUM",
  });
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) return;
    const t = setInterval(() => setStage((s) => (s + 1) % STAGES.length), 1600);
    return () => clearInterval(t);
  }, [loading]);

  const set = <K extends keyof typeof form>(k: K, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, generate: true }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Não foi possível criar o produto agora.");
        return;
      }
      push("Blueprint gerado com sucesso.", "success");
      router.push(`/products/${json.data.product.id}`);
      router.refresh();
    } catch {
      setError("Não conseguimos concluir esta operação agora. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      {onboarding ? (
        <div className="mb-6 rounded-xl border border-[#4f7cff]/25 bg-[#4f7cff]/8 p-4">
          <p className="text-xs font-medium text-[#7396ff]">Bem-vindo à INFORA</p>
          <p className="mt-1 text-xs leading-relaxed text-[#c5cbd7]">
            Vamos direto ao primeiro resultado: descreva sua ideia e a INFORA monta o conceito, a promessa e a estrutura
            completa do produto.
          </p>
        </div>
      ) : null}

      <h1 className="text-xl font-semibold tracking-tight text-white">Novo produto</h1>
      <p className="mt-1 text-xs text-[#a5adbd]">
        Quanto mais específico você for, melhor será o blueprint gerado.
      </p>

      <form onSubmit={submit} className="mt-7 space-y-5">
        <div className="surface space-y-4 p-5">
          <Field label="Tipo de produto">
            <Select value={form.type} onChange={(e) => set("type", e.target.value)}>
              {TYPES.map((t) => (
                <option key={t.v} value={t.v}>{t.l}</option>
              ))}
            </Select>
          </Field>

          <Field label="Sua ideia" hint='Ex.: "Um e-book para casais que desejam melhorar sua comunicação e conexão."'>
            <Textarea
              required
              minLength={10}
              rows={3}
              value={form.idea}
              onChange={(e) => set("idea", e.target.value)}
              placeholder="Descreva o tema do produto"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Público">
              <Input required value={form.audience} onChange={(e) => set("audience", e.target.value)} placeholder="casais em relacionamento longo" />
            </Field>
            <Field label="Objetivo">
              <Input required value={form.objective} onChange={(e) => set("objective", e.target.value)} placeholder="melhorar a comunicação diária" />
            </Field>
          </div>

          <Field label="Problema que deseja resolver">
            <Textarea required rows={2} value={form.problem} onChange={(e) => set("problem", e.target.value)} placeholder="discussões repetitivas e falta de diálogo" />
          </Field>

          <Field label="Direção visual">
            <div className="flex flex-wrap gap-2">
              {STYLES.map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => set("designStyle", s)}
                  className={cx(
                    "rounded-lg border px-3 py-1.5 text-[11px] transition-colors",
                    form.designStyle === s ? "border-[#4f7cff] bg-[#4f7cff]/10 text-white" : "border-[#232936] text-[#8a93a6] hover:text-white",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </Field>
        </div>

        {error ? <p className="rounded-lg border border-rose-400/25 bg-rose-400/10 px-3 py-2 text-xs text-rose-200">{error}</p> : null}

        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-[#5c6577]">Esta operação consome 450 créditos de IA.</p>
          <Button type="submit" loading={loading} variant="ai">
            Gerar produto com IA
          </Button>
        </div>
      </form>

      {loading ? (
        <div className="surface mt-6 p-5">
          <div className="flex items-center gap-2">
            <Badge tone="ai">Processando</Badge>
            <span className="text-xs text-[#c5cbd7]">{STAGES[stage]}…</span>
          </div>
          <div className="mt-4 space-y-2">
            {STAGES.map((s, i) => (
              <div key={s} className="flex items-center gap-2 text-[11px]">
                <span className={cx("h-1.5 w-1.5 rounded-full", i <= stage ? "bg-[#8b5cf6]" : "bg-[#232936]")} />
                <span className={i <= stage ? "text-[#c5cbd7]" : "text-[#5c6577]"}>{s}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[10px] text-[#5c6577]">
            Você pode continuar navegando; avisaremos quando terminar.
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function NewProductPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl text-xs text-[#6b7386]">Carregando…</div>}>
      <NewProductForm />
    </Suspense>
  );
}
