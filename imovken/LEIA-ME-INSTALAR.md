# IMOVKEN — projeto completo consolidado (pacotes 1 a 6 + rodada 8)

Esta pasta é o projeto INTEIRO (não é um pacote de atualização). Já inclui: backend (login, anúncios,
propostas, contratos, certificados, mapa de temperatura), tema neon laranja #FF6A00 e o mapa "Leia o território".

## Novidade desta rodada: Intelligence com ferramentas de verdade
- Aba **Valuation**: informe cidade, bairro, tipo e área e receba a faixa de valor e o preço por m².
  Usa transações reais (se importadas em /admin/dados), depois anúncios da plataforma e, só se não houver nada,
  valores ilustrativos com aviso. Terreno, rural e outro só usam anúncios.
- Aba **Comparáveis**: anúncios com R$/m², filtro por cidade e tipo, ordenação e mediana.
- Aba **Documentos**: certificado do imóvel, contratos e documentos legais.
- Botões "Ver todos" e "Comparar ativos" agora levam à aba Comparáveis.

## Opção A: pelo navegador, sem git
No repositório do GitHub, apague os arquivos antigos, clique em Add file > Upload files, arraste todo o conteúdo
da pasta `imovken` e clique em Commit changes. Não depende mais de nenhuma pasta oculta (a `.figma` foi removida).

## Opção B: com git (resolve o erro "not a git repository")
No PowerShell:

    cd D:\Projetos
    git clone https://github.com/helinho1980/imovken_inteligencia_imobiliaria_tokenizacao_de_imoveis.git imovken-git
    cd imovken-git

1. Apague tudo dentro de `imovken-git`, EXCETO a pasta oculta `.git`.
2. Copie para dentro dela todo o conteúdo da pasta `imovken` deste zip.
3. Depois:

       git add -A
       git commit -m "Projeto consolidado: neon + backend + mapa"
       git push origin main

A Vercel e o Render publicam sozinhos.

## Confira no Render
Abra o serviço da API e veja o endereço dele (algo como https://imovken-api-XXXX.onrender.com).
Ele precisa ser IGUAL ao endereço que está em `vercel.json` (hoje: imovken-api-hzfy.onrender.com).
Se for diferente, troque essa linha e dê push de novo. É por isso que botões podem "não fazer nada".

## Teste rápido depois do deploy
- https://www.imovken.com.br/api/health deve mostrar {"ok":true}
- Criar conta em /cadastro, entrar, anunciar em /anunciar, ver /painel
- /territorio com o visual neon (Ctrl+F5)

## Limites conhecidos
- Plano gratuito do Render: o banco apaga a cada deploy e a API dorme após alguns minutos parada.
- Mapa de temperatura ainda com dados demonstrativos (aviso na tela) até ligar IBGE/ITBI.
- Troca de idioma (10 línguas) ainda não está neste pacote.
