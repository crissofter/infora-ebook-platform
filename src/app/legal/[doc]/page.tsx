import Link from "next/link";
import { notFound } from "next/navigation";
import { BrandLink } from "@/components/brand";

const DOCS: Record<string, { title: string; updated: string; sections: { h: string; p: string }[] }> = {
  privacidade: {
    title: "Política de Privacidade",
    updated: "Versão inicial — MVP",
    sections: [
      {
        h: "1. Dados coletados",
        p: "Coletamos nome, e-mail, senha (armazenada apenas como hash), dados do workspace e o conteúdo que você cria na plataforma (projetos, produtos, capítulos, páginas e campanhas). Também registramos eventos de uso para gerar métricas na sua própria conta.",
      },
      {
        h: "2. Finalidade",
        p: "Os dados são usados exclusivamente para operar a plataforma: autenticar o acesso, gerar e armazenar seus produtos, calcular consumo de créditos e apresentar analytics da sua organização.",
      },
      {
        h: "3. Compartilhamento",
        p: "Nenhum dado é vendido. Quando um provedor de inteligência artificial estiver configurado, os textos enviados para geração são transmitidos ao provedor escolhido, identificado na tela de configurações.",
      },
      {
        h: "4. Isolamento",
        p: "Cada organização acessa apenas os seus próprios dados. Todas as consultas ao banco são filtradas pela organização do usuário autenticado.",
      },
      {
        h: "5. Seus direitos (LGPD)",
        p: "Você pode exportar todos os dados da organização em formato JSON e solicitar a exclusão definitiva da conta diretamente em Configurações › Privacidade e dados.",
      },
      {
        h: "6. Segurança",
        p: "Senhas usam derivação scrypt com sal aleatório. Sessões são cookies httpOnly com expiração. Chaves de integração ficam apenas no servidor, em variáveis de ambiente.",
      },
    ],
  },
  termos: {
    title: "Termos de Uso",
    updated: "Versão inicial — MVP",
    sections: [
      {
        h: "1. Objeto",
        p: "A INFORA é uma plataforma para criação, preparação comercial, divulgação e acompanhamento de produtos digitais. O uso está condicionado à aceitação destes termos.",
      },
      {
        h: "2. Conteúdo gerado",
        p: "O conteúdo criado com apoio de inteligência artificial deve ser revisado por você antes de ser publicado ou comercializado. Você é responsável pelo conteúdo final, pela veracidade das promessas e pela conformidade legal da sua oferta.",
      },
      {
        h: "3. Uso aceitável",
        p: "É proibido usar a plataforma para conteúdo ilegal, enganoso, discriminatório ou que viole direitos de terceiros. Também é proibido tentar contornar limites técnicos, limites de plano ou restrições de integrações externas.",
      },
      {
        h: "4. Integrações",
        p: "Publicações em redes sociais dependem de integrações oficiais autorizadas por você. A INFORA não realiza automações não permitidas pelas plataformas de destino.",
      },
      {
        h: "5. Planos e créditos",
        p: "Cada plano define limites de projetos, produtos e créditos de IA por período. O consumo é apresentado na área de plano e consumo antes e depois de cada operação.",
      },
      {
        h: "6. Disponibilidade",
        p: "Esta é a primeira versão funcional da plataforma. Recursos identificados como não configurados dependem de integrações externas que podem ser habilitadas posteriormente.",
      },
    ],
  },
};

export function generateStaticParams() {
  return [{ doc: "privacidade" }, { doc: "termos" }];
}

export default async function LegalPage({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  const content = DOCS[doc];
  if (!content) notFound();

  return (
    <main className="min-h-screen bg-[#050609]">
      <header className="border-b border-[#171b24]">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5">
          <BrandLink />
          <Link href="/" className="text-xs text-[#a5adbd] hover:text-white">Voltar ao site</Link>
        </div>
      </header>
      <article className="mx-auto max-w-3xl px-5 py-16">
        <h1 className="text-2xl font-semibold tracking-tight text-white">{content.title}</h1>
        <p className="mt-2 text-xs text-[#5c6577]">{content.updated}</p>
        <div className="mt-10 space-y-8">
          {content.sections.map((s) => (
            <section key={s.h}>
              <h2 className="text-sm font-semibold text-white">{s.h}</h2>
              <p className="mt-2 text-xs leading-relaxed text-[#a5adbd]">{s.p}</p>
            </section>
          ))}
        </div>
      </article>
    </main>
  );
}
