# Tokenização de imóveis na IMOVKEN — o caminho mais simples e legal

> Resumo de pesquisa (outubro de 2026), não é parecer jurídico. Fontes: CVM (Ofício-Circular SSE 04/2023 e Parecer 40), Resolução CVM 88, consulta pública de substituição da 88 (SDM 05/2025), Demarest, Serasa, Machado Meyer, Migalhas/CNB-SP.

## A pergunta: precisa de CVM?
**Depende do que o token é e de como é vendido — não de onde fica a custódia.**
- A CVM diz que a tokenização em si não exige aprovação prévia. Mas, se o token for um **valor mobiliário** e for ofertado ao público, o emissor e a oferta ficam sujeitos às regras da CVM.
- O imóvel em si não é valor mobiliário. O que costuma virar valor mobiliário é o **contrato de investimento coletivo**: várias pessoas colocam dinheiro num empreendimento e esperam lucro do esforço de terceiros (teste de Howey/Parecer 40).
- O token sozinho não transfere propriedade: isso só acontece com o registro do título no cartório.
- Custódia dos próprios usuários não muda a classificação: o teste olha o direito vendido e a expectativa de retorno.

## Três produtos diferentes (e a regra de cada um)

**A. Imóvel inteiro + certificado digital (recomendado como primeiro produto)**
- Um comprador compra o imóvel inteiro (contrato + escritura + registro, como hoje). Depois da conclusão, a IMOVKEN emite um **certificado digital** (token/NFT) ligado àquele imóvel, como prova de histórico e rastreabilidade.
- Não há investimento coletivo nem promessa de renda; o enquadramento tende a ficar fora da CVM. A receita é a **corretagem**, e você tem CRECI: é o modelo clássico, só que digital.
- O que depende de você: reativar o CRECI e confirmar no CRECI-SP se uma empresa precisa de registro próprio (pessoa jurídica) para receber a corretagem.

**B. Frações de imóvel para o público, com expectativa de renda/valorização**
- Tende a ser valor mobiliário. Caminhos:
  1. **Parceria com plataforma de crowdfunding autorizada pela CVM, securitizadora ou gestora**: ela emite e faz a oferta; a IMOVKEN origina os imóveis, faz a vitrine e recebe por originação/corretagem. É o caminho mais curto.
  2. **Tornar-se plataforma autorizada** (Resolução CVM 88): exige empresa constituída, governança e autorização da CVM. Mais lento e caro.
- Limites que apareceram na pesquisa: a regra em vigor fala em até R$ 15 milhões por oferta e emissores com receita anual de até R$ 40 milhões; a proposta de substituição (consulta pública até jan/2026) sugere R$ 25 milhões (R$ 50 milhões para securitizadoras). **Não confirmei se a nova regra já foi aprovada.**
- Evite começar por aqui sozinho: vender frações com promessa de renda sem autorização é o cenário de maior risco.

**C. VKEN (moeda/utilidade da plataforma)**
- Faz sentido como crédito de uso: descontos em taxas de anúncio, acesso a relatórios, benefícios. Sem promessa de valorização e sem ser o "recibo" de frações de imóvel.

## Atenção
- A **Resolução 1.551/25 do Cofeci**, sobre tokenização imobiliária, foi suspensa por decisão da Justiça Federal em Brasília (segundo noticiado). Não construa o negócio apoiado nela.
- Se o site **custodiar, intermediar compra e venda de ativos virtuais**, entram as regras do Banco Central (Resoluções 519 a 521). Manter a custódia na carteira de cada usuário reduz esse risco, mas não elimina a análise da CVM sobre o token.
- "Mínima burocracia" e "totalmente legal" só convivem no produto A e no VKEN como utilidade. O B exige parceiro autorizado ou autorização própria.

## Sequência sugerida
1. Reativar o CRECI e ligar a corretagem no site (`BROKER_NAME`, `BROKER_CRECI`, `PLATFORM_FEE_PCT`).
2. Pacote 5: **certificado digital do imóvel** (token emitido na conclusão do negócio) — produto A.
3. Paralelo: conversar com 2 ou 3 plataformas/securitizadoras autorizadas sobre o produto B (parceria de originação).
4. VKEN como crédito de uso dentro do site.

---
## Atualização (24/10/2026): "fundo ou lastro de R$ 30 milhões"
O número que você ouviu provavelmente vem do **Banco Central**: as Resoluções BCB 519, 520 e 521/2025 criaram as Sociedades Prestadoras de Serviços de Ativos Virtuais (SPSAV: intermediárias, custodiantes e corretoras de cripto) e, pela Resolução Conjunta CMN/BCB 14/2025, exigem **capital mínimo entre R$ 10,8 milhões e R$ 37,2 milhões**, conforme a atividade (corretora/exchange no topo da faixa). As regras estão em vigor desde fevereiro de 2026, e matéria de outubro de 2026 fala em prazo de adequação apertando o cerco. A auto-custódia (cada pessoa com a própria carteira) continuou permitida.
- **Não encontrei** uma exigência de "fundo de R$ 30 milhões" para tokenizar imóvel pelo lado da CVM. Se alguém disse isso, peça a fonte.
- **O que isso significa para a IMOVKEN:** ser exchange, corretora de cripto ou custodiar chaves de terceiros exige esse capital e autorização do BC. Por isso o desenho atual evita: o VKEN é negociado pelos próprios usuários na PancakeSwap, o certificado do imóvel é **intransferível** e a IMOVKEN não guarda carteiras nem dinheiro de terceiros.
- **Linha vermelha:** se o site passar a custodiar chaves, intermediar compra e venda de tokens ou permitir trocar/negociar o certificado dentro dele, o enquadramento muda e é preciso reavaliar antes.
- Fontes: Conjur, Capital Aberto, ANBIMA, BMA Law e Finsiders (nov/2025 a out/2026).
