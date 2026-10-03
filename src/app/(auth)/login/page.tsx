"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Field, Input } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Não foi possível entrar agora.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Não conseguimos concluir esta operação agora. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-white">Entrar na INFORA</h1>
      <p className="mt-1.5 text-xs text-[#a5adbd]">Acesse seu workspace e continue de onde parou.</p>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <Field label="E-mail">
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" />
        </Field>
        <Field label="Senha">
          <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </Field>
        {error ? <p className="rounded-lg border border-rose-400/25 bg-rose-400/10 px-3 py-2 text-xs text-rose-200">{error}</p> : null}
        <Button type="submit" loading={loading} className="w-full">
          Entrar
        </Button>
      </form>

      <div className="mt-6 flex items-center justify-between text-xs text-[#6b7386]">
        <Link href="/forgot-password" className="hover:text-white">Esqueci minha senha</Link>
        <Link href="/signup" className="text-[#7396ff] hover:text-white">Criar conta</Link>
      </div>
      <p className="mt-8 text-[11px] leading-relaxed text-[#5c6577]">
        Login social (Google, Apple) ainda não configurado nesta instalação — a arquitetura de autenticação já está
        preparada para provedores externos.
      </p>
    </div>
  );
}
