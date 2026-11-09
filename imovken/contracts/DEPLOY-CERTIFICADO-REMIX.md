# Publicar o IMOVKENCertificado (certificado digital de imóvel) pelo Remix

> Faça primeiro na rede **Sepolia** (teste, gratuita). O contrato não guarda dinheiro nem recebe pagamento.
> Nunca compartilhe sua frase de recuperação. A carteira que publica o contrato vira a **dona** (só ela emite, reatribui e revoga).

## 1. Compilar
1. Remix > crie `IMOVKENCertificado.sol` e cole o conteúdo de `contracts/IMOVKENCertificado.sol`.
2. Solidity compiler: versão 0.8.20 ou superior, optimization 200. Se o deploy reclamar de "invalid opcode" numa rede antiga, mude **EVM version** para `paris`.

## 2. Publicar
1. Deploy & run: Environment `Injected Provider - MetaMask`, rede **Sepolia**.
2. Contract `IMOVKENCertificado`. No campo do construtor `baseURI_`, digite: `https://www.imovken.com.br/certificado/`
3. Deploy, confirme na MetaMask e copie o endereço do contrato.

## 3. Emitir um certificado (depois de emitir no site)
1. No site: `/admin/certificados` > **Emitir certificado** do imóvel. A tela mostra o **Hash do dossiê** (começa com 0x).
2. No Remix, no contrato publicado, função **emitir**:
   - `to`: a carteira do titular (ou a sua, para o teste)
   - `code`: o código do certificado (10 caracteres, ex.: `9VG9BBA8GX`)
   - `dossierHash`: o hash do dossiê copiado da tela
3. Confirme. Copie o **hash da transação**.
4. Volte em `/admin/certificados` no mesmo certificado e preencha: rede (`sepolia`), endereço do contrato, Token ID (1 para o primeiro), hash da transação e carteira do titular. Clique em **Gravar registro on-chain**.
5. A página pública `/certificado/<código>` passa a mostrar o registro com links para o Etherscan.

## 4. Depois (só pela dona do contrato)
- `reatribuir(tokenId, novaCarteira, novoHashDoDossiê)`: somente **depois** do novo registro em cartório.
- `atualizarDossie(tokenId, hash)`: quando o dossiê mudar.
- `revogar(tokenId, motivo)`: em caso de erro ou fraude.
- Titulares **não conseguem** transferir nem aprovar terceiros (testado).

## Verificações feitas
12 testes automáticos em EVM local: emissão, tokenURI, hash do dossiê, bloqueio de transferência e aprovação, só o dono emite/reatribui/revoga, código duplicado recusado, revogação.
O contrato não passou por auditoria externa. Como ele não guarda dinheiro, o risco financeiro direto é baixo, mas não publique na rede real sem rodar o ciclo completo na Sepolia.
