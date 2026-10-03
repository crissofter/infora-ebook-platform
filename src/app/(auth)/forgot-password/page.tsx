"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, Field, Input } from "@/components/ui";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [issuedToken, setIssuedToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function requestToken(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const res = await fetch("/api/auth/password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const json = await res.json();
    setLoading(false);
    if (json?.data?.delivery === "not_configured" && json?.data?.token) {
      setIssuedToken(json.data.token as string);
      setToken(json.data.token as string);
      setMessage("Provedor de e-mail não configurado nesta instalação. Use o código abaixo para redefinir a senha.");
    } else {
      setMessage("Se existir uma conta com este e-mail, enviaremos as instruções de recuperação.");
    }
  }

  async function applyReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/auth/password", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const json = await res.json();
    setLoading(false);
    setMessage(res.ok ? "Senha redefinida. Você já pode entrar." : (json.error ?? "Não foi possível redefinir agora."));
  }

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-white">Recuperar acesso</h1>
      <p className="mt-1.5 text-xs text-[#a5adbd]">Informe seu e-mail para iniciar a recuperação de senha.</p>

      <form onSubmit={requestToken} className="mt-8 space-y-4">
        <Field label="E-mail">
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" />
        </Field>
        <Button type="submit" loading={loading} className="w-full">
          Solicitar recuperação
        </Button>
      </form>

      {message ? (
        <p className="mt-5 rounded-lg border border-[#232936] bg-[#0d1017] px-3 py-2 text-xs text-[#c5cbd7]">{message}</p>
      ) : null}

      {issuedToken ? (
        <form onSubmit={applyReset} className="mt-6 space-y-4 border-t border-[#171b24] pt-6">
          <Field label="Código de recuperação">
            <Input value={token} onChange={(e) => setToken(e.target.value)} />
          </Field>
          <Field label="Nova senha" hint="Mínimo de 8 caracteres.">
            <Input type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Button type="submit" variant="secondary" loading={loading} className="w-full">
            Redefinir senha
          </Button>
        </form>
      ) : null}

      <p className="mt-8 text-xs text-[#6b7386]">
        <Link href="/login" className="hover:text-white">Voltar para o login</Link>
      </p>
    </div>
  );
}
