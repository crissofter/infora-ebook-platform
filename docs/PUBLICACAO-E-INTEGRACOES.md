# Publicação do ebook, vendas e marketing

As alterações estão no repositório. Um site já hospedado só recebe os novos recursos depois de um novo deploy. Nunca coloque chaves ou senhas no código ou em mensagens de chat.

## Atualizar o banco e publicar na Vercel

1. Faça backup do banco de produção e teste primeiro em Preview com um banco separado.
2. Execute no banco de destino os SQLs aditivos `migrations/20261007_sales_checkout.sql` e `migrations/20261007_meta_connection.sql`. Eles podem ser repetidos e adicionam somente as colunas necessárias.
3. Publique o código atualizado pelo fluxo habitual do projeto. Na Vercel, use Next.js e `npm run build`; preserve `DATABASE_URL` e as configurações já existentes.
4. Confirme `/api/health` e faça login para validar Design, Editor, Exportação, Página de vendas e Marketing.

Alternativa de desenvolvimento: com `DATABASE_URL` apontando para o banco local, `npx drizzle-kit push` aplica o schema. Não aplique esse comando cegamente ao banco de produção.

## Ebook com imagens

- Novos produtos recebem uma capa tipográfica gratuita automaticamente.
- Em Design, envie uma capa PNG/JPEG/WebP de até 3 MB ou descreva a capa para gerar por IA.
- No Editor, cada capítulo permite gerar ou enviar imagens, adicionar uma legenda e remover imagens do capítulo.
- A exportação inclui a capa e as imagens, e o botão de impressão aguarda o carregamento delas. O PDF ainda é produzido por “Salvar como PDF” do navegador.
- Imagens enviadas são persistidas no PostgreSQL, sem depender de arquivos temporários da Vercel. Esse armazenamento serve ao fluxo inicial; volumes maiores pedem armazenamento de objetos.

Para ativar geração real por IA, adicione na Vercel `IMAGE_API_KEY` com uma chave da OpenAI que tenha saldo e acesso ao modelo. `OPENAI_API_KEY` existente também é reutilizada. Opcionalmente defina `IMAGE_MODEL`; o padrão é `gpt-image-1`. As imagens usam o saldo do provedor, separado dos créditos de texto da plataforma. Não é necessário expor a chave ao navegador. Sem chave, a interface informa a integração ausente e não simula uma imagem de IA.

## Conta de pagamento e página de vendas

Para vender um ebook no Brasil, uma opção inicial é a Kiwify:

1. Crie sua conta em https://kiwify.com.br/ com seu próprio e-mail.
2. Conclua a verificação do titular e cadastre os dados de recebimento diretamente na plataforma. Confira taxas, políticas e prazos atuais.
3. Cadastre o produto digital, defina o preço e configure a entrega do PDF.
4. Copie o link público de checkout.
5. Na INFORA, abra o produto → Página de vendas, revise a oferta e cole o link HTTPS no campo Link de checkout.
6. Salve e publique. A página pública mostra a capa e direciona ao checkout configurado. Sem checkout, exibe “Compra em breve” e mantém a compra desativada.

Pagamento e entrega ficam sob responsabilidade do checkout externo. A INFORA registra visualizações e cliques, mas não confirma compras ou receita sem uma integração de webhook específica. A cobrança de assinatura da própria INFORA é outro fluxo e ainda não foi integrada; a liberação atual de planos precisa de revisão antes de cobrar assinantes.

## Conteúdos de marketing

Gere o pacote na aba Marketing do produto. Os textos, chamadas, datas e status podem ser editados tanto no produto quanto na página Marketing. Copie o texto com o link da página publicada, baixe textos e capa e exporte o calendário em CSV. “Planejado no calendário” não envia posts automaticamente. “Marcar como publicado” exige confirmação de que você já publicou na sua própria conta.

## Facebook e Instagram: conexão e campanhas pausadas

O fluxo implementado autoriza a Meta, permite escolher uma Página do Facebook com Instagram profissional vinculado e uma conta de anúncios ativa, e cria uma campanha de tráfego PAUSADA. Ele não cria conjuntos/anúncios, não define público ou orçamento, não publica posts e não ativa veiculação. Finalize e aprove esses itens no Gerenciador de Anúncios. O pagamento do anúncio é cadastrado na Meta, separado da conta que recebe as vendas do ebook.

Pré-requisitos:

- Página do Facebook, Instagram profissional vinculado e conta de anúncios sob sua administração;
- aplicativo Meta com o fluxo de login apropriado habilitado;
- permissões `ads_management`, `ads_read`, `pages_show_list`, `pages_read_engagement` e `instagram_basic`. Dependendo do tipo de aplicativo e dos usuários, a Meta pode exigir revisão e verificação do negócio. Sem aprovação, use somente os usuários autorizados pelo modo de desenvolvimento do aplicativo.

Variáveis privadas na Vercel:

| Nome | Uso |
| --- | --- |
| `APP_URL` | `https://infora-ebook-platform.vercel.app` ou seu domínio oficial |
| `META_APP_ID` | ID do aplicativo Meta |
| `META_APP_SECRET` | Segredo do aplicativo, inserido somente no painel da hospedagem |
| `META_TOKEN_ENCRYPTION_KEY` | Chave aleatória de 32 bytes codificada em base64, usada para criptografar os tokens no banco |
| `META_GRAPH_VERSION` | Opcional; padrão `v23.0`. Use uma versão suportada pelo seu aplicativo. |

Gere a chave de criptografia em uma máquina confiável (`openssl rand -base64 32`) e armazene-a diretamente nas variáveis da hospedagem. Não compartilhe no chat. Preserve a chave entre deploys; alterá-la exige reconectar as contas. Configure no aplicativo Meta este callback exato:

`https://infora-ebook-platform.vercel.app/api/meta/callback`

Depois do deploy, vá a Marketing → Conectar com a Meta → autorize → Escolher Página e conta de anúncios → Salvar conexão. Gere o pacote de marketing de um produto para ter uma campanha local, publique sua página de vendas e confirme a criação da campanha pausada. Depois revise no Gerenciador. Desconectar remove a conexão local, mas não remove ou pausa campanhas que já existem na Meta; revogue o acesso também nas configurações da Meta se desejar.

Os tokens ficam criptografados no banco e nunca são enviados ao navegador. A autorização verifica estado assinado, sessão, organização e validade. A exclusão da conta remove credenciais vinculadas. A recuperação pública de senha não retorna mais tokens: fica indisponível até implementar uma entrega de e-mail real. Definir somente `SMTP_URL` não implementa essa entrega.

## Validação local

```bash
node --experimental-strip-types --test tests/unit.test.ts tests/integrations.test.ts
npm run lint
npm run typecheck -- --incremental false
npm run build
BASE_URL=http://127.0.0.1:3000 node tests/api-smoke.mjs
BASE_URL=http://127.0.0.1:3000 node tests/media-marketing-smoke.mjs
BASE_URL=http://127.0.0.1:3000 node tests/account-security-smoke.mjs
```

Os smoke tests criam contas e dados sintéticos no banco local. O teste de mídia pressupõe ausência de chave de imagem e credenciais Meta; não aponta para produção. Os testes unitários do provedor usam respostas simuladas. Eles verificam montagem da requisição, decodificação, rejeição de erros e criptografia, mas não comprovam cobrança, qualidade de imagens, autorização da Meta ou entrega de anúncios reais. Essas verificações externas dependem das contas e credenciais do titular.
