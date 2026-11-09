import { useEffect, useMemo, useRef, useState } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { api, money } from "../api"
import { AppShell, Button, Icon, navigate } from "../ui"

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

// azul-violeta (frio) → laranja flúor (quente) — usado na camada "Temperatura"
function heat(v: number) {
  const t = Math.max(0, Math.min(1, (v - 15) / 75))
  const stops = [
    [34, 211, 238], [91, 140, 255], [155, 138, 251], [255, 138, 40], [255, 106, 0],
  ]
  const f = t * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(f)), k = f - i
  const c = stops[i].map((a, j) => Math.round(a + (stops[i + 1][j] - a) * k))
  return `rgb(${c[0]},${c[1]},${c[2]})`
}
// cada camada acende na sua cor (mesma legenda do post "Leia o território")
const LAYER_RGB: Record<string, string> = {
  valorizacao: "54,211,153", liquidez: "91,140,255", oferta: "34,211,238",
  demanda: "255,106,0", desenvolvimento: "255,154,46", potencial: "155,138,251",
}
const LAYER_DOT: Record<string, string> = {
  temperature: "hot", valorizacao: "green", liquidez: "blue", oferta: "cyan",
  demanda: "orange", desenvolvimento: "orange", potencial: "violet",
}
const tone = (v: number, layer: string) => (layer === "temperature" || !LAYER_RGB[layer] ? heat(v) : `rgb(${LAYER_RGB[layer]})`)
const value = (r: Region, layer: string) => (layer === "temperature" ? r.temperature : (r.layers[layer] ?? 0))
const brl = (v: number | null) => (v == null ? "—" : `R$ ${Math.round(v).toLocaleString("pt-BR")}`)

export default function TerritoryPage() {
  const [cities, setCities] = useState<City[]>([])
  const [city, setCity] = useState("Bauru")
  const [regions, setRegions] = useState<Region[]>([])
  const [summary, setSummary] = useState<{ avgPriceM2: number; avgTemperature: number } | null>(null)
  const [isDemo, setIsDemo] = useState(true)
  const [mode, setMode] = useState<"demo" | "real">("demo")
  const [layerDefs, setLayerDefs] = useState<LayerDef[]>(DEFAULT_DEFS)
  const [unmapped, setUnmapped] = useState(0)
  const [layer, setLayer] = useState<string>("temperature")
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

  useEffect(() => {
    api<{ cities: City[] }>("/api/territory/cities").then((d) => setCities(d.cities)).catch((e) => setError(e.message))
    api<Sources>("/api/territory/sources").then(setSources).catch(() => {})
  }, [])

  useEffect(() => {
    setSelected(null); setDetail(null)
    api<{ items: Region[]; summary: any; isDemo: boolean; mode: "demo" | "real"; layerDefs: LayerDef[]; unmapped: number }>(`/api/territory/regions?city=${encodeURIComponent(city)}`)
      .then((d) => { setRegions(d.items); setSummary(d.summary); setIsDemo(d.isDemo); setMode(d.mode); setLayerDefs(d.layerDefs); setUnmapped(d.unmapped); setLayer("temperature"); setError("") })
      .catch((e) => setError(e.message))
  }, [city])

  useEffect(() => {
    setReal(null)
    api<RealData>(`/api/data/city?city=${encodeURIComponent(city)}`).then(setReal).catch(() => {})
  }, [city])

  useEffect(() => {
    if (!selected) return setDetail(null)
    api<Detail>(`/api/territory/regions/${selected}`).then(setDetail).catch((e) => setError(e.message))
  }, [selected])

  // mapa (criado uma vez)
  useEffect(() => {
    if (!mapEl.current || map.current) return
    const m = L.map(mapEl.current, { zoomControl: true, attributionControl: true }).setView([-22.3147, -49.0587], 12)
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: "© OpenStreetMap contributors © CARTO", subdomains: "abcd", maxZoom: 18,
    }).addTo(m)
    group.current = L.layerGroup().addTo(m)
    map.current = m
    return () => { m.remove(); map.current = null }
  }, [])

  // recentraliza ao trocar de cidade
  useEffect(() => {
    const c = cities.find((x) => x.city === city)
    if (c && map.current) map.current.setView([c.lat, c.lng], 12)
  }, [city, cities])

  // desenha as regiões conforme a camada ativa
  useEffect(() => {
    const g = group.current
    if (!g) return
    g.clearLayers()
    regions.forEach((r) => {
      const v = value(r, layer)
      const sel = r.id === selected
      const col = tone(v, layer)
      // halo de brilho (mancha de calor) nas regiões mais fortes
      if (v >= 55) {
        const halo = L.circle([r.lat, r.lng], {
          radius: r.radiusM * (1.5 + v / 120), stroke: false, fillColor: col, fillOpacity: 0.16 + (v / 100) * 0.14,
          interactive: false, className: v >= 75 ? "neon-halo neon-pulse" : "neon-halo",
        }).addTo(g)
        void halo
      }
      const c = L.circle([r.lat, r.lng], {
        radius: r.radiusM, color: sel ? "#ffffff" : col, weight: sel ? 2.5 : 1.4,
        fillColor: col, fillOpacity: 0.22 + (v / 100) * 0.5, className: "neon-zone",
      })
        .on("click", () => setSelected(r.id))
        .bindTooltip(`${r.name} · ${v.toFixed(0)}`, { direction: "top" })
        .addTo(g)
      const el = (c as any)._path as SVGElement | undefined
      if (el) el.style.color = col
    })
  }, [regions, layer, selected])

  const layerAvg = useMemo(() => (regions.length ? Math.round(regions.reduce((a, r) => a + value(r, layer), 0) / regions.length) : 0), [regions, layer])
  const layerLabel = layerDefs.find((l) => l.key === layer)?.label ?? "Temperatura"
  const ranking = useMemo(() => [...regions].sort((a, b) => value(b, layer) - value(a, layer)).slice(0, 5), [regions, layer])

  async function openReport() {
    if (!selected) return
    setBusy(true)
    try { setReport(await api<Report>(`/api/territory/regions/${selected}/report`)) }
    catch (e: any) { setError(e.message) }
    finally { setBusy(false) }
  }

  return (
    <AppShell
      title={<>Leia o <span className="hot">território.</span></>}
      subtitle="TERRITORIAL INTELLIGENCE"
      action={
        <div className="page-actions">
          <select className="city-select" value={city} onChange={(e) => setCity(e.target.value)} aria-label="Cidade">
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
      {isDemo && (
        <div className="demo-banner" role="status">
          <strong>Mapa de calor em demonstração.</strong> Os valores do mapa são ilustrativos enquanto as fontes reais (cartórios,
          prefeituras e parceiros) não estão conectadas. Não use para decisões de compra, venda ou investimento.
        </div>
      )}
      {error && <div className="form-error">{error}</div>}

      <div className="territory-app">
        <aside className="territory-side">
          <span className="layer-title"><Icon name="layers" size={16} /> CAMADA ATIVA</span>
          <div className="layer-list">
            {layerDefs.map((l) => (
              <button key={l.key} className={layer === l.key ? "on" : ""} onClick={() => setLayer(l.key)}>
                <i className={`layer-dot ${LAYER_DOT[l.key] ?? l.dot}`} />
                {l.label}
                <span className={layer === l.key ? "toggle on" : "toggle"} />
              </button>
            ))}
          </div>
          <div className="heat-legend"><span>Frio</span><i /><span>Quente</span></div>

          {summary && (
            <div className="side-stats">
              <div><span>TEMPERATURA MÉDIA</span><strong>{summary.avgTemperature}</strong></div>
              <div><span>PREÇO MÉDIO / M²</span><strong>{brl(summary.avgPriceM2)}</strong></div>
            </div>
          )}

          <span className="layer-title" style={{ marginTop: 22 }}>TOP 5 · {layerDefs.find((l) => l.key === layer)?.label.toUpperCase()}</span>
          <div className="rank-list">
            {ranking.map((r, i) => (
              <button key={r.id} onClick={() => { setSelected(r.id); map.current?.setView([r.lat, r.lng], 13) }}>
                <b>{i + 1}</b><span>{r.name}</span><em>{value(r, layer).toFixed(0)}</em>
              </button>
            ))}
          </div>
        </aside>

        <div className="territory-canvas">
          <div ref={mapEl} className="leaflet-host" />
          <div className="map-legend" aria-label="Legenda das camadas">
            {layerDefs.filter((l) => l.key !== "temperature").map((l) => (
              <button key={l.key} className={layer === l.key ? "on" : ""} onClick={() => setLayer(l.key)}>
                <i className={`layer-dot ${LAYER_DOT[l.key] ?? l.dot}`} />{l.label}
              </button>
            ))}
          </div>
          <div className="map-gauge">
            <span>{layer === "temperature" ? "Temperatura do mercado" : `${layerLabel} (média da cidade)`}</span>
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
              <p>Clique em uma região do mapa para ver os indicadores, a análise e gerar o relatório.</p>
            </div>
          ) : (
            <>
              <span className="layer-title">REGIÃO</span>
              <h3>{detail.region.name}, {detail.region.city}</h3>
              <div className="temp-badge">
                <strong>{detail.region.temperature}</strong>
                <span>{detail.region.temperatureLabel}</span>
              </div>
              <div className="metric-bars">
                {layerDefs.slice(1).map((l) => (
                  <div key={l.key}>
                    <label>{l.label}<b>{detail.region.layers[l.key].toFixed(0)}</b></label>
                    <div className="bar"><i style={{ width: `${detail.region.layers[l.key]}%`, background: heat(detail.region.layers[l.key]) }} /></div>
                  </div>
                ))}
              </div>
              {mode === "real" && <p className="real-note">Barras = posição relativa entre os bairros da cidade (0 = menor, 100 = maior).</p>}
              <div className="kv">
                <div><span>Preço / m²</span><b>{brl(detail.region.priceM2)}</b></div>
                <div><span>Var. 12 meses</span><b>{detail.region.change12m == null ? "—" : `${detail.region.change12m > 0 ? "+" : ""}${detail.region.change12m}%`}</b></div>
                <div><span>Dias no mercado</span><b>{detail.region.daysOnMarket ?? "—"}</b></div>
                <div><span>Negócios (12m)</span><b>{detail.region.deals12m ?? "—"}</b></div>
              </div>
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
