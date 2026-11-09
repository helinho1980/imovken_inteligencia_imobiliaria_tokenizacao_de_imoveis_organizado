import { AppShell, Button, navigate } from "../ui"

const ADDRESS = (import.meta.env.VITE_VKEN_ADDRESS as string | undefined)?.trim() || ""
const valid = /^0x[0-9a-fA-F]{40}$/.test(ADDRESS)
const PANCAKE = valid ? `https://pancakeswap.finance/swap?chain=eth&outputCurrency=${ADDRESS}` : "https://pancakeswap.finance/swap"

// Logos oficiais: baixe nos kits de marca de cada empresa e salve em public/partners/ (metamask.svg, pancakeswap.svg).
// Sem o arquivo, a tela mostra só o nome.
function Brand({ file, name }: { file: string; name: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <img src={`/partners/${file}`} alt="" height={32} style={{ height: 32 }} onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")} />
      <strong>{name}</strong>
    </span>
  )
}

export default function WalletGuidePage() {
  return (
    <AppShell title="Como operar: MetaMask e PancakeSwap" subtitle="GUIA PASSO A PASSO">
      <div className="profile-body">
        <div className="status-banner"><span><strong>Leia antes.</strong> A IMOVKEN não guarda a sua carteira, a sua frase de recuperação nem o seu dinheiro. MetaMask e PancakeSwap são serviços de terceiros, sem ligação com a IMOVKEN. Isto é orientação de uso, não recomendação de investimento: tokens podem perder valor.</span></div>

        <div className="auth-card wide">
          <h3><Brand file="metamask.svg" name="MetaMask" /></h3>
          <p>A MetaMask é a carteira que guarda os seus tokens e assina as operações.</p>
          <ol>
            <li>Instale somente pelo site oficial <strong>metamask.io</strong> ou pela loja oficial do seu navegador ou celular. Ignore anúncios e links recebidos por mensagem.</li>
            <li>Crie a carteira e defina uma senha. A MetaMask mostra uma <strong>frase de recuperação</strong> de 12 palavras: anote no papel, guarde offline e <strong>nunca</strong> digite em site, WhatsApp ou e-mail. Ninguém da IMOVKEN, da MetaMask ou da PancakeSwap pede essa frase.</li>
            <li>Confira o endereço da sua carteira (começa com 0x) copiando pelo botão da própria MetaMask.</li>
            <li>Para pagar as taxas da rede (gás), mantenha um pouco de ETH na carteira. Compre em uma corretora regulamentada e envie para o seu endereço, começando por um valor pequeno de teste.</li>
          </ol>
        </div>

        <div className="auth-card wide">
          <h3><Brand file="pancakeswap.svg" name="PancakeSwap" /></h3>
          <p>A PancakeSwap é uma plataforma descentralizada onde os próprios usuários trocam tokens entre si.</p>
          <ol>
            <li>Abra o endereço <strong>pancakeswap.finance</strong> digitando você mesmo ou pelo botão abaixo e clique em <strong>Connect Wallet</strong> e depois <strong>MetaMask</strong>.</li>
            <li>Escolha a rede em que o token foi publicado (a mesma indicada na página do token).</li>
            <li>No campo do token que você quer receber, cole o <strong>endereço do contrato</strong> mostrado na página oficial do token da IMOVKEN e confira cada caractere. Tokens falsos com o mesmo nome são comuns.</li>
            <li>Digite o valor. Confira o preço estimado, a tolerância de variação (slippage) e a taxa de rede antes de confirmar. Se não entende um campo, não confirme.</li>
            <li>Confirme na MetaMask. Depois, veja a transação no explorador da rede (Etherscan) usando o código da transação.</li>
            <li>Para sair da posição, faça o caminho inverso na mesma tela, trocando o token por ETH.</li>
          </ol>
          <div className="page-actions">
            <a className="btn btn-primary" href={PANCAKE} target="_blank" rel="noreferrer"><span>Abrir a PancakeSwap</span></a>
            <Button variant="secondary" onClick={() => navigate("/token")}>Página oficial do token</Button>
          </div>
        </div>

        <div className="auth-card wide">
          <h3>Sinais de golpe</h3>
          <ul>
            <li>Alguém pede a sua frase de recuperação, uma "validação" da carteira ou acesso remoto ao computador.</li>
            <li>Promessa de lucro garantido, "dobrar em X dias" ou pressa para comprar.</li>
            <li>O endereço do contrato é diferente do publicado em imovken.com.br/token.</li>
            <li>Mensagem privada de "suporte" oferecendo ajuda com a sua carteira.</li>
          </ul>
        </div>
      </div>
    </AppShell>
  )
}
