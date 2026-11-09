import { useEffect, useState } from "react"
import { api, getConfig, isExpired, money, ROLE_LABELS, startCheckout, STATUS_LABEL, TYPE_LABEL, useMe, type Config } from "../api"
import { deletePhoto, resizeToJpeg, uploadPhoto } from "../photos"
import { AppShell, Button, navigate } from "../ui"
import type { Listing } from "./ListingsPage"

export default function ListingDetailPage({ id }: { id: string }) {
  const { user } = useMe()
  const [l, setL] = useState<Listing | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [amount, setAmount] = useState("")
  const [msg, setMsg] = useState("")
  const [err, setErr] = useState("")
  const [done, setDone] = useState(false)
  const [cfg, setCfg] = useState<Config | null>(null)
  const [cur, setCur] = useState(0)
  const [busy, setBusy] = useState(false)
  useEffect(() => { getConfig().then(setCfg) }, [])

  useEffect(() => {
    api<{ listing: Listing; isOwner: boolean }>(`/api/listings/${id}`).then((d) => { setL(d.listing); setIsOwner(d.isOwner); setAmount(String(Math.round(d.listing.priceBrl))) }).catch((e) => setErr(e.message))
  }, [id, user?.email])

  const reload = () => api<{ listing: Listing; isOwner: boolean }>(`/api/listings/${id}`).then((d) => setL(d.listing)).catch(() => {})
  async function addPhotos(files: FileList | null) {
    if (!files) return
    setBusy(true); setErr("")
    try {
      for (const f of Array.from(files)) await uploadPhoto(Number(id), await resizeToJpeg(f))
      await reload()
    } catch (x: any) { setErr(x.message) } finally { setBusy(false) }
  }
  async function removePhoto(pid: number) {
    try { await deletePhoto(pid); setCur(0); await reload() } catch (x: any) { setErr(x.message) }
  }
  async function pay() {
    setErr("")
    try { await startCheckout(Number(id)) } catch (x: any) { setErr(x.message) }
  }

  async function propose(e: React.FormEvent) {
    e.preventDefault(); setErr("")
    try {
      await api(`/api/listings/${id}/proposals`, { method: "POST", body: JSON.stringify({ amountBrl: Number(amount), message: msg || undefined }) })
      setDone(true)
    } catch (x: any) { setErr(x.message) }
  }

  if (!l) return <AppShell title={err ? "Anúncio não encontrado" : "Carregando..."} subtitle="IMÓVEL"><div className="profile-body">{err && <div className="form-error" style={{ margin: 0 }}>{err}</div>}<Button variant="secondary" onClick={() => navigate("/imoveis")}>Ver todos os imóveis</Button></div></AppShell>

  return (
    <AppShell title={l.title} subtitle={`${TYPE_LABEL[l.type]?.toUpperCase()} · ${l.city.toUpperCase()}/${l.state}`}>
      <div className="profile-body detail-grid">
        <section>
          {l.photos.length > 0 && (
            <div className="gallery">
              <img className="gallery-main" alt={l.title} src={`/api/photos/${l.photos[Math.min(cur, l.photos.length - 1)]}`} />
              <div className="gallery-thumbs">
                {l.photos.map((pid, i) => (
                  <div key={pid} className={i === cur ? "thumb on" : "thumb"}>
                    <img alt="" loading="lazy" src={`/api/photos/${pid}`} onClick={() => setCur(i)} />
                    {isOwner && <button title="Remover foto" onClick={() => removePhoto(pid)}>×</button>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {isOwner && l.photos.length < 8 && (
            <label className="photo-add">{busy ? "Enviando..." : "+ Adicionar fotos (até 8)"}<input type="file" accept="image/*" multiple disabled={busy} onChange={(e) => addPhotos(e.target.files)} /></label>
          )}
          <div className="price-big">{money(l.priceBrl)}</div>
          <div className="kv light">
            <div><span>Área</span><b>{l.areaM2 ? `${l.areaM2} m²` : "—"}</b></div>
            <div><span>Preço / m²</span><b>{money(l.pricePerM2)}</b></div>
            <div><span>Dormitórios</span><b>{l.bedrooms ?? "—"}</b></div>
            <div><span>Situação</span><b>{STATUS_LABEL[l.status]}</b></div>
          </div>
          {l.description && <p className="listing-desc">{l.description}</p>}
          <p className="auth-note">
            Anunciante: {l.owner.name} ({ROLE_LABELS[l.owner.role] ?? l.owner.role}){l.owner.creci ? ` · ${l.owner.creci}` : ""}. Corretagem informada: {l.brokerCommissionPct}%.
            Os dados do anúncio são de responsabilidade do anunciante. Confira a documentação do imóvel antes de negociar.
          </p>
          <p className="auth-note"><button className="link-btn" onClick={() => navigate("/territorio")}>Ver o território desta região →</button></p>
        </section>
        <aside className="auth-card">
          {isOwner ? (
            <><h2>Seu anúncio</h2>
              <p className="auth-note">{STATUS_LABEL[isExpired(l) ? "expirado" : l.status]}{l.publishedUntil ? ` · válido até ${new Date(l.publishedUntil.replace(" ", "T") + "Z").toLocaleDateString("pt-BR")}` : ""}</p>
              {(l.status === "aguardando_pagamento" || isExpired(l)) && cfg && cfg.adPriceBrl > 0 && (
                <><Button onClick={pay}>Pagar {money(cfg.adPriceBrl)} e publicar por {cfg.adDays} dias</Button><p className="auth-note">Pagamento por Pix, cartão ou boleto no Mercado Pago. O anúncio entra no ar assim que o pagamento é confirmado.</p></>
              )}
              {l.status === "publicado" && !isExpired(l) && cfg && cfg.adPriceBrl > 0 && <button className="link-btn" onClick={pay}>Renovar por mais {cfg.adDays} dias ({money(cfg.adPriceBrl)})</button>}
              {err && <div className="form-error">{err}</div>}
              <Button variant="secondary" onClick={() => navigate("/painel")}>Abrir painel</Button></>
          ) : l.status !== "publicado" || isExpired(l) ? (
            <><h2>Em negociação</h2><p className="auth-note">Este imóvel já tem uma proposta aceita.</p></>
          ) : !user ? (
            <><h2>Fazer proposta</h2><p className="auth-note">Entre na sua conta para propor.</p><Button onClick={() => navigate("/entrar")}>Entrar</Button></>
          ) : done ? (
            <><h2>Proposta enviada</h2><p className="auth-note">O anunciante foi avisado por e-mail. Acompanhe no painel.</p><Button onClick={() => navigate("/painel")}>Abrir painel</Button></>
          ) : (
            <form onSubmit={propose} className="auth-card" style={{ border: 0, padding: 0 }}>
              <h2>Fazer proposta</h2>
              <label>Valor (R$)<input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} required /></label>
              <label>Mensagem (opcional)<textarea rows={3} maxLength={800} value={msg} onChange={(e) => setMsg(e.target.value)} /></label>
              {err && <div className="form-error">{err}</div>}
              <button className="btn btn-primary" type="submit"><span>Enviar proposta</span></button>
              <p className="auth-note">A proposta não obriga nenhuma das partes até o aceite da minuta de contrato.</p>
            </form>
          )}
        </aside>
      </div>
    </AppShell>
  )
}
