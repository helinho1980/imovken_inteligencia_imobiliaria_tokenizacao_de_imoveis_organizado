import { useEffect, useMemo, useState } from "react"
import { api, money, TYPE_LABEL, useMe } from "../api"
import { Icon, navigate } from "../ui"

type Comp = { id: number; title: string; neighborhood: string | null; priceBrl: number; areaM2: number; pricePerM2: number }
type Valuation = {
  method: string; methodLabel: string; warning: string | null; sampleSize: number; isDemo: boolean; region: string | null
  pricePerM2: { low: number; mid: number; high: number }; estimate: { low: number; mid: number; high: number }
  askingPricePerM2: number | null; comparables: Comp[]; disclaimer: string
}
type City = { city: string; state: string }

function useCities() {
  const [cities, setCities] = useState<City[]>([])
  useEffect(() => { api<{ cities: City[] }>("/api/territory/cities").then((d) => setCities(d.cities)).catch(() => {}) }, [])
  return cities
}

export function ValuationTool() {
  const cities = useCities()
  const [f, setF] = useState({ city: "", neighborhood: "", type: "apartamento", area: "" })
  const [res, setRes] = useState<Valuation | null>(null)
  const [err, setErr] = useState("")
  const [busy, setBusy] = useState(false)
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }))

  async function run(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setRes(null); setBusy(true)
    try {
      const qs = new URLSearchParams({ city: f.city, type: f.type, area: f.area })
      if (f.neighborhood) qs.set("neighborhood", f.neighborhood)
      setRes(await api<Valuation>(`/api/valuation?${qs}`))
    } catch (x: any) { setErr(x.message) } finally { setBusy(false) }
  }

  return (
    <div className="tool-grid">
      <form className="workspace-card tool-form" onSubmit={run}>
        <div className="workspace-head"><div><span>VALUATION</span><h3>Quanto vale este imóvel?</h3></div></div>
        <label>Cidade
          <input required list="tool-cities" value={f.city} onChange={(e) => set("city", e.target.value)} placeholder="Ex.: Bauru" />
          <datalist id="tool-cities">{cities.map((c) => <option key={c.city} value={c.city}>{c.city}/{c.state}</option>)}</datalist>
        </label>
        <label>Bairro (opcional)<input value={f.neighborhood} onChange={(e) => set("neighborhood", e.target.value)} placeholder="Melhora a precisão" /></label>
        <div className="row2">
          <label>Tipo<select value={f.type} onChange={(e) => set("type", e.target.value)}>{Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label>Área (m²)<input required inputMode="decimal" value={f.area} onChange={(e) => set("area", e.target.value.replace(",", ".").replace(/[^\d.]/g, ""))} /></label>
        </div>
        {err && <div className="form-error">{err}</div>}
        <button className="btn btn-primary" disabled={busy || !f.city || !Number(f.area)} type="submit"><span>{busy ? "Calculando..." : "Estimar valor"}</span></button>
        <p className="tool-note">Usamos transações reais quando existem, depois anúncios da plataforma. Se não houver nenhum dos dois, mostramos valores ilustrativos e avisamos.</p>
      </form>

      <div className="workspace-card tool-result">
        {!res && !busy && <div className="tool-empty"><Icon name="trend" size={28} /><p>Preencha os dados ao lado para ver a faixa de valor, o preço por m² e os imóveis usados na comparação.</p></div>}
        {res && (
          <>
            <div className="workspace-head"><div><span>ESTIMATIVA INDICATIVA{res.region ? ` · ${res.region.toUpperCase()}` : ""}</span><h3>{money(res.estimate.low)} a {money(res.estimate.high)}</h3></div></div>
            <div className="tool-kpis">
              <div><span>VALOR CENTRAL</span><strong>{money(res.estimate.mid)}</strong></div>
              <div><span>PREÇO POR M²</span><strong>{money(res.pricePerM2.mid)}</strong><small>faixa {money(res.pricePerM2.low)} a {money(res.pricePerM2.high)}</small></div>
              {res.askingPricePerM2 && <div><span>PREÇO PEDIDO (ANÚNCIOS)</span><strong>{money(res.askingPricePerM2)}/m²</strong></div>}
            </div>
            <p className="tool-method"><b>Método:</b> {res.methodLabel}{res.method !== "demonstrativo" ? ` · ${res.sampleSize} ${res.method.startsWith("transacoes") ? "transações" : "anúncios"}` : ""}.</p>
            {res.warning && <div className={res.isDemo ? "tool-warn strong" : "tool-warn"}>{res.warning}</div>}
            {res.comparables.length > 0 && (
              <>
                <h4 className="tool-sub">Imóveis usados como referência</h4>
                <div className="tool-list">
                  {res.comparables.map((c) => (
                    <button className="comparable-row" key={c.id} onClick={() => navigate(`/imovel/${c.id}`)}>
                      <div><strong>{c.title}</strong><small>{c.neighborhood || "—"} · {c.areaM2} m²</small></div>
                      <span>{money(c.priceBrl)}</span><em>{money(c.pricePerM2)}/m²</em><Icon name="chevron" size={15} />
                    </button>
                  ))}
                </div>
              </>
            )}
            <div className="tool-actions">
              <button className="btn btn-primary" onClick={() => navigate("/anunciar")}><span>Anunciar este imóvel</span></button>
              <button className="btn btn-secondary" onClick={() => navigate("/territorio")}><span>Ver no mapa de temperatura</span></button>
            </div>
            <p className="tool-note">{res.disclaimer}</p>
          </>
        )}
      </div>
    </div>
  )
}

export function ComparablesTool() {
  const cities = useCities()
  const [city, setCity] = useState("")
  const [type, setType] = useState("")
  const [items, setItems] = useState<(Comp & { type: string; state: string })[] | null>(null)
  const [sort, setSort] = useState<"pm2" | "price" | "area">("pm2")

  useEffect(() => {
    const qs = new URLSearchParams()
    if (city) qs.set("city", city)
    if (type) qs.set("type", type)
    setItems(null)
    api<{ items: any[] }>(`/api/listings?${qs}`).then((d) => setItems(d.items.filter((i) => i.areaM2 > 0).map((i) => ({ id: i.id, title: i.title, neighborhood: i.neighborhood, priceBrl: i.priceBrl, areaM2: i.areaM2, pricePerM2: i.pricePerM2, type: i.type, state: i.state })))).catch(() => setItems([]))
  }, [city, type])

  const sorted = useMemo(() => {
    const a = [...(items || [])]
    a.sort((x, y) => sort === "pm2" ? x.pricePerM2 - y.pricePerM2 : sort === "price" ? x.priceBrl - y.priceBrl : y.areaM2 - x.areaM2)
    return a
  }, [items, sort])
  const median = useMemo(() => {
    const v = (items || []).map((i) => i.pricePerM2).sort((a, b) => a - b)
    return v.length ? v[Math.floor((v.length - 1) / 2)] : null
  }, [items])

  return (
    <div className="workspace-card tool-wide">
      <div className="workspace-head">
        <div><span>COMPARÁVEIS</span><h3>Anúncios com preço por m²</h3></div>
        <div className="tool-filters">
          <input list="cmp-cities" placeholder="Cidade" value={city} onChange={(e) => setCity(e.target.value)} />
          <datalist id="cmp-cities">{cities.map((c) => <option key={c.city} value={c.city} />)}</datalist>
          <select value={type} onChange={(e) => setType(e.target.value)}><option value="">Todos os tipos</option>{Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <select value={sort} onChange={(e) => setSort(e.target.value as any)}><option value="pm2">Menor R$/m²</option><option value="price">Menor preço</option><option value="area">Maior área</option></select>
        </div>
      </div>
      {median != null && <p className="tool-method"><b>Mediana:</b> {money(median)}/m² em {items!.length} anúncio(s).</p>}
      {items === null && <p className="tool-note">Carregando...</p>}
      {items && items.length === 0 && (
        <div className="tool-empty"><Icon name="data" size={28} /><p>Nenhum anúncio com área informada {city ? `em ${city}` : "ainda"}. Quanto mais anúncios, melhor a comparação.</p>
          <button className="btn btn-primary" onClick={() => navigate("/anunciar")}><span>Anunciar imóvel</span></button></div>
      )}
      <div className="tool-list">
        {sorted.map((c) => (
          <button className="comparable-row" key={c.id} onClick={() => navigate(`/imovel/${c.id}`)}>
            <div><strong>{c.title}</strong><small>{TYPE_LABEL[c.type] || c.type} · {c.neighborhood || "—"} · {c.areaM2} m²</small></div>
            <span>{money(c.priceBrl)}</span><em>{money(c.pricePerM2)}/m²</em><Icon name="chevron" size={15} />
          </button>
        ))}
      </div>
    </div>
  )
}

export function DocumentsTool() {
  const { user } = useMe()
  const docs: { icon: "shield" | "token" | "layers" | "check"; title: string; text: string; to: string }[] = [
    { icon: "shield", title: "Certificado do imóvel", text: "Registre o documento do imóvel com impressão digital (hash) e emita um certificado verificável.", to: "/certificar" },
    { icon: "layers", title: "Meus contratos e propostas", text: user ? "Acompanhe propostas, minutas e assinaturas dos seus negócios." : "Entre na sua conta para acompanhar propostas e minutas.", to: user ? "/painel" : "/entrar" },
    { icon: "check", title: "Termos de uso", text: "Regras de uso da plataforma.", to: "/termos" },
    { icon: "check", title: "Política de privacidade", text: "Como tratamos seus dados (LGPD).", to: "/privacidade" },
    { icon: "check", title: "Contrato de adesão", text: "Condições da relação com a plataforma.", to: "/contrato-adesao" },
    { icon: "token", title: "Aviso de riscos", text: "Riscos de investimentos e tokenização.", to: "/riscos" },
  ]
  return (
    <div className="tool-docs">
      {docs.map((d) => (
        <button className="workspace-card tool-doc" key={d.title} onClick={() => navigate(d.to)}>
          <Icon name={d.icon} size={22} /><strong>{d.title}</strong><small>{d.text}</small><span>Abrir <Icon name="arrow" size={13} /></span>
        </button>
      ))}
    </div>
  )
}
