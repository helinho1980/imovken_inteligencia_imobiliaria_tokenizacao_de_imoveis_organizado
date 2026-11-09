import { useEffect, useState } from "react"
import { api, priceLabel, useMe, useSubscription } from "../api"
import { AppShell, Button, navigate } from "../ui"
import { FREE, PRO } from "../plan"

export default function SubscribePage() {
  const { user, loaded } = useMe()
  const sub = useSubscription()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState("")
  const qs = new URLSearchParams(window.location.search)

  // voltou do Stripe: o aviso (webhook) pode demorar alguns segundos
  useEffect(() => {
    if (!qs.get("ok") || sub.premium) return
    let n = 0
    const t = setInterval(async () => { n++; const d = await sub.reload(); if (d.premium || n > 10) clearInterval(t) }, 2500)
    return () => clearInterval(t)
  }, [])

  async function go(path: string) {
    setBusy(true); setMsg("")
    try { const d = await api<{ url: string }>(path, { method: "POST", body: "{}" }); window.location.href = d.url }
    catch (e: any) { setMsg(e.message); setBusy(false) }
  }
  async function refund() {
    if (!confirm(`Estornar e encerrar a assinatura? O valor pago volta para o seu cartão e o acesso Pro termina agora.`)) return
    setBusy(true); setMsg("")
    try { await api("/api/subscription/refund", { method: "POST", body: "{}" }); setMsg("Estorno solicitado. O valor volta ao seu cartão em alguns dias úteis, conforme o banco."); await sub.reload() }
    catch (e: any) { setMsg(e.message) }
    setBusy(false)
  }

  const end = sub.periodEnd ? new Date(sub.periodEnd * 1000).toLocaleDateString("pt-BR") : null
  return (
    <AppShell title="IMOVKEN Pro" subtitle="ASSINATURA">
      <div className="profile-body">
        {qs.get("ok") && <div className="status-banner"><span>{sub.premium ? "Assinatura ativa. Bem-vindo ao Pro!" : "Pagamento recebido. Confirmando a assinatura…"}</span></div>}
        {qs.get("cancelado") && <div className="status-banner"><span>Pagamento cancelado. Nada foi cobrado.</span></div>}
        <div className="auth-card wide">
          <h3>{priceLabel(sub.priceCents)} por mês</h3>
          <p><strong>Grátis</strong></p>
          <ul>{FREE.map((x) => <li key={x}>{x}</li>)}</ul>
          <p><strong>Pro</strong></p>
          <ul>{PRO.map((x) => <li key={x}>{x}</li>)}</ul>
          <p><small>Cobrança mensal recorrente no cartão, processada pelo Stripe. Cancele quando quiser. Estorno integral do primeiro pagamento em até {sub.refundDays} dias.</small></p>

          {!loaded ? null : !user ? (
            <Button icon="arrow" onClick={() => navigate("/entrar")}>Entrar para assinar</Button>
          ) : sub.complimentary ? (
            <p>Seu acesso Pro é cortesia da plataforma.</p>
          ) : sub.premium ? (
            <>
              <p>Assinatura ativa{end ? `, renova em ${end}` : ""}.</p>
              <div className="page-actions">
                <Button variant="secondary" disabled={busy} onClick={() => go("/api/subscription/portal")}>Gerenciar cartão ou cancelar</Button>
                {sub.refundable && <Button variant="secondary" disabled={busy} onClick={refund}>Pedir estorno ({sub.refundDays} dias)</Button>}
              </div>
            </>
          ) : (
            <Button icon="arrow" disabled={busy || !sub.enabled} onClick={() => go("/api/subscription/checkout")}>
              {sub.enabled ? "Assinar o Pro" : "Assinatura em breve"}
            </Button>
          )}
          {msg && <p role="alert">{msg}</p>}
        </div>
      </div>
    </AppShell>
  )
}
