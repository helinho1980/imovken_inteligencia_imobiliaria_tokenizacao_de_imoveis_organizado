# Publicar o IMOVKENCRIPTO (VKEN) pelo Remix

> Faça primeiro na rede de teste **Sepolia** (gratuita) para ensaiar. Depois repita na **Ethereum Mainnet**.
> Você precisa de uma carteira (MetaMask) com ETH para as taxas. Nunca compartilhe sua frase de recuperação com ninguém, nem comigo.

## 1. Preparar
1. Abra https://remix.ethereum.org
2. Em **File explorer**, crie o arquivo `IMOVKENCRIPTO.sol` e cole o conteúdo de `contracts/IMOVKENCRIPTO.sol`.
3. Aba **Solidity compiler**: versão **0.8.20 ou superior** (ex.: 0.8.26), **Enable optimization = 200**, clique em **Compile**.
   (O Remix baixa o OpenZeppelin sozinho pelo `import "@openzeppelin/contracts/..."`.)

## 2. Publicar
1. Aba **Deploy & run transactions**.
2. **Environment**: `Injected Provider - MetaMask`. Na MetaMask, escolha a rede (Sepolia para teste, Ethereum Mainnet para valer).
3. **Contract**: `IMOVKENCRIPTO`.
4. Ao lado de **Deploy**, no campo `initialSupplyWhole`, digite `1000000000` (1 bilhão de tokens inteiros).
   Esse número precisa ser o mesmo do White Paper (seção 6.2). Se quiser outro, altere os dois.
5. Clique em **Transact/Deploy**, confirme na MetaMask e aguarde.
6. Copie o endereço do contrato em **Deployed Contracts**. Confira na MetaMask que o saldo de VKEN da sua carteira é o supply total.

## 3. Verificar o código no Etherscan (importante para confiança)
Na página do contrato no Etherscan: **Contract > Verify and Publish**. Compiler 0.8.26 (a mesma do Remix), optimization 200, licença MIT, cole o código. Se ficar difícil com os imports, use o plugin **Contract Verification** do Remix.

## 4. Liquidez na PancakeSwap (rede Ethereum)
1. Acesse https://pancakeswap.finance e conecte a carteira.
2. Mude a rede do site para **Ethereum**. Em **Liquidity > Add Liquidity (V3)**, escolha VKEN e um par (ETH ou USDC).
3. Cole o endereço do VKEN se ele não aparecer; aprove o token; defina o preço inicial e a faixa; confirme.
4. Lembre: as taxas de rede costumam ser altas na Ethereum e a liquidez pequena deixa o preço instável.
   Sugestão: **não use fundos que você não pode perder** e considere travar a liquidez inicial depois.

## 5. Colocar o endereço no site
Na Vercel: Projeto > Settings > Environment Variables > crie `VITE_VKEN_ADDRESS` com o endereço (começa com 0x).
Depois, em Deployments, use **Redeploy**. A página /token passa a mostrar o contrato, o link do Etherscan e o botão da PancakeSwap.

## Sobre a CRICRIPTO que você já tem
Se esse for o token que vira o VKEN, **não publique outro contrato**: use o endereço dele em `VITE_VKEN_ADDRESS`
e me envie o código-fonte para eu conferir se ele bate com o White Paper (supply, sem mint, sem dono).
