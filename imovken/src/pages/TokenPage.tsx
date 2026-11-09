import { useState } from "react"
import { AppShell, Button, Icon, navigate } from "../ui"

const ADDRESS = (import.meta.env.VITE_VKEN_ADDRESS as string | undefined)?.trim() || ""
const valid = /^0x[0-9a-fA-F]{40}$/.test(ADDRESS)
const ETHERSCAN = valid ? `https://etherscan.io/token/${ADDRESS}` : ""
const PANCAKE = valid ? `https://pancakeswap.finance/swap?chain=eth&outputCurrency=${ADDRESS}` : ""
const CHAIN_ETH = "0x1"

type Wallet = { account: string; chainId: string; balance: string | null; supply: string | null }

const eth = () => (window as any).ethereum as { request: (a: { method: string; params?: any }) => Promise<any> } | undefined
const fmt = (hex: string) => {
  const v = BigInt(hex)
  const whole = v / 10n ** 18n
  const frac = (v % 10n ** 18n).toString().padStart(18, "0").slice(0, 4)
  return `${whole.toLocaleString("pt-BR")},${frac}`
}

export default function TokenPage() {
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [msg, setMsg] = useState("")
  const [copied, setCopied] = useState(false)

  async function connect() {
    const p = eth()
    if (!p) return setMsg("Nenhuma carteira encontrada. Instale a MetaMask ou outra carteira compatível com Ethereum.")
    try {
      const [account] = await p.request({ method: "eth_requestAccounts" })
      const chainId = await p.request({ method: "eth_chainId" })
      let balance: string | null = null, supply: string | null = null
      if (valid && chainId === CHAIN_ETH) {
        const data = "0x70a08231" + account.slice(2).toLowerCase().padStart(64, "0")
        balance = fmt(await p.request({ method: "eth_call", params: [{ to: ADDRESS, data }, "latest"] }))
        supply = fmt(await p.request({ method: "eth_call", params: [{ to: ADDRESS, data: "0x18160ddd" }, "latest"] }))
      }
      setWallet({ account, chainId, balance, supply })
      setMsg(chainId !== CHAIN_ETH ? "Sua carteira não está na rede Ethereum (Mainnet). Troque de rede para ver o saldo." : "")
    } catch (e: any) {
      setMsg(e?.message || "Não foi possível conectar a carteira.")
    }
  }

  async function addToWallet() {
    const p = eth()
    if (!p || !valid) return
    try {
      await p.request({ method: "wallet_watchAsset", params: { type: "ERC20", options: { address: ADDRESS, symbol: "VKEN", decimals: 18 } } })
    } catch (e: any) { setMsg(e?.message || "Não foi possível adicionar o token.") }
  }

  return (
    <AppShell title="IMOVKENCRIPTO · VKEN" subtitle="TOKEN DE UTILIDADE DA PLATAFORMA">
      <div className="profile-body">
        <div className="status-banner">
          <Icon name="shield" />
          <span>
            <strong>Leia antes de qualquer operação.</strong> O VKEN é um token de utilidade, sem promessa de retorno ou valorização.
            Ativos virtuais são voláteis e você pode perder todo o valor aplicado. O site não vende o token e não guarda sua carteira:
            qualquer compra ou venda é feita por você, em ambiente de terceiros. Veja o <a href="/riscos">Aviso de Riscos</a>.
          </span>
        </div>

        <div className="token-grid">
          <article>
            <span>CONTRATO</span>
            <h3>Ethereum · ERC-20</h3>
            {valid ? (
              <>
                <code className="addr">{ADDRESS}</code>
                <div className="token-actions">
                  <button className="btn btn-secondary" onClick={() => { navigator.clipboard?.writeText(ADDRESS); setCopied(true); setTimeout(() => setCopied(false), 1500) }}><span>{copied ? "Copiado" : "Copiar endereço"}</span></button>
                  <a className="btn btn-secondary" href={ETHERSCAN} target="_blank" rel="noreferrer"><span>Ver no Etherscan</span></a>
                </div>
                <p className="auth-note">Confira sempre o endereço acima antes de qualquer operação. Existem tokens falsos com o mesmo nome.</p>
              </>
            ) : (
              <p className="auth-note">O contrato ainda não foi publicado nesta versão do site. Quando for, o endereço oficial aparecerá aqui.</p>
            )}
          </article>

          <article>
            <span>COMO FUNCIONA</span>
            <h3>Oferta fixa e transparente</h3>
            <ul className="insights light">
              <li>O supply total é criado uma única vez, na publicação do contrato.</li>
              <li>Não existe função para criar novos tokens, nem administrador, taxa de transferência ou bloqueio de carteiras.</li>
              <li>Qualquer titular pode queimar os próprios tokens.</li>
              <li>O código é público e deve ser verificado antes de qualquer operação.</li>
            </ul>
          </article>

          <article>
            <span>NEGOCIAÇÃO</span>
            <h3>PancakeSwap (terceiros)</h3>
            <p className="auth-note">O preço do VKEN é formado pelo mercado, em pools de terceiros. Pools com pouca liquidez têm preço instável e podem não permitir a venda.</p>
            {valid ? (
              <a className="btn btn-primary" href={PANCAKE} target="_blank" rel="noreferrer"><span>Abrir na PancakeSwap</span></a>
            ) : (
              <button className="btn btn-primary" disabled><span>Disponível após a publicação</span></button>
            )}
          </article>

          <article>
            <span>SUA CARTEIRA</span>
            <h3>Conferir saldo</h3>
            {!wallet ? (
              <Button icon="arrow" onClick={connect}>Conectar carteira</Button>
            ) : (
              <div className="wallet-box">
                <code className="addr">{wallet.account}</code>
                {wallet.balance != null && <p>Saldo: <b>{wallet.balance} VKEN</b></p>}
                {wallet.supply != null && <p className="auth-note">Supply total: {wallet.supply} VKEN</p>}
                {valid && wallet.chainId === CHAIN_ETH && <button className="link-btn" onClick={addToWallet}>Adicionar VKEN à carteira</button>}
              </div>
            )}
            <p className="auth-note">A conexão só lê o endereço e o saldo. Nunca pedimos sua frase de recuperação.</p>
            {msg && <div className="form-error" style={{ margin: 0 }}>{msg}</div>}
          </article>
        </div>

        <div className="profile-cta">
          <a className="btn btn-primary" href="/whitepaper-imovken.pdf" download><span>Baixar White Paper (PDF)</span></a>
          <Button variant="secondary" onClick={() => navigate("/riscos")}>Aviso de Riscos</Button>
        </div>
      </div>
    </AppShell>
  )
}
