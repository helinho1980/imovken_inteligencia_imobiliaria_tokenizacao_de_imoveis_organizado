import { useEffect, useState } from "react"
import { api, CERT_STATUS, getConfig, isExpired, money, sha256File, startCheckout, STATUS_LABEL, useMe, type Config } from "../api"
import { AppShell, Button, navigate } from "../ui"
import type { Listing } from "./ListingsPage"

type Prop = { id: number; listingId: number; listingTitle: string; amountBrl: number; counterAmountBrl?: number; message?: string; status: string; buyerName?: string; contractId?: number }
type Overview = { creci: string | null; listings: Listing[]; received: Prop[]; sent: Prop[] }

export default function DashboardPage() {
  const { user, loaded } = useMe()
  const [o, setO] = useState<Overview | null>(null)
  const [err, setErr] = useState("")
  const [cfg, setCfg] = useState<Config | null>(null)
  const [certs, setCerts] = useState<any[]>([])
  const loadCerts = () => api<{ items: any[] }>("/api/me/certificates").then((d) => setCerts(d.items)).catch(() => {})
  useEffect(() => { if (user) loadCerts() }, [user?.email])
  async function addDoc(id: number, f: File | undefined) {
    if (!f) return
    const label = window.prompt("Que documento é este? (ex.: Matrícula atualizada)", "Matrícula atualizada")
    if (!label) return
    try { await api(`/api/certificates/${id}/docs`, { method: "POST", body: JSON.stringify({ label, filename: f.name, size: f.size, sha256: await sha256File(f) }) }); await loadCerts() } catch (e: any) { setErr(e.message) }
  }
  async function fillReg(id: number) {
    const matricula = window.prompt("Número da matrícula:"); if (!matricula) return
    const cartorio = window.prompt("Cartório de registro de imóveis:"); if (!cartorio) return
    try { await api(`/api/certificates/${id}`, { method: "PATCH", body: JSON.stringify({ matricula, cartorio }) }); await loadCerts() } catch (e: any) { setErr(e.message) }
  }
  const flash = new URLSearchParams(window.location.search).get("pagamento")
  useEffect(() => { getConfig().then(setCfg) }, [])
  const load = () => api<Overview>("/api/me/overview").then(setO).catch((e) => setErr(e.message))
  useEffect(() => { if (loaded && !user) navigate("/entrar"); else if (user) load() }, [loaded, user?.email])

  async function act(path: string, body?: any) {
    setErr("")
    try { await api(path, { method: "POST", body: JSON.stringify(body ?? {}) }); await load() } catch (e: any) { setErr(e.message) }
  }
  const counter = (p: Prop) => {
    const v = window.prompt("Valor da contraproposta (R$):", String(Math.round(p.amountBrl)))
    const n = Number((v || "").replace(/\D/g, ""))
    if (n > 0) act(`/api/proposals/${p.id}/respond`, { action: "counter", amountBrl: n })
  }

  return (
    <AppShell title="Meu painel" subtitle="ANÚNCIOS, PROPOSTAS E CONTRATOS" action={<Button icon="arrow" onClick={() => navigate("/anunciar")}>Anunciar imóvel</Button>}>
      <div className="profile-body">
        {flash === "ok" && <div className="form-ok">Pagamento recebido. Seu anúncio será publicado assim que o Mercado Pago confirmar (costuma levar poucos instantes).</div>}
        {flash === "pendente" && <div className="status-banner"><span>Pagamento pendente (por exemplo, boleto ou Pix ainda não concluído). O anúncio entra no ar quando for confirmado.</span></div>}
        {flash === "falha" && <div className="form-error" style={{ margin: 0 }}>O pagamento não foi concluído. Você pode tentar de novo no anúncio.</div>}
        {err && <div className="form-error" style={{ margin: 0 }}>{err}</div>}
        {!o ? <p className="auth-note">Carregando...</p> : (
          <>
            <section><h2 className="dash-h">Meus anúncios</h2>
              {o.listings.length === 0 && <p className="auth-note">Você ainda não anunciou nenhum imóvel.</p>}
              <div className="dash-list">
                {o.listings.map((l) => (
                  <div key={l.id} className="dash-row">
                    <div><b>{l.title}</b><small>{money(l.priceBrl)} · {STATUS_LABEL[isExpired(l) ? "expirado" : l.status]}{l.publishedUntil ? ` · até ${new Date(l.publishedUntil.replace(" ", "T") + "Z").toLocaleDateString("pt-BR")}` : ""}</small></div>
                    <div className="dash-actions">
                      <button className="link-btn" onClick={() => navigate(`/imovel/${l.id}`)}>Abrir</button>
                      {(l.status === "aguardando_pagamento" || isExpired(l)) && cfg && cfg.adPriceBrl > 0 && <button className="link-btn" onClick={() => startCheckout(l.id).catch((e) => setErr(e.message))}>Pagar {money(cfg.adPriceBrl)}</button>}
                      {l.status === "publicado" && <button className="link-btn" onClick={() => act(`/api/listings/${l.id}/status`, { status: "pausado" })}>Pausar</button>}
                      {l.status === "pausado" && <button className="link-btn" onClick={() => act(`/api/listings/${l.id}/status`, { status: "publicado" })}>Publicar</button>}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section><h2 className="dash-h">Certificados digitais de imóvel</h2>
              <p className="auth-note">Não é título de propriedade. <button className="link-btn" onClick={() => navigate("/certificar")}>Certificar um imóvel meu →</button></p>
              <div className="dash-list">
                {certs.map((c) => (
                  <div key={c.id} className="dash-row">
                    <div><b>{c.title}</b><small>{CERT_STATUS[c.status]} · código {c.code} · {c.docs.length} documento(s) · {c.kind === "venda" ? "de um negócio concluído" : "imóvel próprio"}</small></div>
                    <div className="dash-actions">
                      <button className="link-btn" onClick={() => navigate(`/certificado/${c.code}`)}>Página pública</button>
                      {c.status === "em_analise" && (!c.matricula || !c.cartorio) && <button className="link-btn" onClick={() => fillReg(c.id)}>Informar matrícula e cartório</button>}
                      {c.status !== "revogado" && <label className="link-btn" style={{ cursor: "pointer" }}>Anexar documento<input type="file" style={{ display: "none" }} onChange={(e) => addDoc(c.id, e.target.files?.[0])} /></label>}
                    </div>
                  </div>
                ))}
                {certs.length === 0 && <p className="auth-note">Nenhum certificado ainda.</p>}
              </div>
            </section>

            <section><h2 className="dash-h">Propostas recebidas</h2>
              {o.received.length === 0 && <p className="auth-note">Nenhuma proposta recebida.</p>}
              <div className="dash-list">
                {o.received.map((p) => (
                  <div key={p.id} className="dash-row">
                    <div><b>{p.listingTitle}</b><small>{p.buyerName} propôs {money(p.amountBrl)}{p.counterAmountBrl ? ` · sua contraproposta ${money(p.counterAmountBrl)}` : ""} · {STATUS_LABEL[p.status]}</small>{p.message && <small>“{p.message}”</small>}</div>
                    <div className="dash-actions">
                      {p.status === "enviada" && <>
                        <button className="link-btn" onClick={() => act(`/api/proposals/${p.id}/respond`, { action: "accept" })}>Aceitar</button>
                        <button className="link-btn" onClick={() => counter(p)}>Contraproposta</button>
                        <button className="link-btn danger" onClick={() => act(`/api/proposals/${p.id}/respond`, { action: "reject" })}>Recusar</button>
                      </>}
                      {p.contractId && <button className="link-btn" onClick={() => navigate(`/contrato/${p.contractId}`)}>Ver contrato</button>}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section><h2 className="dash-h">Propostas enviadas</h2>
              {o.sent.length === 0 && <p className="auth-note">Você ainda não enviou propostas. <button className="link-btn" onClick={() => navigate("/imoveis")}>Ver imóveis</button></p>}
              <div className="dash-list">
                {o.sent.map((p) => (
                  <div key={p.id} className="dash-row">
                    <div><b>{p.listingTitle}</b><small>Sua proposta {money(p.amountBrl)}{p.counterAmountBrl ? ` · contraproposta ${money(p.counterAmountBrl)}` : ""} · {STATUS_LABEL[p.status]}</small></div>
                    <div className="dash-actions">
                      {p.status === "contraproposta" && <>
                        <button className="link-btn" onClick={() => act(`/api/proposals/${p.id}/respond`, { action: "accept" })}>Aceitar {money(p.counterAmountBrl)}</button>
                        <button className="link-btn danger" onClick={() => act(`/api/proposals/${p.id}/respond`, { action: "reject" })}>Recusar</button>
                      </>}
                      {["enviada", "contraproposta"].includes(p.status) && <button className="link-btn" onClick={() => act(`/api/proposals/${p.id}/respond`, { action: "withdraw" })}>Retirar</button>}
                      {p.contractId && <button className="link-btn" onClick={() => navigate(`/contrato/${p.contractId}`)}>Ver contrato</button>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </AppShell>
  )
}
