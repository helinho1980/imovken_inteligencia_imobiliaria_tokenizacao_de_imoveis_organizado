// Documentos legais da IMOVKEN. Para publicar uma nova versão: altere o texto, aumente a
// versão aqui E em server/legal.ts. Quem já aceitou a versão anterior será solicitado a aceitar de novo.

export const COMPANY = {
  name: "IMOVKEN",
  legalName: "IMOVKEN (razão social a informar)",
  cnpj: "CNPJ a informar",
  email: "contato@imovken.com.br",
  privacyEmail: "privacidade@imovken.com.br",
  foro: "Bauru/SP",
  site: "www.imovken.com.br",
}

export const UPDATED = "22 de outubro de 2026"

export type Section = { title: string; body: string[] }
export type LegalDoc = { id: string; version: string; title: string; summary: string; sections: Section[] }

export const LEGAL_DOCS: LegalDoc[] = [
  {
    id: "termos",
    version: "1.3",
    title: "Termos de Uso",
    summary: "Regras para usar o site e a plataforma IMOVKEN.",
    sections: [
      { title: "1. Quem somos e o que é a plataforma", body: [
        `A ${COMPANY.legalName}, inscrita sob ${COMPANY.cnpj}, mantém o site ${COMPANY.site} ("IMOVKEN"), uma plataforma de informação e inteligência imobiliária que apresenta indicadores de mercado, mapas territoriais, relatórios e conteúdos sobre tokenização de ativos reais.`,
        "Ao criar uma conta ou usar o site, você declara que leu e concorda com estes Termos, com a Política de Privacidade, com o Aviso de Riscos e com o Contrato de Adesão.",
      ] },
      { title: "2. Elegibilidade e conta", body: [
        "O uso da conta é restrito a maiores de 18 anos com plena capacidade civil. Você é responsável por manter sua senha em sigilo e por toda atividade realizada na sua conta.",
        "Os dados do cadastro devem ser verdadeiros e atualizados. Podemos suspender ou encerrar contas que violem estes Termos, a lei ou direitos de terceiros.",
      ] },
      { title: "3. Natureza das informações", body: [
        "Os indicadores, índices, \"temperatura\" de regiões, relatórios e análises têm caráter informativo e de apoio à decisão. Não constituem laudo de avaliação, recomendação de compra, venda ou investimento, nem aconselhamento jurídico, tributário ou financeiro.",
        "Enquanto a plataforma informar que determinados dados são de demonstração, eles são ilustrativos e não podem ser usados para decisões reais. A origem de cada fonte é identificada no site e nos relatórios.",
      ] },
      { title: "4. Anúncios, propostas e contratos entre usuários", body: [
        "A IMOVKEN oferece uma ferramenta tecnológica para que usuários publiquem anúncios de imóveis, enviem e respondam propostas e registrem minutas de contrato com aceite eletrônico. A IMOVKEN não é parte dos negócios entre usuários e não garante a existência, a titularidade, a regularidade documental, as condições do imóvel nem o cumprimento das obrigações pelas partes.",
        "Quem anuncia declara ser proprietário do imóvel ou ter autorização para anunciá-lo e responde pela veracidade das informações. Corretores devem informar número de CRECI válido e respondem pela sua atuação profissional. É proibido anunciar imóvel sem autorização, publicar dados falsos ou conteúdo discriminatório.",
        "As minutas geradas na plataforma são modelos genéricos de promessa de compra e venda. Elas não substituem a escritura pública e o registro no cartório de registro de imóveis, quando exigidos por lei, nem o pagamento dos tributos devidos. Recomenda-se revisão por advogado ou corretor habilitado antes de assumir obrigações.",
        "Para gerar o contrato, os dados cadastrais das partes (nome e e-mail) são compartilhados entre elas.",
        "Publicação paga: quando houver taxa de publicação, o valor e o prazo do anúncio serão informados antes do pagamento, que é processado pelo Mercado Pago. A IMOVKEN não armazena dados de cartão. Os direitos do consumidor previstos em lei, inclusive o de arrependimento quando aplicável, ficam preservados. Comissões ou taxas sobre negócios concluídos, quando existirem, serão informadas antes da contratação; a corretagem, quando houver, é prestada por corretor com CRECI ativo identificado na minuta.",
      ] },
      { title: "5. Certificado digital de imóvel", body: [
        "O certificado digital de imóvel da IMOVKEN é um registro eletrônico que documenta a existência e o histórico de um imóvel dentro da plataforma. Ele não é título de propriedade, não substitui a matrícula nem o registro no cartório de registro de imóveis, não representa fração do imóvel, não promete rendimento e não é negociável: o titular não pode transferi-lo a terceiros por conta própria.",
        "Para emitir o certificado, o usuário informa dados do imóvel, número da matrícula e cartório, declara que é o titular e registra a impressão digital (hash SHA-256) de documentos. Os arquivos não são enviados à IMOVKEN. Matrícula e cartório não aparecem na página pública do certificado.",
        "A IMOVKEN pode recusar, suspender ou revogar certificados em caso de dados inconsistentes, documentos falsos, ordem legal ou erro, registrando o motivo no histórico. A troca de titular do certificado só ocorre após comprovação do novo registro do imóvel. Quando o certificado for registrado em blockchain, valem as condições do Aviso de Riscos: registros em blockchain são públicos e permanentes.",
      ] },
      { title: "6. Token IMOVKENCRIPTO (VKEN)", body: [
        "O VKEN é um token de utilidade da plataforma, publicado em contrato inteligente público na rede Ethereum. A IMOVKEN não promete retorno, valorização, liquidez, recompra, dividendos ou participação em resultados em favor de quem o adquire.",
        "O site exibe informações do contrato e links para ambientes de terceiros (como exchanges descentralizadas). A IMOVKEN não custodia suas chaves privadas ou carteiras, não intermedeia a compra ou a venda do VKEN e não controla o preço formado em mercados de terceiros. Qualquer operação é feita por você, com sua carteira, por sua conta e risco, conforme o Aviso de Riscos.",
      ] },
      { title: "7. Condutas proibidas", body: [
        "É proibido usar o site para atividades ilícitas, fraude, lavagem de dinheiro, violação de direitos de terceiros, engenharia reversa, coleta automatizada de dados em desacordo com a lei, ataques à segurança ou sobrecarga da infraestrutura.",
        "É proibido apresentar o VKEN ou a IMOVKEN a terceiros com promessas de ganho, retorno garantido ou captação de recursos em nome da IMOVKEN.",
      ] },
      { title: "8. Propriedade intelectual", body: [
        "Marcas, logotipos, textos, layouts, mapas, índices e software da IMOVKEN são protegidos por lei. O contrato inteligente do VKEN é publicado sob licença MIT, que vale apenas para o código do contrato.",
      ] },
      { title: "9. Limitação de responsabilidade", body: [
        "O site é fornecido no estado em que se encontra, sem garantia de disponibilidade contínua ou ausência de erros. Na máxima extensão permitida pela lei, a IMOVKEN não responde por perdas decorrentes de decisões tomadas com base em informações do site, de falhas de redes blockchain, de contratos de terceiros, de variações de preço ou de uso indevido da sua conta.",
        "Nada nestes Termos exclui direitos que a lei, inclusive o Código de Defesa do Consumidor, assegure a você.",
      ] },
      { title: "10. Alterações, lei e foro", body: [
        "Podemos atualizar estes Termos. Mudanças relevantes terão nova versão e novo aceite. Estes Termos são regidos pelas leis do Brasil e o foro é o da comarca de " + COMPANY.foro + ", ressalvado o foro do domicílio do consumidor, quando a lei assim determinar.",
        `Dúvidas: ${COMPANY.email}.`,
      ] },
    ],
  },
  {
    id: "privacidade",
    version: "1.2",
    title: "Política de Privacidade",
    summary: "Como tratamos seus dados pessoais, conforme a LGPD.",
    sections: [
      { title: "1. Controlador e contato", body: [
        `O controlador dos dados é ${COMPANY.legalName} (${COMPANY.cnpj}). Para exercer seus direitos ou falar sobre privacidade: ${COMPANY.privacyEmail}.`,
      ] },
      { title: "2. Dados que coletamos", body: [
        "Cadastro: nome, e-mail, senha (armazenada apenas de forma criptografada, com hash) e perfil informado (por exemplo, corretor ou entusiasta).",
        "Uso do serviço: anúncios, propostas, minutas de contrato e aceites eletrônicos que você realizar na plataforma (a outra parte do negócio vê seu nome e e-mail); solicitações de análise e mensagens de contato que você enviar; registros técnicos de acesso (endereço IP, data e hora, navegador) para segurança e para comprovar seus aceites.",
        "Certificados de imóvel: dados do imóvel, número da matrícula, cartório e impressões digitais (hash) de documentos. A página pública mostra apenas dados gerais do imóvel, as iniciais do titular, os hashes e o histórico; matrícula e cartório não são exibidos. Registros em blockchain, quando feitos, são públicos e não podem ser apagados.",
        "Carteira: o site pode ler o endereço público e o saldo de VKEN da carteira que você conectar, apenas no seu navegador. Não temos acesso às suas chaves privadas nem à sua frase de recuperação, e nunca as solicitaremos.",
      ] },
      { title: "3. Para que usamos e em que base legal", body: [
        "Executar o contrato e prestar o serviço (criar e manter sua conta, responder a solicitações); cumprir obrigação legal ou regulatória; exercer direitos em processos; e legítimo interesse para segurança, prevenção a fraudes e melhoria do site. Quando exigido, usaremos seu consentimento, que você poderá revogar.",
      ] },
      { title: "4. Compartilhamento", body: [
        "Não vendemos dados pessoais. Compartilhamos apenas com prestadores necessários à operação (hospedagem e infraestrutura, como Vercel e Render, e envio de e-mails transacionais, como o Resend) e com autoridades, quando houver obrigação legal. Esses prestadores podem processar dados fora do Brasil, com salvaguardas previstas na LGPD.",
        "Transações em blockchain são públicas e permanentes por natureza; endereços de carteira e movimentações não podem ser apagados por nós.",
      ] },
      { title: "5. Retenção e segurança", body: [
        "Mantemos os dados pelo tempo necessário às finalidades acima e aos prazos legais. Adotamos medidas técnicas razoáveis, como senhas com hash, cookies de sessão protegidos e conexão segura (HTTPS). Nenhum sistema é totalmente imune; em caso de incidente relevante, comunicaremos titulares e a ANPD conforme a lei.",
      ] },
      { title: "6. Seus direitos", body: [
        "Você pode solicitar confirmação de tratamento, acesso, correção, anonimização, portabilidade, eliminação, informação sobre compartilhamentos e revogação de consentimento, pelo e-mail acima. Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).",
      ] },
      { title: "7. Cookies", body: [
        "Usamos apenas o cookie de sessão necessário ao login. Não usamos cookies de publicidade.",
      ] },
    ],
  },
  {
    id: "adesao",
    version: "1.0",
    title: "Contrato de Adesão",
    summary: "Condições para ter conta e acessar os recursos da plataforma, incluindo a seção do token.",
    sections: [
      { title: "1. Objeto", body: [
        `Este Contrato de Adesão regula o acesso do usuário aos recursos de conta da plataforma ${COMPANY.name}, aos relatórios territoriais e à seção informativa do token VKEN, nos termos dos Termos de Uso, que o integram.`,
        "O aceite é eletrônico e vale como manifestação de vontade. Registramos a versão aceita, data, hora e endereço IP.",
      ] },
      { title: "2. O que a IMOVKEN oferece", body: [
        "Acesso a informações, mapas, relatórios e funcionalidades de conta, conforme disponíveis. A IMOVKEN pode alterar, limitar ou descontinuar recursos, com aviso razoável quando houver impacto relevante.",
      ] },
      { title: "3. O que a IMOVKEN não oferece", body: [
        "Não há promessa de retorno, rentabilidade, valorização, liquidez ou recompra de qualquer token. A IMOVKEN não presta serviço de corretagem, custódia ou intermediação de ativos virtuais e não gerencia carteiras de usuários. Tokens de ativos imobiliários, quando existirem, dependerão de documentação e condições próprias, informadas previamente e à parte.",
      ] },
      { title: "4. Declarações do usuário", body: [
        "Você declara que: (a) tem 18 anos ou mais; (b) agirá por conta própria e com recursos de origem lícita; (c) leu o Aviso de Riscos e entende que ativos virtuais podem perder todo o valor; (d) não usará a plataforma para fins ilícitos; (e) é o único responsável pela guarda das suas chaves e pelas operações que realizar; e (f) cumprirá suas obrigações tributárias decorrentes das suas operações.",
      ] },
      { title: "5. Taxas", body: [
        "O cadastro e o uso das funcionalidades informativas atuais não têm custo. Eventuais serviços pagos futuros terão preço informado antes da contratação e dependerão de novo aceite.",
      ] },
      { title: "6. Vigência e rescisão", body: [
        "O contrato vigora por prazo indeterminado. Você pode encerrar a conta a qualquer momento pelo e-mail de contato. A IMOVKEN pode suspender ou encerrar contas por descumprimento, risco de segurança ou exigência legal.",
      ] },
      { title: "7. Disposições gerais", body: [
        `Aplicam-se as leis brasileiras. Foro: comarca de ${COMPANY.foro}, ressalvado o foro do consumidor. Se alguma cláusula for inválida, as demais permanecem.`,
      ] },
    ],
  },
  {
    id: "riscos",
    version: "1.0",
    title: "Aviso de Riscos",
    summary: "Leia antes de interagir com qualquer token ou contrato inteligente.",
    sections: [
      { title: "Resumo", body: [
        "Ativos virtuais são voláteis e especulativos. Você pode perder todo o dinheiro que colocar neles. Só use valores que possa perder integralmente.",
      ] },
      { title: "Riscos principais", body: [
        "Preço e liquidez: o preço do VKEN é formado por terceiros em mercados descentralizados. Pools com pouca liquidez têm preços muito instáveis, grandes diferenças entre preço esperado e executado e podem não permitir a venda.",
        "Contrato inteligente: contratos podem ter falhas, mesmo simples e baseados em bibliotecas amplamente usadas. Operações em blockchain são irreversíveis; enviar para o endereço errado ou aprovar contratos maliciosos pode causar perda definitiva.",
        "Carteira e golpes: quem tem sua frase de recuperação controla seus fundos. A IMOVKEN nunca pede essa frase. Desconfie de perfis falsos, links e \"suporte\" que ofereçam ajuda ou ganhos.",
        "Taxas de rede: operações na Ethereum exigem pagamento de taxas (gas), que podem ser altas e variar bastante.",
        "Regulatório: a regulação de ativos virtuais no Brasil e no exterior está em evolução e pode afetar a disponibilidade, o uso e o tratamento tributário do VKEN. Você é responsável por cumprir a lei do seu país, incluindo obrigações fiscais.",
        "Projeto: a IMOVKEN é um projeto em desenvolvimento. Recursos podem mudar ou ser descontinuados. O VKEN não é dinheiro em conta, produto financeiro garantido por qualquer entidade ou investimento com expectativa de retorno prometida.",
        "Concentração: o supply total é criado de uma vez e fica inicialmente em carteira do projeto. Movimentações grandes dessa carteira ou de outros grandes titulares podem afetar o preço.",
      ] },
      { title: "O que fazemos para reduzir riscos", body: [
        "Contrato com oferta fixa, sem função de criar novos tokens, sem administrador, sem taxas de transferência e sem poder de bloquear carteiras. O código é público e deve ser verificado por você antes de qualquer operação.",
      ] },
    ],
  },
]

export const LEGAL_VERSIONS: Record<string, string> = Object.fromEntries(LEGAL_DOCS.map((d) => [d.id, d.version]))
