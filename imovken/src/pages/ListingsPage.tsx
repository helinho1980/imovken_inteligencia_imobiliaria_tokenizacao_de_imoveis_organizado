import { useEffect, useState } from "react"
import { api, money, STATUS_LABEL, TYPE_LABEL, useMe } from "../api"
import { AppShell, Button, navigate } from "../ui"

export type Listing = {
  id: number; title: string; description?: string; type: string; city: string; state: string; neighborhood?: string
  priceBrl: number; areaM2?: number; bedrooms?: number; pricePerM2?: number; brokerCommissionPct: number; status: string
  owner: { name: string; role: string; creci?: string | null }
  photos: number[]; publishedUntil?: string | null
}

export default function ListingsPage() {
  const { user } = useMe()
  const [items, setItems] = useState<Listing[]>([])
  const [f, setF] = useState({ city: "", type: "", max: "" })
  const [err, setErr] = useState("")
  const [loaded, setLoaded] = useState(false)

  function load() {
    const q = new URLSearchParams()
    if (f.city) q.set("city", f.city)
    if (f.type) q.set("type", f.type)
    if (f.max) q.set("max", f.max)
    api<{ items: Listing[] }>(`/api/listings?${q}`).then((d) => { setItems(d.items); setLoaded(true) }).catch((e) => setErr(e.message))
  }
  useEffect(load, [])

  return (
    <AppShell
      title="Imóveis anunciados"
      subtitle="MARKETPLACE"
      action={<Button icon="arrow" onClick={() => navigate(user ? "/anunciar" : "/entrar")}>Anunciar imóvel</Button>}
    >
      <div className="profile-body">
        <div className="filter-bar">
          <input placeholder="Cidade" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} />
          <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
            <option value="">Todos os tipos</option>
            {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input placeholder="Preço máximo (R$)" inputMode="numeric" value={f.max} onChange={(e) => setF({ ...f, max: e.target.value.replace(/\D/g, "") })} />
          <Button variant="secondary" onClick={load}>Filtrar</Button>
        </div>
        {err && <div className="form-error" style={{ margin: 0 }}>{err}</div>}
        {loaded && items.length === 0 && <p className="auth-note">Nenhum imóvel encontrado. Seja o primeiro a anunciar.</p>}
        <div className="listing-grid">
          {items.map((l) => (
            <article key={l.id} className="listing-card" onClick={() => navigate(`/imovel/${l.id}`)} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && navigate(`/imovel/${l.id}`)}>
              {l.photos[0] ? <img className="card-photo" alt="" loading="lazy" src={`/api/photos/${l.photos[0]}`} /> : <div className="card-photo empty">Sem foto</div>}
              <span className="tag">{TYPE_LABEL[l.type]}{l.status === "em_negociacao" ? " · " + STATUS_LABEL[l.status] : ""}</span>
              <h3>{l.title}</h3>
              <p>{[l.neighborhood, `${l.city}/${l.state}`].filter(Boolean).join(" · ")}</p>
              <strong>{money(l.priceBrl)}</strong>
              <small>{[l.areaM2 ? `${l.areaM2} m²` : null, l.pricePerM2 ? `${money(l.pricePerM2)}/m²` : null, l.bedrooms != null ? `${l.bedrooms} dorm.` : null].filter(Boolean).join(" · ")}</small>
            </article>
          ))}
        </div>
      </div>
    </AppShell>
  )
}
