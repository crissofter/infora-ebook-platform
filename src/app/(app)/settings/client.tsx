"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, Button, Field, Input, Modal, SectionTitle, useToast } from "@/components/ui";

export function SettingsClient({
  user,
  organization,
  integrations,
}: {
  user: { name: string; email: string; goal: string | null; creatorType: string | null; role: string };
  organization: { name: string; slug: string; planCode: string; role: string };
  integrations: Record<string, string>;
}) {
  const router = useRouter();
  const { push } = useToast();
  const [profile, setProfile] = useState({ name: user.name, goal: user.goal ?? "", creatorType: user.creatorType ?? "" });
  const [orgName, setOrgName] = useState(organization.name);
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "" });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function save(payload: Record<string, unknown>) {
    setSaving(true);
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    setSaving(false);
    push(res.ok ? "Alterações salvas." : (json.error ?? "Não foi possível salvar."), res.ok ? "success" : "error");
    if (res.ok) router.refresh();
  }

  async function exportData() {
    const res = await fetch("/api/account");
    const json = await res.json();
    const blob = new Blob([JSON.stringify(json.data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `infora-dados-${organization.slug}.json`;
    a.click();
    URL.revokeObjectURL(url);
    push("Exportação de dados concluída.", "success");
  }

  async function deleteAccount() {
    const res = await fetch("/api/account", { method: "DELETE" });
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      push("Não foi possível excluir a conta agora.", "error");
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <SectionTitle title="Configurações" subtitle="Perfil, organização, integrações e privacidade" />

      <div className="surface space-y-4 p-5">
        <h3 className="text-sm font-semibold text-white">Perfil</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome">
            <Input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
          </Field>
          <Field label="E-mail" hint="A alteração de e-mail exige verificação — ainda não configurada.">
            <Input value={user.email} disabled />
          </Field>
          <Field label="Objetivo">
            <Input value={profile.goal} onChange={(e) => setProfile({ ...profile, goal: e.target.value })} />
          </Field>
          <Field label="Tipo de criador">
            <Input value={profile.creatorType} onChange={(e) => setProfile({ ...profile, creatorType: e.target.value })} />
          </Field>
        </div>
        <Button size="sm" loading={saving} onClick={() => save(profile)}>Salvar perfil</Button>
      </div>

      <div className="surface space-y-4 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Organização</h3>
          <div className="flex gap-2">
            <Badge tone="brand">{organization.planCode}</Badge>
            <Badge>{organization.role}</Badge>
          </div>
        </div>
        <Field label="Nome do workspace">
          <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} />
        </Field>
        <p className="text-[11px] text-[#5c6577]">Identificador público: {organization.slug}</p>
        <Button size="sm" variant="secondary" loading={saving} onClick={() => save({ organizationName: orgName })}>
          Salvar organização
        </Button>
      </div>

      <div className="surface space-y-4 p-5">
        <h3 className="text-sm font-semibold text-white">Segurança</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Senha atual">
            <Input type="password" value={passwords.currentPassword} onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })} />
          </Field>
          <Field label="Nova senha" hint="Mínimo de 8 caracteres.">
            <Input type="password" value={passwords.newPassword} onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} />
          </Field>
        </div>
        <Button
          size="sm"
          variant="secondary"
          loading={saving}
          disabled={passwords.newPassword.length < 8}
          onClick={() => save(passwords)}
        >
          Alterar senha
        </Button>
      </div>

      <div className="surface space-y-3 p-5">
        <h3 className="text-sm font-semibold text-white">Integrações</h3>
        <ul className="space-y-2 text-xs">
          {Object.entries(integrations).map(([k, v]) => (
            <li key={k} className="flex items-center justify-between rounded-lg border border-[#1f2531] bg-[#0d1017] px-3 py-2">
              <span className="uppercase tracking-wider text-[#6b7386]">{k}</span>
              <span className={v.startsWith("Integration not configured") ? "text-[#8a93a6]" : "text-[#c5cbd7]"}>{v}</span>
            </li>
          ))}
        </ul>
        <p className="text-[11px] leading-relaxed text-[#5c6577]">
          Chaves de API são lidas apenas no servidor, a partir de variáveis de ambiente. Nenhum segredo é exposto ao
          navegador.
        </p>
      </div>

      <div className="surface space-y-3 p-5">
        <h3 className="text-sm font-semibold text-white">Privacidade e dados (LGPD)</h3>
        <p className="text-xs leading-relaxed text-[#a5adbd]">
          Você pode exportar todos os dados da sua organização em JSON ou excluir definitivamente a conta e o workspace.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={exportData}>Exportar meus dados</Button>
          <Button size="sm" variant="danger" onClick={() => setConfirmDelete(true)}>Excluir conta</Button>
        </div>
      </div>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Excluir conta e workspace"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Cancelar</Button>
            <Button variant="danger" onClick={deleteAccount}>Excluir definitivamente</Button>
          </>
        }
      >
        Todos os projetos, produtos, capítulos, páginas, campanhas e eventos da organização serão removidos. Esta ação
        não pode ser desfeita.
      </Modal>
    </div>
  );
}
