"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, EmptyState, Field, Input, Modal, SectionTitle, Textarea, useToast } from "@/components/ui";

type Project = {
  id: string;
  name: string;
  description: string | null;
  audience: string | null;
  createdAt: string;
  productCount: number;
};

export function ProjectsClient({
  initial,
  planName,
  maxProjects,
}: {
  initial: Project[];
  planName: string;
  maxProjects: number;
}) {
  const router = useRouter();
  const { push } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", audience: "" });
  const [loading, setLoading] = useState(false);

  async function create() {
    setLoading(true);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      push(json.error ?? "Não foi possível criar o projeto.", "error");
      return;
    }
    push("Projeto criado.", "success");
    setOpen(false);
    setForm({ name: "", description: "", audience: "" });
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-5xl">
      <SectionTitle
        title="Projetos"
        subtitle={`Plano ${planName} · até ${maxProjects} projeto(s) · ${initial.length} em uso`}
        action={<Button size="sm" onClick={() => setOpen(true)}>+ Novo projeto</Button>}
      />

      {initial.length === 0 ? (
        <EmptyState
          title="Nenhum projeto ainda."
          description="Projetos organizam produtos, campanhas e resultados em torno de um mesmo tema."
          action={<Button onClick={() => setOpen(true)}>+ Criar primeiro projeto</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {initial.map((p) => (
            <div key={p.id} className="surface flex flex-col p-5">
              <h3 className="text-sm font-semibold text-white">{p.name}</h3>
              <p className="mt-1.5 flex-1 text-xs leading-relaxed text-[#a5adbd]">
                {p.description || "Sem descrição."}
              </p>
              {p.audience ? <p className="mt-2 text-[11px] text-[#6b7386]">Público: {p.audience}</p> : null}
              <div className="mt-4 flex items-center justify-between border-t border-[#171b24] pt-3 text-[11px] text-[#6b7386]">
                <span>{p.productCount} produto(s)</span>
                <Link href="/products/new" className="text-[#7396ff] hover:text-white">+ produto</Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Novo projeto"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button loading={loading} onClick={create} disabled={form.name.trim().length < 2}>Criar projeto</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Nome">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Lançamento 2026" />
          </Field>
          <Field label="Descrição">
            <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <Field label="Público">
            <Input value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
