/**
 * Local composition engine.
 *
 * It does NOT invent market data or metrics. It deterministically composes
 * structures and copy scaffolding from what the user actually informed
 * (theme, audience, objective, problem). When a real LLM provider is
 * configured, this engine is bypassed.
 */
import type { Blueprint, MarketingPack, SalesPageDraft } from "./types";

export type IdeaInput = {
  idea: string;
  audience: string;
  objective: string;
  problem: string;
  type: string;
};

const clean = (v: string) => v.trim().replace(/\s+/g, " ");
const titleCase = (v: string) => v.charAt(0).toUpperCase() + v.slice(1);

export function localBlueprint(input: IdeaInput): Blueprint {
  const theme = titleCase(clean(input.idea));
  const audience = clean(input.audience) || "seu público";
  const objective = clean(input.objective) || "gerar um resultado concreto";
  const problem = clean(input.problem) || "a principal dificuldade desse público";

  const pillars = [
    { t: "Diagnóstico", s: `Entender com clareza onde ${audience} está hoje em relação a ${problem}.` },
    { t: "Fundamentos", s: `Os conceitos essenciais que sustentam ${objective}.` },
    { t: "Método", s: `O passo a passo aplicável para avançar de forma consistente.` },
    { t: "Prática guiada", s: `Exercícios e roteiros para aplicar o método na rotina real.` },
    { t: "Obstáculos", s: `Como lidar com os bloqueios mais comuns ao enfrentar ${problem}.` },
    { t: "Consolidação", s: `Como manter o resultado e evoluir depois do primeiro ciclo.` },
  ];

  return {
    title: theme.length > 60 ? `${theme.slice(0, 57)}...` : theme,
    subtitle: `Um ${labelForType(input.type)} prático para ${audience}`,
    promise: `Ao final, ${audience} terá um caminho claro para ${objective}.`,
    concept: `${labelForType(input.type)} focado em ${audience}, construído para resolver ${problem} através de um método objetivo e aplicável, sem teoria desnecessária.`,
    audience,
    chapters: [
      {
        title: "Apresentação",
        kind: "INTRO",
        summary: `Por que este material existe e como usá-lo.`,
        content: paragraphs([
          `Este material foi construído para ${audience}.`,
          `O ponto de partida é simples: ${problem}. A proposta aqui não é acumular informação, e sim organizar um caminho possível para ${objective}.`,
          `Cada capítulo traz um bloco de entendimento, um bloco de aplicação e um fechamento com a ação da vez. Leia na ordem na primeira vez e depois use como consulta.`,
        ]),
      },
      ...pillars.map((p, i) => ({
        title: `${i + 1}. ${p.t}`,
        kind: "CHAPTER" as const,
        summary: p.s,
        content: paragraphs([
          p.s,
          `Contexto — antes de avançar, vale registrar onde ${audience} normalmente trava: ${problem}. Este capítulo trata exatamente dessa etapa.`,
          `Aplicação — defina uma ação pequena e mensurável para esta semana. Escreva: o que será feito, quando, e como você saberá que funcionou.`,
          `Fechamento — revise o que mudou depois da aplicação. O avanço acontece pela repetição consciente, não pela quantidade de conteúdo consumido.`,
          `[ Espaço reservado para o seu conteúdo autoral: exemplos, histórias e dados da sua experiência tornam este capítulo único. ]`,
        ]),
      })),
      {
        title: "Conclusão",
        kind: "CONCLUSION",
        summary: "O que fazer a partir de agora.",
        content: paragraphs([
          `Você percorreu um caminho completo: diagnóstico, fundamentos, método, prática, obstáculos e consolidação.`,
          `O próximo passo é escolher um único ponto e executar por sete dias seguidos. Consistência supera intensidade.`,
        ]),
      },
      {
        title: "Bônus — Checklist de aplicação",
        kind: "BONUS",
        summary: "Resumo acionável de tudo o que foi visto.",
        content: paragraphs([
          `1. Registrei meu ponto de partida.`,
          `2. Escolhi um objetivo mensurável ligado a ${objective}.`,
          `3. Defini a primeira ação da semana.`,
          `4. Identifiquei o obstáculo mais provável.`,
          `5. Marquei uma data para revisar o resultado.`,
        ]),
      },
      {
        title: "Próximo passo",
        kind: "CTA",
        summary: "Chamada final para ação.",
        content: paragraphs([
          `Se este material fez sentido, o próximo passo é aprofundar a aplicação com acompanhamento.`,
          `Deixe aqui o link da sua oferta, comunidade ou próximo produto.`,
        ]),
      },
    ],
    bonuses: ["Checklist de aplicação", "Roteiro de revisão semanal"],
    cta: "Comece hoje pelo primeiro passo do método.",
  };
}

export function localSalesPage(ctx: {
  title: string;
  subtitle?: string | null;
  audience?: string | null;
  problem?: string | null;
  objective?: string | null;
  promise?: string | null;
  chapters: { title: string; summary?: string | null }[];
}): SalesPageDraft {
  const audience = ctx.audience?.trim() || "você";
  const problem = ctx.problem?.trim() || "o problema que trava o seu avanço";
  return {
    headline: ctx.promise?.trim() || `${ctx.title}: um caminho claro para ${audience}`,
    subheadline: ctx.subtitle?.trim() || `Material prático, direto ao ponto, criado para resolver ${problem}.`,
    problem: `Hoje ${audience} tenta resolver ${problem} com informação solta, sem sequência e sem método. O resultado é esforço sem avanço.`,
    solution: `Este material organiza o caminho em etapas curtas e aplicáveis, para sair da teoria e chegar ao resultado: ${ctx.objective?.trim() || "progresso real e mensurável"}.`,
    benefits: [
      "Estrutura passo a passo, sem enrolação",
      "Aplicação prática em cada capítulo",
      "Checklist para acompanhar o progresso",
      "Linguagem direta e objetiva",
    ],
    contents: ctx.chapters.slice(0, 10).map((c) => c.summary?.trim() || c.title),
    differentials: ["Método aplicável desde o primeiro dia", "Foco em execução, não em teoria", "Formato leve para ler e aplicar"],
    bonuses: ["Checklist de aplicação", "Roteiro de revisão semanal"],
    faq: [
      { q: "Para quem é este material?", a: `Para ${audience} que quer resolver ${problem} de forma estruturada.` },
      { q: "Como recebo o material?", a: "O material é digital. Confira as instruções de entrega no checkout do vendedor antes de concluir a compra." },
      { q: "Preciso de conhecimento prévio?", a: "Não. O material começa pelo diagnóstico e avança em etapas." },
    ],
    guarantee: "",
    ctaLabel: "Quero começar agora",
  };
}

export function localMarketingPack(ctx: { title: string; audience?: string | null; promise?: string | null }): MarketingPack {
  const audience = ctx.audience?.trim() || "seu público";
  const promise = ctx.promise?.trim() || `um caminho claro com ${ctx.title}`;
  return {
    items: [
      {
        channel: "INSTAGRAM",
        format: "POST",
        title: `Post — dor principal`,
        body: `Se você é ${audience}, provavelmente já tentou resolver isso sozinho e travou no meio do caminho.\n\n${ctx.title} organiza o passo a passo para você sair do lugar.\n\nSalve este post para aplicar depois.`,
        cta: "Link na bio",
      },
      {
        channel: "INSTAGRAM",
        format: "STORY",
        title: "Story — enquete de abertura",
        body: `Enquete: qual é o seu maior obstáculo hoje?\n(1) Falta de método\n(2) Falta de tempo\n\nAmanhã eu mostro como ${promise}.`,
        cta: "Acesse pelo link do story",
      },
      {
        channel: "INSTAGRAM",
        format: "REEL",
        title: "Reel — roteiro de 30s",
        body: `0-3s: "Você está tentando resolver isso do jeito mais difícil."\n3-12s: mostre o erro comum de ${audience}.\n12-22s: apresente as 3 etapas do método.\n22-30s: convite para ${ctx.title}.`,
        cta: "Comente MÉTODO",
      },
      {
        channel: "FACEBOOK",
        format: "POST",
        title: "Post — prova e convite",
        body: `${ctx.title} nasceu de um problema simples: ${audience} não precisa de mais conteúdo, precisa de sequência.\n\nDentro do material você encontra diagnóstico, método e aplicação prática.`,
        cta: "Saiba mais",
      },
      {
        channel: "EMAIL",
        format: "EMAIL",
        title: "E-mail 1 — abertura de carrinho",
        body: `Assunto: o primeiro passo\n\nOi,\n\nSe você chegou até aqui, é porque quer ${promise}.\n\nAcabei de liberar ${ctx.title}, um material direto ao ponto para aplicar já nesta semana.`,
        cta: "Ver o material",
      },
      {
        channel: "EMAIL",
        format: "EMAIL",
        title: "E-mail 2 — objeções",
        body: `Assunto: "não tenho tempo"\n\nEsse é o motivo mais comum — e exatamente por isso o material foi feito em blocos curtos de aplicação.`,
        cta: "Começar agora",
      },
      {
        channel: "ADS",
        format: "AD",
        title: "Anúncio — variação A",
        body: `Headline: ${ctx.title}\nDescrição: Método prático para ${audience}. Do diagnóstico à aplicação.`,
        cta: "Quero acessar",
      },
      {
        channel: "ADS",
        format: "AD",
        title: "Anúncio — variação B",
        body: `Headline: Pare de tentar resolver sozinho\nDescrição: ${promise}. Estrutura clara, aplicação imediata.`,
        cta: "Ver oferta",
      },
    ],
  };
}

function paragraphs(list: string[]) {
  return list.join("\n\n");
}

export function labelForType(type: string) {
  const map: Record<string, string> = {
    EBOOK: "e-book",
    GUIDE: "guia",
    PLANNER: "planner",
    TEMPLATE: "template",
    COURSE: "curso",
    BUNDLE: "bundle",
  };
  return map[type] ?? "produto digital";
}
