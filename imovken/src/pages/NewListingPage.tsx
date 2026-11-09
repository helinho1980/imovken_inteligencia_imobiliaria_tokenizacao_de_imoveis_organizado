import { useEffect, useState } from "react"
import { api, getConfig, money, TYPE_LABEL, useMe, type Config } from "../api"
import { AppShell, navigate } from "../ui"

export default function NewListingPage() {
  const { user, loaded } = useMe()
  const [f, setF] = useState({ title: "", description: "", type: "apartamento", city: "", state: "SP", neighborhood: "", priceBrl: "", areaM2: "", bedrooms: "", brokerCommissionPct: "0", creci: "" })
  const [auth, setAuth] = useState(false)
  const [err, setErr] = useState("")
  const [busy, setBusy] = useState(false)
  const [cfg, setCfg] = useState<Config | null>(null)
  useEffect(() => { getConfig().then(setCfg) }, [])
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }))
  useEffect(() => { if (loaded && !user) navigate("/entrar") }, [loaded, user])

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setBusy(true)
    try {
      if (user?.role === "corretor" && f.creci) await api("/api/me/profile", { method: "PATCH", body: JSON.stringify({ creci: f.creci }) })
      const d = await api<{ id: number }>("/api/listings", {
        method: "POST",
        body: JSON.stringify({
          title: f.title, description: f.description || undefined, type: f.type, city: f.city, state: f.state, neighborhood: f.neighborhood || undefined,
          priceBrl: Number(f.priceBrl), areaM2: f.areaM2 ? Number(f.areaM2) : undefined, bedrooms: f.bedrooms ? Number(f.bedrooms) : undefined,
          brokerCommissionPct: Number(f.brokerCommissionPct || 0), declaresAuthority: auth,
        }),
      })
      navigate(`/imovel/${d.id}`)
    } catch (x: any) { setErr(x.message) } finally { setBusy(false) }
  }

  return (
    <AppShell title="Anunciar imóvel" subtitle="MARKETPLACE">
      <div className="profile-body">
        <form className="auth-card wide" onSubmit={submit}>
          <label>Título<input required minLength={5} maxLength={120} value={f.title} onChange={(e) => set("title", e.target.value)} /></label>
          <div className="row2">
            <label>Tipo<select value={f.type} onChange={(e) => set("type", e.target.value)}>{Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
            <label>Preço (R$)<input required inputMode="numeric" value={f.priceBrl} onChange={(e) => set("priceBrl", e.target.value.replace(/\D/g, ""))} /></label>
          </div>
          <div className="row2">
            <label>Cidade<input required value={f.city} onChange={(e) => set("city", e.target.value)} /></label>
            <label>UF<input required maxLength={2} value={f.state} onChange={(e) => set("state", e.target.value.toUpperCase())} /></label>
          </div>
          <label>Bairro<input value={f.neighborhood} onChange={(e) => set("neighborhood", e.target.value)} /></label>
          <div className="row2">
            <label>Área (m²)<input inputMode="decimal" value={f.areaM2} onChange={(e) => set("areaM2", e.target.value.replace(",", "."))} /></label>
            <label>Dormitórios<input inputMode="numeric" value={f.bedrooms} onChange={(e) => set("bedrooms", e.target.value.replace(/\D/g, ""))} /></label>
          </div>
          <label>Descrição<textarea rows={4} maxLength={2000} value={f.description} onChange={(e) => set("description", e.target.value)} /></label>
          <label>Corretagem informada (% do preço, 0 a 10)<input inputMode="decimal" value={f.brokerCommissionPct} onChange={(e) => set("brokerCommissionPct", e.target.value.replace(",", "."))} /></label>
          {user?.role === "corretor" && <label>CRECI<input required value={f.creci} onChange={(e) => set("creci", e.target.value)} placeholder="Ex.: CRECI-SP 12345" /></label>}
          <label className="accept-box"><input type="checkbox" checked={auth} onChange={(e) => setAuth(e.target.checked)} /><span>Declaro que sou proprietário(a) do imóvel ou tenho autorização para anunciá-lo, e que as informações são verdadeiras.</span></label>
          {err && <div className="form-error">{err}</div>}
          <button className="btn btn-primary" disabled={!auth || busy} type="submit"><span>{busy ? "Publicando..." : "Publicar anúncio"}</span></button>
          <p className="auth-note">{cfg && cfg.adPriceBrl > 0 ? `Publicar custa ${money(cfg.adPriceBrl)} por ${cfg.adDays} dias, pagos no próximo passo (Pix, cartão ou boleto). As fotos são adicionadas na página do anúncio.` : "A publicação é gratuita no momento. As fotos são adicionadas na página do anúncio."}</p>
        </form>
      </div>
    </AppShell>
  )
}
