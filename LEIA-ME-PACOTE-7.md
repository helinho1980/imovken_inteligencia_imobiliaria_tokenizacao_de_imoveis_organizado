# IMOVKEN — Pacote 7: assinatura Pro + cadeados + guia de carteira (09/11/2026)

Instale como os anteriores: copie o conteúdo de `pacote-7` por cima do projeto (feito sobre o zip `imovken_1`, já com o tema neon do pacote 6), commit e sincronizar.
Sem dependência nova: o Stripe é chamado direto pela API REST, então o `pnpm install --frozen-lockfile` do Render continua valendo.

## 1. Assinatura IMOVKEN Pro (Stripe), R$ 9,99/mês
- Página `/assinatura`: plano, botão Assinar, gerenciar cartão/cancelar (portal do Stripe) e **pedido de estorno do primeiro pagamento em até 7 dias** (prazo de arrependimento do CDC, art. 49), que também encerra a assinatura.
- **Cadeado de verdade no servidor:** `/api/valuation` e o relatório de território (`/api/territory/regions/:id/report`) respondem 402 a quem não assina. A tela `/intelligence` fica atrás do `PremiumGate`.
- **Mapa:** no plano grátis lê 1 camada por vez; cruzar várias camadas (e o botão "Todas") é Pro.
- O que é grátis e o que é Pro: textos em `src/plan.ts`; rotas travadas em `LOCKED` dentro de `server/subscription.ts`.
- Testado localmente: cadeado (401/402), webhook com assinatura válida e inválida, ativação, prazo de estorno e login; `tsc` e `vite build` passam. **Não testado com o Stripe real** (precisa das suas chaves).

### Configurar no Stripe e no Render
1. Stripe > Developers > API keys: copie a Secret key (comece com `sk_test_…`, depois `sk_live_…`).
2. Stripe > Developers > Webhooks > Add endpoint: URL `https://www.imovken.com.br/api/stripe/webhook`; eventos `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`. Copie o Signing secret (`whsec_…`).
3. Stripe > Settings > Billing > Customer portal: ative (cancelar e trocar cartão).
4. Render > imovken-api > Environment: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`. Opcionais: `SUB_PRICE_CENTS` (padrão 999), `SUB_REFUND_DAYS` (padrão 7), `PREMIUM_EMAILS` (e-mails com Pro grátis: o seu e de testadores).
5. Teste em modo teste com o cartão 4242 4242 4242 4242, peça o estorno e confira no painel.

Importante: o banco precisa ser **persistente** (disco do Render ou Postgres); senão usuários e assinaturas somem a cada deploy.
Jurídico: inclua preço, renovação e estorno de 7 dias nos Termos (hoje 1.3). Não alterei os documentos legais.

## 2. Guia MetaMask e PancakeSwap: `/guia-carteira`
Passo a passo em português, sinais de golpe e botão para a PancakeSwap com o contrato do VKEN (usa `VITE_VKEN_ADDRESS`).
**Logos:** não incluí marcas de terceiros. Baixe os arquivos oficiais nos kits de marca de cada empresa e salve como `public/partners/metamask.svg` e `public/partners/pancakeswap.svg`; sem eles a tela mostra só o nome.
O link do guia ainda não está no menu (Header): adicione onde preferir, apontando para `/guia-carteira`.

## 3. Fora deste pacote (próximas etapas)
- **10 idiomas:** exige extrair os textos de ~20 telas para dicionários (PT-BR como base) e criar o seletor; começar por menu, landing, mapa e assinatura.
- **IBGE, prefeituras e fontes extras:** o backend já importa IBGE e negócios (`/api/admin/ibge/sync`, `/api/admin/deals/import`). Falta definir fontes e cidades-alvo; prefeituras não têm API padrão (cada uma é um conector).
- **Leitura preditiva:** só faz sentido com série histórica de preços e negócios reais; hoje o mapa usa dados de demonstração onde não há dado real.
- Botões de "Solicitar análise", filtros e "Comparar ativos" da tela de ativos: o patch anterior foi feito sobre um App.tsx antigo e foi descartado; refaço sobre o App.tsx atual na próxima rodada.
