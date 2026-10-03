"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Field, Input, Select, cx } from "@/components/ui";

const GOALS = [
  "Criar meu primeiro produto digital",
  "Escalar produtos que já vendo",
  "Gerar materiais para captar clientes",
  "Produzir infoprodutos para clientes",
];

const CREATOR_TYPES = ["Especialista / Profissional", "Criador de conteúdo", "Pequeno negócio", "Agência", "Outro"];

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    organizationName: "",
    goal: GOALS[0],
    creatorType: CREATOR_TYPES[0],
    acceptTerms: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.acceptTerms) {
      setError("É necessário aceitar os Termos de Uso e a Política de Privacidade.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Não foi possível criar sua conta agora.");
        return;
      }
      router.push("/products/new?onboarding=1");
      router.refresh();
    } catch {
      setError("Não conseguimos concluir esta operação agora. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex gap-1.5">
        {[1, 2].map((s) => (
          <span key={s} className={cx("h-1 flex-1 rounded-full", step >= s ? "bg-[#4f7cff]" : "bg-[#1f2531]")} />
        ))}
      </div>

      <h1 className="text-xl font-semibold tracking-tight text-white">
        {step === 1 ? "Criar sua conta" : "Sobre o seu momento"}
      </h1>
      <p className="mt-1.5 text-xs text-[#a5adbd]">
        {step === 1 ? "Leva menos de um minuto." : "Usamos isso para orientar o seu primeiro produto."}
      </p>

      <form onSubmit={submit} className="mt-8 space-y-4">
        {step === 1 ? (
          <>
            <Field label="Nome completo">
              <Input required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Seu nome" />
            </Field>
            <Field label="E-mail">
              <Input type="email" required value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="voce@email.com" />
            </Field>
            <Field label="Senha" hint="Mínimo de 8 caracteres.">
              <Input type="password" minLength={8} required value={form.password} onChange={(e) => set("password", e.target.value)} />
            </Field>
            <Button
              type="button"
              className="w-full"
              onClick={() => {
                if (form.name.length < 2 || !form.email.includes("@") || form.password.length < 8) {
                  setError("Preencha nome, e-mail válido e senha com ao menos 8 caracteres.");
                  return;
                }
                setError(null);
                setStep(2);
              }}
            >
              Continuar
            </Button>
          </>
        ) : (
          <>
            <Field label="Nome do workspace" hint="Pode ser o seu nome ou o da sua marca.">
              <Input value={form.organizationName} onChange={(e) => set("organizationName", e.target.value)} placeholder="Minha marca" />
            </Field>
            <Field label="Qual é o seu objetivo?">
              <Select value={form.goal} onChange={(e) => set("goal", e.target.value)}>
                {GOALS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </Select>
            </Field>
            <Field label="Tipo de criador">
              <Select value={form.creatorType} onChange={(e) => set("creatorType", e.target.value)}>
                {CREATOR_TYPES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </Field>
            <label className="flex items-start gap-2.5 text-[11px] leading-relaxed text-[#a5adbd]">
              <input
                type="checkbox"
                checked={form.acceptTerms}
                onChange={(e) => set("acceptTerms", e.target.checked)}
                className="mt-0.5 h-3.5 w-3.5 accent-[#4f7cff]"
              />
              <span>
                Li e aceito os <Link href="/legal/termos" className="text-[#7396ff]">Termos de Uso</Link> e a{" "}
                <Link href="/legal/privacidade" className="text-[#7396ff]">Política de Privacidade</Link>.
              </span>
            </label>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setStep(1)}>Voltar</Button>
              <Button type="submit" loading={loading} className="flex-1">Criar conta e começar</Button>
            </div>
          </>
        )}

        {error ? <p className="rounded-lg border border-rose-400/25 bg-rose-400/10 px-3 py-2 text-xs text-rose-200">{error}</p> : null}
      </form>

      <p className="mt-6 text-xs text-[#6b7386]">
        Já tem conta? <Link href="/login" className="text-[#7396ff] hover:text-white">Entrar</Link>
      </p>
    </div>
  );
}
