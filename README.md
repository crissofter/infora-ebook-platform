# INFORA

**Da ideia ao produto. Do produto às vendas.**

INFORA é uma plataforma SaaS modular para transformar ideias em produtos digitais, preparar sua
comercialização, apoiar a divulgação e acompanhar os resultados.

---

## 1. Stack escolhida

| Camada | Tecnologia | Motivo |
| --- | --- | --- |
| Frontend / Backend | Next.js 16 (App Router) + React 19 + TypeScript | Um único runtime, Server Components para leitura, Route Handlers para escrita, portável para VPS/Hostinger/cloud (`next start`) |
| Estilo | Tailwind CSS v4 + tokens próprios (`globals.css`) | Design system consistente sem dependências pesadas |
| Banco | PostgreSQL + Drizzle ORM | Modelo relacional tipado, migrations via `drizzle-kit` |
| Autenticação | Sessão própria (cookie httpOnly + scrypt) | Sem lock-in de fornecedor; preparada para OAuth social |
| IA | Camada `src/lib/ai` com adaptadores | Troca de provedor sem tocar no restante do app |
| Observabilidade | `system_logs`, `audit_logs`, `/api/health` | Diagnóstico de erro, origem, usuário, operação e horário |

Nenhum recurso depende de infraestrutura da Crissoft 3D Studio. A aplicação precisa apenas de
`DATABASE_URL` para rodar.

## 2. Estrutura de pastas

```
src/
  app/
    page.tsx                  landing pública
    (auth)/                   login, signup (onboarding), recuperação de senha
    (app)/                    workspace autenticado (layout com sidebar)
      dashboard/ projects/ products/ marketing/ analytics/ billing/ settings/ admin/
      products/[id]/          workspace do produto (7 abas) + /export (visão de impressão)
    s/[slug]/                 página de vendas pública + tracker de eventos
    legal/[doc]/              privacidade e termos
    api/                      API organizada por domínio
  components/                 design system (ui.tsx), shell da aplicação, marca
  db/                         client Drizzle + schema relacional
  lib/                        auth, api, billing, analytics, logger, products, slug, ai/
tests/                        testes unitários (node:test) + smoke de integração
```

## 3. Banco de dados

34 tabelas cobrindo identidade (`users`, `organizations`, `memberships`, `sessions`),
workspace (`projects`, `products`, `product_versions`, `chapters`, `sales_pages`, `assets`),
IA (`ai_generations`, `ai_usage`), marketing (`campaigns`, `content_items`, `social_accounts`,
`social_publications`), comércio (`plans`, `subscriptions`, `usage_limits`, `customers`, `orders`,
`order_items`, `payments`, `coupons`), preparação de marketplace/afiliados (`creators`,
`affiliates`, `commissions`) e plataforma (`analytics_events`, `notifications`, `audit_logs`,
`system_logs`, `jobs`, `organization_counters`).

Aplicar o schema: `npx drizzle-kit push`.

**Multi-tenancy:** toda tabela de negócio carrega `organization_id`. Todas as consultas usam a
organização da sessão; `getOwnedProduct()` bloqueia acesso cruzado com HTTP 403.

## 4. Fluxo de autenticação

1. `POST /api/auth/signup` → cria `user` + `organization` + `membership(OWNER)` + `subscription(FREE)` + `usage_limits`.
2. Sessão: token aleatório de 32 bytes, guardado como SHA-256 em `sessions`, entregue em cookie
   `infora_session` (httpOnly, sameSite=lax, secure em produção, 14 dias).
3. `getSession()` resolve usuário + organização; `requireSession()` / `requireAdmin()` protegem rotas.
4. Senhas: `scrypt` com sal de 16 bytes e comparação em tempo constante.
5. Recuperação: token de uso único com validade de 30 min (`password_resets`); sem SMTP configurado,
   o token é devolvido de forma controlada e o fato é sinalizado na interface.
6. O primeiro usuário cadastrado recebe papel `SUPER_ADMIN` (bootstrap do painel administrativo).

## 5. Fluxo de IA

```
rota /api/... → engine.run(operation)
  ├─ consumeCredits(plano, custo)       → 402 quando não há créditos
  ├─ registra ai_generations (PROCESSING)
  ├─ resolveProvider(): OpenAI | Anthropic | motor local
  ├─ fallback automático para o motor local em caso de falha do provedor
  ├─ atualiza ai_generations (COMPLETED) + ai_usage (créditos, modelo, período)
  └─ recordEvent(product_generated | content_generated)
```

Operações: `product_blueprint` (450 créditos), `sales_page` (300), `marketing_pack` (350),
`chapter_rewrite` (120), `chapter_expand` (180), `analytics_insights` (80).

**Sem chave de IA configurada** a plataforma usa o *motor local de composição*: ele não inventa
dados de mercado — apenas estrutura determinística a partir do que o usuário informou. Esse estado é
exibido na sidebar, na landing e em Configurações.

## 6. Variáveis de ambiente

| Variável | Obrigatória | Uso |
| --- | --- | --- |
| `DATABASE_URL` | sim | Conexão PostgreSQL |
| `OPENAI_API_KEY` / `OPENAI_BASE_URL` | não | Ativa provedor OpenAI-compatível |
| `ANTHROPIC_API_KEY` | não | Ativa provedor Anthropic |
| `AI_MODEL` | não | Sobrescreve o modelo padrão |
| `SMTP_URL` | não | Envio de e-mails (recuperação de senha) |
| `PAYMENT_PROVIDER` | não | Gateway de pagamento |
| `META_APP_ID` | não | Integrações Instagram/Facebook |
| `STORAGE_BUCKET` | não | Storage externo de arquivos |

Segredos são lidos somente no servidor. Nada sensível chega ao bundle do navegador.

## 7. API por domínio

```
/api/health                          status do serviço e das integrações
/api/auth/signup|login|logout|password
/api/account                         GET exportar dados · PATCH perfil · DELETE conta (LGPD)
/api/projects                        GET lista · POST cria (respeita limite do plano)
/api/products                        GET lista · POST cria + gera blueprint
/api/products/[id]                   GET detalhe · PATCH edição · DELETE remoção em cascata
/api/products/[id]/chapters          POST novo/duplicar · PUT reordenar
/api/chapters/[id]                   PATCH autosave · DELETE
/api/products/[id]/generate          POST { kind: sales_page | marketing | cover }
/api/products/[id]/sales-page        PATCH edição/publicação
/api/products/[id]/export            POST registra exportação
/api/content/[id]                    PATCH status/agendamento · DELETE
/api/billing/plan                    POST troca de plano
/api/public/events                   POST eventos das páginas públicas (sem autenticação)
```

Todas as entradas são validadas com Zod; erros retornam mensagem amigável e o detalhe técnico vai
para `system_logs`.

## 8. Segurança

- Isolamento multi-tenant verificado em todas as leituras/escritas de produto, capítulo e conteúdo.
- Rate limiting por IP/organização em signup, login, recuperação, criação e geração.
- Cookies httpOnly, sessões com expiração e invalidação global após troca de senha.
- RBAC: `USER`, `ADMIN`, `SUPER_ADMIN` (plataforma) e `OWNER`/`ADMIN`/`MEMBER` (organização).
- Auditoria (`audit_logs`) para signup, login, alterações de produto, plano e conta.
- Nenhum dado de cartão é armazenado: `payments` guarda apenas referências de provedor.

## 9. Testes

```bash
node --experimental-strip-types --test tests/unit.test.ts     # lógica pura (9 testes)
BASE_URL=http://127.0.0.1:3000 node tests/api-smoke.mjs        # integração ponta a ponta
```

O smoke test cobre health, cadastro, sessão, rota protegida, isolamento multi-tenant, geração de
blueprint/página/marketing/capa, exportação, troca de plano, publicação, eventos públicos e logout.

## 10. Execução

```bash
npm install
npx drizzle-kit push
npm run build && npm run start
```

## 11. Limitações desta versão (transparência)

- Provedor de IA, gateway de pagamento, SMTP, integrações Meta e storage externo aparecem como
  **Integration not configured** até que as variáveis de ambiente sejam definidas.
- Exportação em PDF usa a impressão do navegador (sem dependência binária); EPUB/DOCX ficam para a
  próxima fase.
- Marketplace, afiliados e login social estão **preparados no banco/arquitetura**, sem UI no MVP.
- Nenhuma venda é simulada: o checkout público registra `checkout_started` e cria pedido `PENDING`.
