import Link from "next/link";
import { BrandLink } from "@/components/brand";
import { PLAN_CATALOG } from "@/lib/billing";
import { providerStatus } from "@/lib/ai/provider";

const FLOW = [
  "Ideia",
  "Pesquisa",
  "Estratégia",
  "Criação",
  "Design",
  "Produto",
  "Página de venda",
  "Marketing",
  "Publicação",
  "Vendas",
  "Analytics",
];

const FEATURES = [
  {
    tag: "Criação",
    title: "AI Product Engine",
    body: "Conceito, título, promessa, estrutura, capítulos e bônus gerados a partir da sua ideia — com revisão e aprovação antes de virar produto.",
  },
  {
    tag: "Editor",
    title: "Editor com autosave",
    body: "Adicione, reordene, duplique e reescreva capítulos. Cada alteração é salva automaticamente e versionada.",
  },
  {
    tag: "Design",
    title: "Design Engine",
    body: "Sete direções visuais (Premium, Minimalista, Moderno, Elegante, Editorial, Corporativo, Criativo) aplicadas à capa e ao miolo.",
  },
  {
    tag: "Exportação",
    title: "PDF pronto para entrega",
    body: "Capa, folha de apresentação, sumário, capítulos, conclusão e CTA em um documento exportável.",
  },
  {
    tag: "Vendas",
    title: "Sales Page Builder",
    body: "Headline, problema, solução, benefícios, bônus, FAQ, garantia e CTA — editáveis e publicáveis em uma página pública.",
  },
  {
    tag: "Marketing",
    title: "Marketing Engine",
    body: "Posts, Stories, roteiros de Reels, e-mails de lançamento e variações de anúncio organizados em um calendário de conteúdo.",
  },
];

const AUDIENCE = [
  { t: "Especialistas", d: "Transforme conhecimento em um produto digital estruturado e vendável." },
  { t: "Criadores", d: "Saia do conteúdo solto e construa uma operação com produto, página e campanha." },
  { t: "Pequenos negócios", d: "Gere materiais de captação e produtos complementares sem contratar equipe." },
  { t: "Agências", d: "Padronize a criação de infoprodutos para múltiplos clientes com histórico e métricas." },
];

const FAQ = [
  {
    q: "A INFORA substitui designer e copywriter?",
    a: "A INFORA cria a base — estrutura, conteúdo, design e copy — e deixa tudo editável. Você mantém o controle editorial e pode refinar cada parte.",
  },
  {
    q: "Meus dados ficam isolados?",
    a: "Sim. Cada usuário pertence a uma organização e todas as consultas são filtradas por ela. Nenhum dado é compartilhado entre contas.",
  },
  {
    q: "A plataforma publica sozinha nas redes sociais?",
    a: "Não. A publicação exige integração oficial autorizada e aprovação explícita sua. Enquanto a integração não estiver configurada, o status é exibido como 'Integration not configured'.",
  },
  {
    q: "Como funcionam os créditos?",
    a: "Cada operação de IA consome créditos do seu plano. O consumo é registrado por operação, modelo e data, e fica visível na área de plano e consumo.",
  },
  {
    q: "Posso exportar e sair da plataforma?",
    a: "Sim. O conteúdo é seu. A exportação em PDF e a exportação de dados da conta estão disponíveis na plataforma.",
  },
];

export default function LandingPage() {
  const ai = providerStatus();

  return (
    <main className="min-h-screen bg-[#050609]">
      <header className="sticky top-0 z-40 border-b border-[#171b24] bg-[#050609]/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <BrandLink />
          <nav className="hidden items-center gap-7 text-xs text-[#a5adbd] md:flex">
            <a className="hover:text-white" href="#como-funciona">Como funciona</a>
            <a className="hover:text-white" href="#recursos">Recursos</a>
            <a className="hover:text-white" href="#analytics">Analytics</a>
            <a className="hover:text-white" href="#planos">Planos</a>
            <a className="hover:text-white" href="#faq">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-[10px] px-3 py-2 text-xs text-[#a5adbd] hover:text-white">
              Entrar
            </Link>
            <Link
              href="/signup"
              className="rounded-[10px] bg-[#4f7cff] px-4 py-2 text-xs font-medium text-white hover:bg-[#3f66e0]"
            >
              Começar agora
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="grid-bg border-b border-[#171b24]">
        <div className="mx-auto max-w-6xl px-5 py-24 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#232936] bg-[#0d1017] px-3 py-1 text-[11px] text-[#a5adbd]">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[#8b5cf6]" />
            AI-powered product creation platform
          </span>
          <h1 className="mx-auto mt-7 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-6xl">
            Transforme sua ideia em um <span className="text-[#7396ff]">produto digital</span>.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-[#a5adbd] sm:text-base">
            Crie, desenvolva, lance e acompanhe seus produtos digitais com inteligência artificial.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signup"
              className="rounded-[10px] bg-[#4f7cff] px-6 py-3 text-sm font-medium text-white hover:bg-[#3f66e0]"
            >
              Começar agora
            </Link>
            <a
              href="#como-funciona"
              className="rounded-[10px] border border-[#232936] bg-[#11141b] px-6 py-3 text-sm text-[#e6e9ef] hover:bg-[#1f2531]"
            >
              Ver como funciona
            </a>
          </div>
          <p className="mt-6 text-[11px] text-[#5c6577]">
            Da ideia ao produto. Do produto às vendas. · Status do motor de IA: {ai.configured ? `provedor ${ai.provider} conectado` : "motor local de composição"}
          </p>

          <div className="mx-auto mt-16 max-w-5xl">
            <div className="surface overflow-hidden p-0">
              <div className="flex items-center gap-1.5 border-b border-[#171b24] px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-[#2a303d]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#2a303d]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#2a303d]" />
                <span className="ml-3 text-[11px] text-[#5c6577]">infora · workspace</span>
              </div>
              <div className="grid gap-px bg-[#171b24] md:grid-cols-3">
                {[
                  { k: "Produto", v: "Blueprint gerado", d: "conceito · promessa · 10 capítulos" },
                  { k: "Página de vendas", v: "Rascunho pronto", d: "headline · benefícios · FAQ" },
                  { k: "Marketing", v: "8 conteúdos", d: "Instagram · Facebook · e-mail · ads" },
                ].map((c) => (
                  <div key={c.k} className="bg-[#0b0d12] p-6 text-left">
                    <p className="text-[10px] uppercase tracking-wider text-[#5c6577]">{c.k}</p>
                    <p className="mt-2 text-sm font-medium text-white">{c.v}</p>
                    <p className="mt-1 text-[11px] text-[#6b7386]">{c.d}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" className="border-b border-[#171b24] py-20">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-2xl font-semibold tracking-tight text-white">Como funciona</h2>
          <p className="mt-2 max-w-xl text-sm text-[#a5adbd]">
            Um fluxo contínuo que leva a sua ideia até uma operação digital completa.
          </p>
          <div className="mt-10 flex flex-wrap gap-2">
            {FLOW.map((step, i) => (
              <span
                key={step}
                className="inline-flex items-center gap-2 rounded-full border border-[#232936] bg-[#0d1017] px-3.5 py-1.5 text-xs text-[#c5cbd7]"
              >
                <span className="text-[10px] text-[#4f7cff]">{String(i + 1).padStart(2, "0")}</span>
                {step}
              </span>
            ))}
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              { n: "01", t: "Descreva a ideia", d: "Tema, público, objetivo e o problema que você quer resolver." },
              { n: "02", t: "Aprove o blueprint", d: "A IA propõe conceito, promessa e estrutura. Você revisa e ajusta." },
              { n: "03", t: "Publique e acompanhe", d: "Exporte o produto, publique a página e acompanhe os eventos reais." },
            ].map((s) => (
              <div key={s.n} className="surface p-6">
                <span className="text-[11px] text-[#4f7cff]">{s.n}</span>
                <h3 className="mt-3 text-sm font-semibold text-white">{s.t}</h3>
                <p className="mt-2 text-xs leading-relaxed text-[#a5adbd]">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RECURSOS */}
      <section id="recursos" className="border-b border-[#171b24] py-20">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-2xl font-semibold tracking-tight text-white">Recursos</h2>
          <p className="mt-2 max-w-xl text-sm text-[#a5adbd]">
            Módulos independentes que trabalham sobre o mesmo produto.
          </p>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="surface p-6">
                <span className="text-[10px] uppercase tracking-wider text-[#8b5cf6]">{f.tag}</span>
                <h3 className="mt-3 text-sm font-semibold text-white">{f.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-[#a5adbd]">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ANALYTICS */}
      <section id="analytics" className="border-b border-[#171b24] py-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-white">Analytics honesto</h2>
            <p className="mt-3 text-sm leading-relaxed text-[#a5adbd]">
              A INFORA registra eventos reais: visualizações, cliques em CTA, início de checkout, compras e cancelamentos.
              Os insights de IA interpretam apenas os dados que existem na sua conta.
            </p>
            <ul className="mt-6 space-y-3 text-xs text-[#c5cbd7]">
              {[
                "Filtros por hoje, 7, 30, 90 dias e período personalizado",
                "Conversão, ticket médio, origem, produto e campanha",
                "Eventos gravados automaticamente na página pública de vendas",
                "Nenhuma métrica inventada — dados demonstrativos são marcados como DEMO",
              ].map((i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#4f7cff]" />
                  {i}
                </li>
              ))}
            </ul>
          </div>
          <div className="surface p-6">
            <p className="text-[10px] uppercase tracking-wider text-[#8b5cf6]">Insight de IA</p>
            <p className="mt-3 text-sm leading-relaxed text-[#e6e9ef]">
              &ldquo;Nos últimos 30 dias, seu produto recebeu 5.200 visitas e 173 compras. Existe uma diferença significativa
              entre visitas e início de checkout. Considere testar uma nova headline.&rdquo;
            </p>
            <p className="mt-4 text-[11px] text-[#5c6577]">
              Exemplo ilustrativo de formato. Na plataforma, os números vêm exclusivamente dos eventos da sua conta.
            </p>
          </div>
        </div>
      </section>

      {/* PARA QUEM É */}
      <section className="border-b border-[#171b24] py-20">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-2xl font-semibold tracking-tight text-white">Para quem é</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {AUDIENCE.map((a) => (
              <div key={a.t} className="surface p-6">
                <h3 className="text-sm font-semibold text-white">{a.t}</h3>
                <p className="mt-2 text-xs leading-relaxed text-[#a5adbd]">{a.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLANOS */}
      <section id="planos" className="border-b border-[#171b24] py-20">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-2xl font-semibold tracking-tight text-white">Planos</h2>
          <p className="mt-2 max-w-xl text-sm text-[#a5adbd]">
            Comece no Free e evolua conforme o volume de produtos e de geração por IA.
          </p>
          <div className="mt-10 grid gap-5 md:grid-cols-3 lg:grid-cols-5">
            {PLAN_CATALOG.map((p) => (
              <div
                key={p.code}
                className={`surface flex flex-col p-5 ${p.code === "CREATOR" ? "border-[#4f7cff]/40" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">{p.name}</h3>
                  {p.code === "CREATOR" ? (
                    <span className="rounded-full border border-[#4f7cff]/30 bg-[#4f7cff]/10 px-2 py-0.5 text-[10px] text-[#7396ff]">
                      Popular
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 text-xl font-semibold text-white">
                  {p.priceCents === 0 ? "R$ 0" : `R$ ${(p.priceCents! / 100).toFixed(0)}`}
                  <span className="text-[11px] font-normal text-[#6b7386]">/mês</span>
                </p>
                <ul className="mt-4 flex-1 space-y-2 text-[11px] leading-relaxed text-[#a5adbd]">
                  {(p.features as string[]).map((f) => (
                    <li key={f}>· {f}</li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className="mt-5 rounded-[10px] border border-[#232936] bg-[#11141b] px-3 py-2 text-center text-xs text-white hover:bg-[#1f2531]"
                >
                  Começar
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-5 text-[11px] text-[#5c6577]">
            Cobrança via gateway de pagamento ainda não configurada nesta instalação. A troca de plano é registrada na
            plataforma e o gateway pode ser conectado sem alteração de arquitetura.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-b border-[#171b24] py-20">
        <div className="mx-auto max-w-3xl px-5">
          <h2 className="text-2xl font-semibold tracking-tight text-white">Perguntas frequentes</h2>
          <div className="mt-8 divide-y divide-[#171b24] border-y border-[#171b24]">
            {FAQ.map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="cursor-pointer list-none text-sm font-medium text-white marker:hidden">
                  <span className="mr-2 text-[#4f7cff] group-open:hidden">+</span>
                  <span className="mr-2 hidden text-[#4f7cff] group-open:inline">−</span>
                  {f.q}
                </summary>
                <p className="mt-2.5 pl-5 text-xs leading-relaxed text-[#a5adbd]">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="grid-bg py-24">
        <div className="mx-auto max-w-3xl px-5 text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-white">Da ideia ao produto. Do produto às vendas.</h2>
          <p className="mx-auto mt-4 max-w-xl text-sm text-[#a5adbd]">
            Crie sua conta e gere seu primeiro produto digital ainda hoje.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-block rounded-[10px] bg-[#4f7cff] px-7 py-3 text-sm font-medium text-white hover:bg-[#3f66e0]"
          >
            Começar agora
          </Link>
        </div>
      </section>

      <footer className="border-t border-[#171b24] py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 text-[11px] text-[#5c6577] sm:flex-row">
          <BrandLink />
          <div className="flex gap-5">
            <Link href="/legal/privacidade" className="hover:text-white">Privacidade</Link>
            <Link href="/legal/termos" className="hover:text-white">Termos</Link>
            <Link href="/login" className="hover:text-white">Entrar</Link>
          </div>
          <p>© {new Date().getFullYear()} INFORA</p>
        </div>
      </footer>
    </main>
  );
}
