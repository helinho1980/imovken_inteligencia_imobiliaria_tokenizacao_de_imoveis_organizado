import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { api, money, useSubscription } from "../api"
import { FREE_LAYER_LIMIT } from "../plan"
import { AppShell, Button, Icon, navigate } from "../ui"
import { LAYER_DOT, buildTwin, composite, crossReading, heat, layerValue, roseSvg, tone } from "./territoryUtils"

const TwinMap3D = lazy(() => import("./TwinMap3D"))

type Layers = Record<string, number>
type LayerDef = { key: string; label: string; dot: string }
type Region = {
  id: string; city: string; state: string; name: string; lat: number; lng: number; radiusM: number
  layers: Layers; priceM2: number | null; change12m: number | null; daysOnMarket: number | null
  deals12m: number | null; listingsActive: number | null; temperature: number; temperatureLabel: string; source: string
}
type City = { city: string; state: string; lat: number; lng: number; regions: number }
type Detail = {
  region: Region; insights: string[]
  relatedAssets: { id: string; name: string; location: string; type: string; valueBrl: number; score: number }[]
}
type Report = {
  title: string; generatedAt: string; region: Region; rank: { position: number; of: number }
  cityAverage: { priceM2: number; temperature: number }; insights: string[]; methodology: string; disclaimer: string
}
type RealData = {
  indicators: { indicator: string; label: string; value: number; unit: string; refPeriod: string; source: string; sourceUrl: string }[]
  sources: { source: string; deals: number; from: string; to: string }[]
  neighborhoods: { name: string; medianPriceM2: number; deals12m: number; change12m: number | null }[]
  note: string
}
type Sources = { active: { id: string; label: string; note: string }[]; planned: { id: string; label: string; note: string }[] }

const DEFAULT_DEFS: LayerDef[] = [
  { key: "temperature", label: "Temperatura", dot: "hot" }, { key: "valorizacao", label: "Valorização", dot: "green" },
  { key: "liquidez", label: "Liquidez", dot: "blue" }, { key: "oferta", label: "Oferta", dot: "violet" },
  { key: "demanda", label: "Demanda", dot: "orange" }, { key: "desenvolvimento", label: "Desenvolvimento", dot: "white" },
  { key: "potencial", label: "Potencial", dot: "gradient" },
]
const ALL = "__all__"
const brl = (v: number | null) => (v == null ? "—" : `R$ ${Math.round(v).toLocaleString("pt-BR")}`)
// Base escura sem chave de API: mapa OpenStreetMap com filtro escuro (troque por VITE_TILE_URL se tiver um provedor próprio)
const TILE_URL = (import.meta as any).env?.VITE_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
type RegionsResp = { items: Region[]; summary: any; isDemo: boolean; mode: "demo" | "real"; layerDefs: LayerDef[]; unmapped: number }

export default function TerritoryPage() {
  const [cities, setCities] = useState<City[]>([])
  const [city, setCity] = useState("Bauru")
  const [regions, setRegions] = useState<Region[]>([])
  const [summary, setSummary] = useState<{ avgPriceM2: number; avgTemperature: number } | null>(null)
  const [isDemo, setIsDemo] = useState(true)
  const [mode, setMode] = useState<"demo" | "real" | "mixed">("demo")
  const [layerDefs, setLayerDefs] = useState<LayerDef[]>(DEFAULT_DEFS)
  const [unmapped, setUnmapped] = useState(0)
  const [active, setActive] = useState<string[]>(["temperature"])
  const [view, setView] = useState<"2d" | "3d">("2d")
  const [zoom, setZoom] = useState(12.5)
  const [selected, setSelected] = useState<string | null>(null)
  const [detail, setDetail] = useState<Detail | null>(null)
  const [report, setReport] = useState<Report | null>(null)
  const [sources, setSources] = useState<Sources | null>(null)
  const [real, setReal] = useState<RealData | null>(null)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  const mapEl = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const group = useRef<L.LayerGroup | null>(null)

  const isAll = city === ALL
  const labelOf = (k: string) => layerDefs.find((l) => l.key === k)?.label ?? k
  const sub = useSubscription()
  const [lockHint, setLockHint] = useState(false)
  const toggle = (k: string) => setActive((a) => {
    if (a.includes(k)) return a.filter((x) => x !== k)
    if (!sub.premium && a.length >= FREE_LAYER_LIMIT) { setLockHint(true); return [k] }
    return [...a, k]
  })
  const individual = layerDefs.filter((l) => l.key !== "temperature").map((l) => l.key)

  useEffect(() => {
    api<{ cities: City[] }>("/api/territory/cities").then((d) => setCities(d.cities)).catch((e) => setError(e.message))
    api<Sources>("/api/territory/sources").then(setSources).catch(() => {})
  }, [])

  // carrega as regiões de uma cidade, ou de todas as cidades juntas
  useEffect(() => {
    setSelected(null); setDetail(null)
    let cancelled = false
    const q = (c: string) => api<RegionsResp>(`/api/territory/regions?city=${encodeURIComponent(c)}`)
    if (!isAll) {
      q(city).then((d) => {
        if (cancelled) return
        setRegions(d.items); setSummary(d.summary); setIsDemo(d.isDemo); setMode(d.mode); setLayerDefs(d.layerDefs); setUnmapped(d.unmapped); setError("")
      }).catch((e) => !cancelled && setError(e.message))
    } else if (cities.length) {
      Promise.all(cities.map((c) => q(c.city).catch(() => null))).then((rs) => {
        if (cancelled) return
        const ok = rs.filter(Boolean) as RegionsResp[]
        if (!ok.length) return setError("Não foi possível carregar as cidades.")
        const keys = ok.map((r) => new Set(r.layerDefs.map((l) => l.key)))
        const common = ok[0].layerDefs.filter((l) => keys.every((s) => s.has(l.key)))
        const sums = ok.map((r) => r.summary).filter(Boolean)
        setRegions(ok.flatMap((r) => r.items)); setLayerDefs(common.length ? common : DEFAULT_DEFS.slice(0, 1))
        setSummary(sums.length ? { avgPriceM2: Math.round(sums.reduce((a, s) => a + s.avgPriceM2, 0) / sums.length), avgTemperature: +(sums.reduce((a, s) => a + s.avgTemperature, 0) / sums.length).toFixed(1) } : null)
        setIsDemo(ok.some((r) => r.isDemo)); setUnmapped(ok.reduce((a, r) => a + r.unmapped, 0))
        setMode(ok.every((r) => r.mode === "real") ? "real" : ok.some((r) => r.mode === "real") ? "mixed" : "demo"); setError("")
      })
    }
    return () => { cancelled = true }
  }, [city, isAll ? cities.length : 0]) // eslint-disable-line react-hooks/exhaustive-deps

  // mantém só camadas que existem nesta cidade
  useEffect(() => {
    setActive((a) => { const ok = a.filter((k) => layerDefs.some((l) => l.key === k)); return ok.length ? ok : ["temperature"] })
  }, [layerDefs])

  useEffect(() => {
    setReal(null)
    if (!isAll) api<RealData>(`/api/data/city?city=${encodeURIComponent(city)}`).then(setReal).catch(() => {})
  }, [city, isAll])

  useEffect(() => {
    if (!selected) return setDetail(null)
    api<Detail>(`/api/territory/regions/${selected}`).then(setDetail).catch((e) => setError(e.message))
  }, [selected])

  // mapa 2D (criado uma vez)
  useEffect(() => {
    if (!mapEl.current || map.current) return
    const m = L.map(mapEl.current, { zoomControl: true, attributionControl: true, zoomSnap: 0.5 }).setView([-22.3147, -49.0587], 12)
    L.tileLayer(TILE_URL, { attribution: "© OpenStreetMap contributors", maxZoom: 19 }).addTo(m)
    group.current = L.layerGroup().addTo(m)
    m.on("zoomend", () => setZoom(m.getZoom()))
    map.current = m
    return () => { m.remove(); map.current = null }
  }, [])

  useEffect(() => { if (view === "2d") setTimeout(() => map.current?.invalidateSize(), 60) }, [view])

  const center = useMemo(() => {
    if (isAll) {
      if (!cities.length) return null
      return { lat: cities.reduce((a, c) => a + c.lat, 0) / cities.length, lng: cities.reduce((a, c) => a + c.lng, 0) / cities.length }
    }
    const c = cities.find((x) => x.city === city)
    return c ? { lat: c.lat, lng: c.lng } : null
  }, [city, cities, isAll])

  // recentraliza ao trocar de cidade (ou enquadra todas)
  useEffect(() => {
    const m = map.current
    if (!m) return
    if (isAll && cities.length > 1) m.fitBounds(cities.map((c) => [c.lat, c.lng] as [number, number]), { padding: [50, 50], maxZoom: 9 })
    else if (center) m.setView([center.lat, center.lng], 12.5)
  }, [center?.lat, center?.lng, isAll, cities.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // desenha as regiões conforme as camadas ligadas
  useEffect(() => {
    const g = group.current
    if (!g) return
    g.clearLayers()
    const n = active.length
    regions.forEach((r) => {
      const sel = r.id === selected
      if (n === 0) {
        L.circle([r.lat, r.lng], { radius: r.radiusM, color: "#4a566a", weight: 1, fillColor: "#4a566a", fillOpacity: 0.12 })
          .on("click", () => setSelected(r.id)).bindTooltip(r.name).addTo(g)
        return
      }
      if (n === 1) {
        const layer = active[0], v = layerValue(r, layer), col = tone(v, layer)
        if (v >= 55) {
          L.circle([r.lat, r.lng], {
            radius: r.radiusM * (1.5 + v / 120), stroke: false, fillColor: col, fillOpacity: 0.16 + (v / 100) * 0.14,
            interactive: false, className: v >= 75 ? "neon-halo neon-pulse" : "neon-halo",
          }).addTo(g)
        }
        const c = L.circle([r.lat, r.lng], {
          radius: r.radiusM, color: sel ? "#ffffff" : col, weight: sel ? 2.5 : 1.4,
          fillColor: col, fillOpacity: 0.22 + (v / 100) * 0.5, className: "neon-zone",
        }).on("click", () => setSelected(r.id)).bindTooltip(`${r.name} · ${v.toFixed(0)}`, { direction: "top" }).addTo(g)
        const el = (c as any)._path as SVGElement | undefined
        if (el) el.style.color = col
        return
      }
      // várias camadas: halo do índice combinado + rosa de dados (uma fatia por camada)
      const comp = composite(r, active)
      const mpp = (156543.03392 * Math.cos((r.lat * Math.PI) / 180)) / 2 ** zoom
      const size = Math.round(Math.max(26, Math.min(96, (r.radiusM * 2.1) / mpp)))
      if (comp >= 55) {
        L.circle([r.lat, r.lng], { radius: r.radiusM * (1.4 + comp / 130), stroke: false, fillColor: heat(comp), fillOpacity: 0.1 + (comp / 100) * 0.12, interactive: false, className: "neon-halo" }).addTo(g)
      }
      const vals = active.map((k) => ({ v: layerValue(r, k), col: tone(layerValue(r, k), k) }))
      const tip = `<b>${r.name}</b> · combinado ${comp.toFixed(0)}<br>` + active.map((k) => `${labelOf(k)}: ${layerValue(r, k).toFixed(0)}`).join("<br>")
      L.marker([r.lat, r.lng], {
        icon: L.divIcon({ html: roseSvg(vals, size, comp, sel), className: "rose-glyph", iconSize: [size, size], iconAnchor: [size / 2, size / 2] }),
      }).on("click", () => setSelected(r.id)).bindTooltip(tip, { direction: "top" }).addTo(g)
    })
  }, [regions, active, selected, zoom]) // eslint-disable-line react-hooks/exhaustive-deps

  const twinData = useMemo(() => (view === "3d" ? buildTwin(regions, active, selected) : null), [view, regions, active, selected])
  const layerAvg = useMemo(() => (regions.length ? Math.round(regions.reduce((a, r) => a + composite(r, active), 0) / regions.length) : 0), [regions, active])
  const combinedLabel = active.length === 0 ? "Nenhuma camada" : active.length === 1 ? labelOf(active[0]) : `Combinado (${active.length} camadas)`
  const ranking = useMemo(() => [...regions].sort((a, b) => composite(b, active) - composite(a, active)).slice(0, 5), [regions, active])

  async function openReport() {
    if (!selected) return
    setBusy(true)
    try { setReport(await api<Report>(`/api/territory/regions/${selected}/report`)) }
    catch (e: any) { setError(e.message) }
    finally { setBusy(false) }
  }

  const cross = detail ? crossReading(detail.region.layers, active) : []

  return (
    <AppShell
      title={<>Leia o <span className="hot">território.</span></>}
      subtitle="TERRITORIAL INTELLIGENCE"
      action={
        <div className="page-actions">
          <select className="city-select" value={city} onChange={(e) => setCity(e.target.value)} aria-label="Cidade">
            <option value={ALL}>Todas as cidades</option>
            {(cities.length ? cities : [{ city: "Bauru", state: "SP" } as City]).map((c) => (
              <option key={c.city} value={c.city}>{c.city}/{c.state}</option>
            ))}
          </select>
        </div>
      }
    >
      {mode === "real" && (
        <div className="real-banner" role="status">
          <strong>Mapa com dados reais.</strong> Cada círculo é um bairro com transações reais (valor declarado ÷ área, últimos 12 meses). As cores são posições relativas entre os bairros da cidade.
          {unmapped > 0 && ` ${unmapped} bairro(s) ainda sem coordenada não aparecem no mapa.`}
        </div>
      )}
      {mode === "mixed" && (
        <div className="real-banner" role="status">
          <strong>Dados reais em parte das cidades.</strong> Cidades com transações importadas usam dados reais; as demais seguem em demonstração. Compare índices com cuidado.
        </div>
      )}
      {isDemo && (
        <div className="demo-banner" role="status">
          <strong>Mapa de calor em demonstração.</strong> Os valores do mapa são ilustrativos enquanto as fontes reais (cartórios,
          prefeituras e parceiros) não estão conectadas. Não use para decisões de compra, venda ou investimento.
        </div>
      )}
      {error && <div className="form-error">{error}</div>}

      <div className="territory-app">
        <aside className="territory-side">
          <div className="layer-head">
            <span className="layer-title"><Icon name="layers" size={16} /> CAMADAS</span>
            <div>
              <button className="mini-btn" onClick={() => (sub.premium ? setActive(individual) : navigate("/assinatura"))} title="Liga todas as camadas individuais (Pro)">Todas</button>
              <button className="mini-btn" onClick={() => setActive([])} title="Desliga todas">Limpar</button>
            </div>
          </div>
          <div className="layer-list">
            {layerDefs.map((l) => {
              const on = active.includes(l.key)
              return (
                <button key={l.key} className={on ? "on" : ""} onClick={() => toggle(l.key)} aria-pressed={on}>
                  <i className={`layer-dot ${LAYER_DOT[l.key] ?? l.dot}`} />
                  {l.label}
                  <span className={on ? "toggle on" : "toggle"} />
                </button>
              )
            })}
          </div>
          <p className="layer-help">
            {active.length > 1
              ? "Cruzando camadas: cada região vira uma rosa com uma fatia por camada. Fatia maior = índice maior. O brilho ao fundo é a média combinada."
              : "Ligue quantas camadas quiser. Com duas ou mais, o mapa cruza os dados em uma rosa por região."}
          </p>
          {!sub.premium && (
            <p className="layer-help">{lockHint ? "🔒 " : ""}No plano grátis o mapa lê 1 camada por vez. <a href="/assinatura" onClick={(e) => { e.preventDefault(); navigate("/assinatura") }}>Cruze várias camadas com o Pro</a>.</p>
          )}
          <div className="heat-legend"><span>Frio</span><i /><span>Quente</span></div>

          {summary && (
            <div className="side-stats">
              <div><span>TEMPERATURA MÉDIA</span><strong>{summary.avgTemperature}</strong></div>
              <div><span>PREÇO MÉDIO / M²</span><strong>{brl(summary.avgPriceM2)}</strong></div>
              {active.length > 1 && <div><span>ÍNDICE COMBINADO (MÉDIA)</span><strong>{layerAvg}</strong></div>}
            </div>
          )}

          <span className="layer-title" style={{ marginTop: 22 }}>TOP 5 · {combinedLabel.toUpperCase()}</span>
          <div className="rank-list">
            {ranking.map((r, i) => (
              <button key={r.id} onClick={() => { setSelected(r.id); map.current?.setView([r.lat, r.lng], 13) }}>
                <b>{i + 1}</b><span>{r.name}{isAll ? ` · ${r.city}` : ""}</span><em>{composite(r, active).toFixed(0)}</em>
              </button>
            ))}
          </div>
        </aside>

        <div className="territory-canvas">
          <div className="map-mode" role="group" aria-label="Modo do mapa">
            <button className={view === "2d" ? "on" : ""} onClick={() => setView("2d")}>Mapa 2D</button>
            <button className={view === "3d" ? "on" : ""} onClick={() => setView("3d")}>Gêmeo digital 3D</button>
          </div>
          <div ref={mapEl} className="leaflet-host" style={{ display: view === "2d" ? "block" : "none" }} />
          {view === "3d" && twinData && (
            <Suspense fallback={<div className="twin-note soft">Carregando o gêmeo digital…</div>}>
              <TwinMap3D data={twinData} center={center} wide={isAll} onSelect={setSelected} />
            </Suspense>
          )}
          <div className="map-legend" aria-label="Legenda das camadas">
            {layerDefs.filter((l) => l.key !== "temperature").map((l) => (
              <button key={l.key} className={active.includes(l.key) ? "on" : ""} onClick={() => toggle(l.key)}>
                <i className={`layer-dot ${LAYER_DOT[l.key] ?? l.dot}`} />{l.label}
              </button>
            ))}
          </div>
          <div className="map-gauge">
            <span>{active.length === 1 && active[0] === "temperature" ? "Temperatura do mercado" : `${combinedLabel} (média)`}</span>
            <div>
              <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
                <circle className="ring-bg" cx="22" cy="22" r="17" fill="none" strokeWidth="5" />
                <circle className="ring-fg" cx="22" cy="22" r="17" fill="none" strokeWidth="5" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 17} strokeDashoffset={2 * Math.PI * 17 * (1 - layerAvg / 100)} transform="rotate(-90 22 22)" />
              </svg>
              <strong>{layerAvg}%</strong>
            </div>
          </div>
        </div>

        <aside className="territory-detail">
          {!detail ? (
            <div className="empty-detail">
              <Icon name="map" size={26} />
              <p>Clique em uma região do mapa para ver os indicadores, a leitura cruzada das camadas e gerar o relatório.</p>
            </div>
          ) : (
            <>
              <span className="layer-title">REGIÃO</span>
              <h3>{detail.region.name}, {detail.region.city}</h3>
              <div className="temp-badge">
                <strong>{active.length > 1 ? Math.round(composite(detail.region, active)) : detail.region.temperature}</strong>
                <span>{active.length > 1 ? `Índice combinado de ${active.length} camadas` : detail.region.temperatureLabel}</span>
              </div>
              <div className="metric-bars">
                {layerDefs.filter((l) => l.key !== "temperature").map((l) => {
                  const v = detail.region.layers[l.key] ?? 0
                  return (
                    <div key={l.key} className={active.includes(l.key) ? "act" : ""}>
                      <label onClick={() => toggle(l.key)}>{l.label}<b>{v.toFixed(0)}</b></label>
                      <div className="bar"><i style={{ width: `${v}%`, background: tone(v, l.key) }} /></div>
                    </div>
                  )
                })}
              </div>
              {mode === "real" && <p className="real-note">Barras = posição relativa entre os bairros da cidade (0 = menor, 100 = maior).</p>}
              <div className="kv">
                <div><span>Preço / m²</span><b>{brl(detail.region.priceM2)}</b></div>
                <div><span>Var. 12 meses</span><b>{detail.region.change12m == null ? "—" : `${detail.region.change12m > 0 ? "+" : ""}${detail.region.change12m}%`}</b></div>
                <div><span>Dias no mercado</span><b>{detail.region.daysOnMarket ?? "—"}</b></div>
                <div><span>Negócios (12m)</span><b>{detail.region.deals12m ?? "—"}</b></div>
              </div>
              {cross.length > 0 && (
                <>
                  <span className="layer-title" style={{ marginTop: 16 }}>LEITURA CRUZADA</span>
                  <ul className="insights cross">
                    {cross.map((c, i) => <li key={i} className={c.onActive ? "hit" : ""}>{c.text}</li>)}
                  </ul>
                  <p className="real-note">Leitura automática por regras sobre índices relativos. Não é recomendação de compra ou venda.</p>
                </>
              )}
              <ul className="insights">{detail.insights.map((t, i) => <li key={i}>{t}</li>)}</ul>
              {detail.relatedAssets.length > 0 && (
                <>
                  <span className="layer-title" style={{ marginTop: 16 }}>ATIVOS NA CIDADE</span>
                  <div className="rank-list">
                    {detail.relatedAssets.map((a) => (
                      <button key={a.id} onClick={() => navigate(`/asset/${a.id}`)}>
                        <span>{a.name}</span><em>{a.score}</em>
                      </button>
                    ))}
                  </div>
                </>
              )}
              <div style={{ marginTop: 18 }}>
                <Button icon="arrow" onClick={openReport}>{busy ? "Gerando..." : "Gerar relatório"}</Button>
              </div>
            </>
          )}
        </aside>
      </div>

      <div className="sources-card real-card">
        <span className="layer-title">DADOS OFICIAIS · {city.toUpperCase()}</span>
        {real && (real.indicators.length > 0 || real.neighborhoods.length > 0) ? (
          <>
            <div className="sources-grid">
              <div>
                <strong>Indicadores</strong>
                {real.indicators.map((i) => (
                  <p key={i.indicator}><b>{i.label}:</b> {i.value.toLocaleString("pt-BR")} {i.unit} ({i.refPeriod}) · <a href={i.sourceUrl} target="_blank" rel="noreferrer">{i.source}</a></p>
                ))}
                {real.indicators.length === 0 && <p>Sem indicadores oficiais carregados.</p>}
              </div>
              <div>
                <strong>Transações (fonte)</strong>
                {real.sources.map((s) => <p key={s.source}><b>{s.source}</b> — {s.deals.toLocaleString("pt-BR")} registros, de {s.from} a {s.to}</p>)}
                {real.sources.length === 0 && <p>Sem transações carregadas.</p>}
              </div>
            </div>
            {real.neighborhoods.length > 0 && (
              <>
                <strong className="real-h">Preço por m² por bairro (mediana, últimos 12 meses)</strong>
                <div className="real-table">
                  {real.neighborhoods.map((n) => (
                    <div key={n.name}><span>{n.name}</span><b>{money(n.medianPriceM2)}</b><em>{n.deals12m} vendas</em><i className={n.change12m != null && n.change12m < 0 ? "down" : "up"}>{n.change12m == null ? "—" : `${n.change12m > 0 ? "+" : ""}${n.change12m}%`}</i></div>
                  ))}
                </div>
                <p className="real-note">{real.note}</p>
              </>
            )}
          </>
        ) : (
          <p className="real-note">Ainda não há dados oficiais carregados para esta cidade. O mapa de calor acima segue como demonstração.</p>
        )}
      </div>

      {sources && (
        <div className="sources-card">
          <span className="layer-title">FONTES DE DADOS</span>
          <div className="sources-grid">
            <div>
              <strong>Ativas</strong>
              {sources.active.map((s) => <p key={s.id}><b>{s.label}</b> — {s.note}</p>)}
            </div>
            <div>
              <strong>Em integração</strong>
              {sources.planned.map((s) => <p key={s.id}><b>{s.label}</b> — {s.note}</p>)}
            </div>
          </div>
        </div>
      )}

      {report && (
        <div className="report-overlay" role="dialog" aria-modal="true">
          <div className="report-sheet">
            <div className="report-actions no-print">
              <Button onClick={() => window.print()}>Imprimir / Salvar PDF</Button>
              <Button variant="secondary" onClick={() => setReport(null)}>Fechar</Button>
            </div>
            <header>
              <span className="report-brand">IMOVKEN · REAL ASSET INTELLIGENCE</span>
              <h1>{report.title}</h1>
              <small>Gerado em {new Date(report.generatedAt).toLocaleString("pt-BR")}</small>
            </header>
            {report.region.source === "demo" && <p className="report-warning">{report.disclaimer}</p>}
            <section className="report-grid">
              <div><span>Temperatura</span><b>{report.region.temperature}</b><small>{report.region.temperatureLabel}</small></div>
              <div><span>Posição na cidade</span><b>{report.rank.position}º</b><small>de {report.rank.of} regiões</small></div>
              <div><span>Preço / m²</span><b>{brl(report.region.priceM2)}</b><small>média da cidade {brl(report.cityAverage.priceM2)}</small></div>
              <div><span>Var. 12 meses</span><b>{report.region.change12m ?? "—"}%</b><small>{report.region.daysOnMarket ?? "—"} dias no mercado</small></div>
            </section>
            <h2>Camadas</h2>
            <table>
              <tbody>
                {layerDefs.slice(1).map((l) => (
                  <tr key={l.key}><td>{l.label}</td><td>{report.region.layers[l.key].toFixed(0)} / 100</td></tr>
                ))}
              </tbody>
            </table>
            <h2>Leitura da região</h2>
            <ul>{report.insights.map((t, i) => <li key={i}>{t}</li>)}</ul>
            <h2>Metodologia</h2>
            <p>{report.methodology}</p>
            {report.region.source !== "demo" && <p className="report-note">{report.disclaimer}</p>}
            <p className="report-note">Fonte dos dados: {report.region.source === "demo" ? "demonstração (ilustrativo)" : report.region.source}.</p>
          </div>
        </div>
      )}
    </AppShell>
  )
}
