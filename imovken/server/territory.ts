import type { FastifyInstance } from "fastify"
import { z } from "zod"
import { db } from "./db.ts"

type Row = Record<string, any>

// ---------------------------------------------------------------------------
// Cidades-base (centros aproximados). Os dados "demo" gerados abaixo são
// ILUSTRATIVOS: servem para o mapa funcionar enquanto as fontes reais
// (cartórios, prefeituras, parcerias com portais) não são conectadas.
// Todo registro carrega o campo `source`; "demo" é sempre sinalizado no site.
// ---------------------------------------------------------------------------
const CITIES = [
  { city: "Bauru", state: "SP", lat: -22.3147, lng: -49.0587 },
  { city: "São Paulo", state: "SP", lat: -23.5614, lng: -46.6559 },
  { city: "Campinas", state: "SP", lat: -22.9056, lng: -47.0608 },
  { city: "Ribeirão Preto", state: "SP", lat: -21.1775, lng: -47.8103 },
  { city: "Curitiba", state: "PR", lat: -25.4284, lng: -49.2733 },
]

// PRNG determinístico (os dados demo não mudam a cada deploy)
function rng(seed: number) {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}
const clamp = (v: number, a = 8, b = 99) => Math.max(a, Math.min(b, v))
const slug = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-")

function direction(dLat: number, dLng: number) {
  if (Math.hypot(dLat, dLng) < 0.004) return "Centro"
  const a = (Math.atan2(dLat, dLng) * 180) / Math.PI // 0 = leste, 90 = norte
  const names = ["Leste", "Nordeste", "Norte", "Noroeste", "Oeste", "Sudoeste", "Sul", "Sudeste"]
  return names[Math.round(((a + 360) % 360) / 45) % 8]
}

function seedDemo() {
  if (db.prepare("SELECT 1 FROM regions LIMIT 1").get()) return
  const ins = db.prepare(
    `INSERT INTO regions (id,city,state,name,lat,lng,radius_m,valorizacao,liquidez,oferta,demanda,desenvolvimento,potencial,
      price_m2,change_12m,days_on_market,deals_12m,listings_active,source)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'demo')`,
  )
  db.exec("BEGIN")
  CITIES.forEach((c, ci) => {
    const rand = rng(1000 + ci * 97)
    // 2 a 3 "pontos quentes" por cidade
    const hot = Array.from({ length: 3 }, () => ({
      dLat: (rand() - 0.5) * 0.07, dLng: (rand() - 0.5) * 0.07, power: 0.6 + rand() * 0.4,
    }))
    const basePrice = [7800, 13500, 8600, 6900, 9300][ci]
    const step = 0.0125 // ~1,4 km
    let n = 0
    for (let gy = -3; gy <= 3; gy++) {
      for (let gx = -3; gx <= 3; gx++) {
        if (Math.hypot(gx, gy) > 3.4) continue // contorno arredondado
        const dLat = gy * step + (rand() - 0.5) * 0.003
        const dLng = gx * step * 1.08 + (rand() - 0.5) * 0.003
        const heat = hot.reduce((acc, h) => acc + h.power * Math.exp(-Math.pow(Math.hypot(dLat - h.dLat, dLng - h.dLng) / 0.022, 2)), 0)
        const centerBoost = Math.exp(-Math.pow(Math.hypot(dLat, dLng) / 0.03, 2)) * 14
        const base = 38 + heat * 42 + centerBoost
        const m = (spread: number) => clamp(base + (rand() - 0.5) * spread)
        const demanda = m(16), liquidez = m(18), valorizacao = m(20), potencial = m(22), desenvolvimento = clamp(base * 0.8 + rand() * 25 - 8)
        const oferta = clamp(80 - base * 0.5 + rand() * 25)
        const price = Math.round(basePrice * (0.72 + base / 110) * (0.95 + rand() * 0.1))
        n++
        ins.run(
          `${slug(c.city)}-${String(n).padStart(2, "0")}`, c.city, c.state,
          `${direction(dLat, dLng)} ${n}`, +(c.lat + dLat).toFixed(5), +(c.lng + dLng).toFixed(5), 680,
          +valorizacao.toFixed(1), +liquidez.toFixed(1), +oferta.toFixed(1), +demanda.toFixed(1),
          +desenvolvimento.toFixed(1), +potencial.toFixed(1),
          price, +(valorizacao / 5.2 - 2.2 + rand()).toFixed(1), Math.round(150 - liquidez * 1.15 + rand() * 20),
          Math.round(8 + demanda * 0.55 + rand() * 8), Math.round(20 + oferta * 1.6 + rand() * 25),
        )
      }
    }
  })
  db.exec("COMMIT")
}
seedDemo()

// ---------------------------------------------------------------------------
// "Temperatura" = média ponderada das camadas (0–100). Oferta alta esfria.
// Os pesos ficam aqui, num só lugar, para serem revisados com o time/dados reais.
// ---------------------------------------------------------------------------
const W = { demanda: 0.28, liquidez: 0.24, valorizacao: 0.22, potencial: 0.16, desenvolvimento: 0.1 }
const temperature = (r: Row) =>
  +(r.demanda * W.demanda + r.liquidez * W.liquidez + r.valorizacao * W.valorizacao +
    r.potencial * W.potencial + r.desenvolvimento * W.desenvolvimento - Math.max(0, r.oferta - 60) * 0.1).toFixed(1)
const label = (t: number) => (t >= 75 ? "Muito aquecida" : t >= 60 ? "Aquecida" : t >= 45 ? "Morna" : "Fria")

const toRegion = (r: Row) => ({
  id: r.id, city: r.city, state: r.state, name: r.name, lat: r.lat, lng: r.lng, radiusM: r.radius_m,
  layers: {
    valorizacao: r.valorizacao, liquidez: r.liquidez, oferta: r.oferta,
    demanda: r.demanda, desenvolvimento: r.desenvolvimento, potencial: r.potencial,
  },
  priceM2: r.price_m2, change12m: r.change_12m, daysOnMarket: r.days_on_market,
  deals12m: r.deals_12m, listingsActive: r.listings_active,
  temperature: temperature(r), temperatureLabel: label(temperature(r)),
  source: r.source, updatedAt: r.updated_at,
})

// Análise por regras (determinística e explicável). Não é IA generativa.
function insights(r: ReturnType<typeof toRegion>, cityAvg: Row) {
  const out: string[] = []
  const diff = (a: number, b: number) => +(a - b).toFixed(1)
  const L = r.layers
  const priceVs = cityAvg.price_m2 ? ((r.priceM2 - cityAvg.price_m2) / cityAvg.price_m2) * 100 : 0
  out.push(`Temperatura ${r.temperature} (${r.temperatureLabel.toLowerCase()}), ${diff(r.temperature, cityAvg.temp) >= 0 ? "acima" : "abaixo"} da média de ${r.city} (${cityAvg.temp.toFixed(1)}).`)
  out.push(`Preço médio de R$ ${Math.round(r.priceM2).toLocaleString("pt-BR")}/m², ${Math.abs(priceVs).toFixed(0)}% ${priceVs >= 0 ? "acima" : "abaixo"} da média da cidade; variação em 12 meses de ${r.change12m >= 0 ? "+" : ""}${r.change12m}%.`)
  if (L.demanda >= 65 && L.oferta <= 50) out.push("Demanda forte com oferta contida: cenário favorável a vendedores e a imóveis bem precificados.")
  else if (L.oferta >= 65 && L.demanda < 50) out.push("Oferta alta frente à demanda: tendência de negociação mais longa e descontos maiores.")
  if (L.liquidez >= 65) out.push(`Liquidez elevada: imóveis levam em média ${r.daysOnMarket} dias para vender.`)
  else if (L.liquidez < 45) out.push(`Liquidez baixa: prazo médio de ${r.daysOnMarket} dias; exige estratégia de preço e prazo.`)
  if (L.potencial >= 70 && L.valorizacao < 60) out.push("Potencial acima da valorização já realizada: possível região em early stage.")
  if (L.desenvolvimento >= 65) out.push("Atividade de desenvolvimento acima da média: novos lançamentos e obras tendem a alterar o perfil da região.")
  return out
}

const cityStats = (city: string) =>
  db.prepare(
    "SELECT AVG(price_m2) AS price_m2, AVG(demanda*0.28+liquidez*0.24+valorizacao*0.22+potencial*0.16+desenvolvimento*0.1 - MAX(0, oferta-60)*0.1) AS temp, COUNT(*) AS n FROM regions WHERE city = ?",
  ).get(city) as Row

// ---------------------------------------------------------------------------
// MODO REAL: regiões = bairros com transações (ITBI/bases licenciadas) + coordenada do bairro.
// Só usa o que os dados permitem medir: preço/m², valorização 12m e volume de vendas.
// Temperatura real = 50% volume (posição relativa) + 50% valorização (posição relativa);
// sem valorização calculável, usa só o volume.
// ---------------------------------------------------------------------------
const DEMO_DEFS = [
  { key: "temperature", label: "Temperatura", dot: "hot" }, { key: "valorizacao", label: "Valorização", dot: "green" },
  { key: "liquidez", label: "Liquidez", dot: "blue" }, { key: "oferta", label: "Oferta", dot: "violet" },
  { key: "demanda", label: "Demanda", dot: "orange" }, { key: "desenvolvimento", label: "Desenvolvimento", dot: "white" },
  { key: "potencial", label: "Potencial", dot: "gradient" },
]
const REAL_DEFS = [
  { key: "temperature", label: "Temperatura", dot: "hot" }, { key: "preco", label: "Preço por m²", dot: "blue" },
  { key: "valorizacao", label: "Valorização 12m", dot: "green" }, { key: "volume", label: "Volume de vendas", dot: "orange" },
]
const pctRank = (v: number, arr: number[]) => {
  if (arr.length < 2) return 50
  const below = arr.filter((x) => x < v).length, eq = arr.filter((x) => x === v).length
  return +(((below + (eq - 1) / 2) / (arr.length - 1)) * 100).toFixed(1)
}
const median = (a: number[]) => { const s = [...a].sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : null }

function realRegions(city: string) {
  const rows = db.prepare(`SELECT neighborhood, state, source, declared_value/area_m2 AS pm2, deal_date FROM deals
    WHERE city = ? COLLATE NOCASE AND deal_date >= date('now','-24 months') AND declared_value/area_m2 BETWEEN 500 AND 100000`).all(city) as Row[]
  if (!rows.length) return { items: [] as any[], unmapped: 0, cityName: city }
  const cut = new Date(); cut.setMonth(cut.getMonth() - 12)
  const cutStr = cut.toISOString().slice(0, 10)
  const by = new Map<string, { cur: number[]; prev: number[]; state: string; sources: Set<string> }>()
  for (const r of rows) {
    const e = by.get(r.neighborhood.toLowerCase()) ?? { cur: [], prev: [], state: r.state, sources: new Set<string>() }
    ;(r.deal_date >= cutStr ? e.cur : e.prev).push(r.pm2); e.sources.add(r.source)
    by.set(r.neighborhood.toLowerCase(), e)
  }
  const names = new Map<string, string>()
  for (const r of rows) names.set(r.neighborhood.toLowerCase(), r.neighborhood)
  const geo = new Map((db.prepare("SELECT neighborhood, lat, lng FROM neighborhood_geo WHERE city = ? COLLATE NOCASE AND status = 'ok' AND neighborhood <> '__centro__'").all(city) as Row[]).map((g) => [g.neighborhood.toLowerCase(), g]))
  const eligible = [...by.entries()].filter(([, e]) => e.cur.length >= 5)
  const unmapped = eligible.filter(([k]) => !geo.has(k)).length
  const mapped = eligible.filter(([k]) => geo.has(k)).map(([k, e]) => {
    const price = median(e.cur)!, prev = e.prev.length >= 5 ? median(e.prev) : null
    return { k, e, price, change: prev ? +(((price - prev) / prev) * 100).toFixed(1) : null }
  })
  const prices = mapped.map((m) => m.price), vols = mapped.map((m) => m.e.cur.length), chs = mapped.filter((m) => m.change != null).map((m) => m.change as number)
  const items = mapped.map((m) => {
    const g = geo.get(m.k)!
    const volume = pctRank(m.e.cur.length, vols), preco = pctRank(m.price, prices)
    const valorizacao = m.change != null ? pctRank(m.change, chs) : null
    const temperature = +(valorizacao != null ? volume * 0.5 + valorizacao * 0.5 : volume).toFixed(1)
    const listingsActive = (db.prepare("SELECT COUNT(*) n FROM listings WHERE city = ? COLLATE NOCASE AND neighborhood = ? COLLATE NOCASE AND status IN ('publicado','em_negociacao')").get(city, names.get(m.k) ?? "") as Row).n
    return {
      id: `real-${slug(city)}-${slug(names.get(m.k)!)}`, city, state: m.e.state, name: names.get(m.k)!, lat: g.lat, lng: g.lng,
      radiusM: Math.round(Math.max(350, Math.min(1100, 300 + Math.sqrt(m.e.cur.length) * 45))),
      layers: { preco, valorizacao: valorizacao ?? 0, volume }, valorizacaoDisponivel: valorizacao != null,
      priceM2: Math.round(m.price), change12m: m.change, daysOnMarket: null, deals12m: m.e.cur.length, listingsActive,
      temperature, temperatureLabel: label(temperature), source: [...m.e.sources].join(" + "), updatedAt: null,
    }
  })
  return { items, unmapped, cityName: city }
}
const realCityStats = (items: any[]) => ({ price_m2: items.reduce((a, i) => a + i.priceM2 * i.deals12m, 0) / Math.max(1, items.reduce((a, i) => a + i.deals12m, 0)), temp: items.reduce((a, i) => a + i.temperature, 0) / Math.max(1, items.length), n: items.length })

function findReal(id: string) {
  for (const c of db.prepare("SELECT DISTINCT city FROM deals").all() as Row[]) {
    const { items } = realRegions(c.city)
    const r = items.find((i) => i.id === id)
    if (r) return { region: r, items }
  }
  return null
}
function realInsights(r: any, st: Row) {
  const out: string[] = []
  const vs = st.price_m2 ? ((r.priceM2 - st.price_m2) / st.price_m2) * 100 : 0
  out.push(`Preço mediano de ${money(r.priceM2)}/m² (valor declarado em ${r.deals12m} transações nos últimos 12 meses), ${Math.abs(vs).toFixed(0)}% ${vs >= 0 ? "acima" : "abaixo"} da média ponderada dos bairros mapeados.`)
  if (r.change12m != null) out.push(`Variação do preço mediano frente aos 12 meses anteriores: ${r.change12m > 0 ? "+" : ""}${r.change12m}%.`)
  else out.push("Não há transações suficientes nos 12 meses anteriores para calcular a valorização.")
  if (r.layers.volume >= 70) out.push("Volume de vendas entre os mais altos da cidade: mercado ativo nesse bairro.")
  else if (r.layers.volume <= 30) out.push("Volume de vendas baixo frente aos demais bairros: poucos dados e menor liquidez aparente.")
  out.push(`Temperatura ${r.temperature} (${r.temperatureLabel.toLowerCase()}), contra média de ${st.temp.toFixed(1)} nos bairros mapeados. Escala relativa: compara bairros da mesma cidade entre si.`)
  if (r.listingsActive > 0) out.push(`${r.listingsActive} anúncio(s) ativo(s) na IMOVKEN neste bairro.`)
  return out
}
const money = (v: number) => `R$ ${Math.round(v).toLocaleString("pt-BR")}`

export function registerTerritory(app: FastifyInstance) {
  app.get("/api/territory/cities", async () => {
    const out = new Map<string, any>()
    const demo = db.prepare("SELECT city, state, COUNT(*) AS regions FROM regions GROUP BY city, state ORDER BY city").all() as Row[]
    for (const r of demo) {
      const base = CITIES.find((c) => c.city === r.city)
      const avg = db.prepare("SELECT AVG(lat) AS lat, AVG(lng) AS lng FROM regions WHERE city = ?").get(r.city) as Row
      out.set(r.city.toLowerCase(), { city: r.city, state: r.state, regions: r.regions, lat: base?.lat ?? avg.lat, lng: base?.lng ?? avg.lng, real: false })
    }
    for (const d of db.prepare("SELECT DISTINCT city, state FROM deals").all() as Row[]) {
      const c = db.prepare("SELECT lat, lng FROM neighborhood_geo WHERE city = ? COLLATE NOCASE AND neighborhood = '__centro__' AND status = 'ok'").get(d.city) as Row | undefined
      const key = d.city.toLowerCase(), prev = out.get(key)
      const real = realRegions(d.city).items.length >= 3
      out.set(key, { city: d.city, state: d.state, regions: prev?.regions ?? 0, lat: c?.lat ?? prev?.lat ?? -15.78, lng: c?.lng ?? prev?.lng ?? -47.93, real })
    }
    return { cities: [...out.values()].sort((a, b) => a.city.localeCompare(b.city)) }
  })

  app.get("/api/territory/regions", async (req) => {
    const q = z.object({ city: z.string().max(80).optional() }).parse(req.query)
    if (q.city) {
      const real = realRegions(q.city)
      if (real.items.length >= 3) {
        const st = realCityStats(real.items)
        return { mode: "real", total: real.items.length, items: real.items, layerDefs: REAL_DEFS, unmapped: real.unmapped,
          summary: { avgPriceM2: Math.round(st.price_m2), avgTemperature: +st.temp.toFixed(1) }, isDemo: false }
      }
    }
    const rows = (q.city ? db.prepare("SELECT * FROM regions WHERE city = ?").all(q.city) : db.prepare("SELECT * FROM regions").all()) as Row[]
    const items = rows.map(toRegion)
    const stats = q.city ? cityStats(q.city) : null
    return { mode: "demo", total: items.length, items, layerDefs: DEMO_DEFS, unmapped: 0,
      summary: stats && stats.n ? { avgPriceM2: Math.round(stats.price_m2), avgTemperature: +stats.temp.toFixed(1) } : null, isDemo: items.some((i) => i.source === "demo") }
  })

  app.get("/api/territory/regions/:id", async (req, reply) => {
    const id = (req.params as any).id as string
    if (id.startsWith("real-")) {
      const f = findReal(id)
      if (!f) return reply.code(404).send({ error: "Região não encontrada." })
      const assets = db.prepare("SELECT id, name, location, type, value_brl, score FROM assets WHERE location LIKE ? LIMIT 5").all(`%${f.region.city}%`) as Row[]
      return { region: f.region, insights: realInsights(f.region, realCityStats(f.items)), relatedAssets: assets.map((a) => ({ id: a.id, name: a.name, location: a.location, type: a.type, valueBrl: a.value_brl, score: a.score })) }
    }
    const r = db.prepare("SELECT * FROM regions WHERE id = ?").get(id) as Row | undefined
    if (!r) return reply.code(404).send({ error: "Região não encontrada." })
    const region = toRegion(r)
    const assets = db.prepare("SELECT id, name, location, type, value_brl, score FROM assets WHERE location LIKE ? LIMIT 5").all(`%${r.city}%`) as Row[]
    return { region, insights: insights(region, cityStats(r.city)), relatedAssets: assets.map((a) => ({ id: a.id, name: a.name, location: a.location, type: a.type, valueBrl: a.value_brl, score: a.score })) }
  })

  // Relatório estruturado (o site imprime/baixa em PDF a partir disto)
  app.get("/api/territory/regions/:id/report", async (req, reply) => {
    const id = (req.params as any).id as string
    if (id.startsWith("real-")) {
      const f = findReal(id)
      if (!f) return reply.code(404).send({ error: "Região não encontrada." })
      const st = realCityStats(f.items)
      const ranked = [...f.items].sort((a, b) => b.temperature - a.temperature)
      return {
        title: `Relatório territorial — ${f.region.name}, ${f.region.city}/${f.region.state}`, generatedAt: new Date().toISOString(),
        region: f.region, rank: { position: ranked.findIndex((x) => x.id === f.region.id) + 1, of: ranked.length },
        cityAverage: { priceM2: Math.round(st.price_m2), temperature: +st.temp.toFixed(1) }, insights: realInsights(f.region, st),
        methodology: "Dados reais de transações imobiliárias (valor declarado ÷ área informada na fonte), últimos 12 meses, mediana por bairro; bairros com menos de 5 transações são omitidos. Temperatura = 50% volume de vendas + 50% valorização (posições relativas entre bairros da cidade). Preço/m² pode diferir do preço de anúncio, pois o valor é o declarado na transação e a área pode incluir frações comuns.",
        disclaimer: "Informações de apoio à decisão baseadas em dados públicos ou licenciados. Não constituem laudo de avaliação, recomendação de investimento nem aconselhamento jurídico ou financeiro.",
      }
    }
    const r = db.prepare("SELECT * FROM regions WHERE id = ?").get(id) as Row | undefined
    if (!r) return reply.code(404).send({ error: "Região não encontrada." })
    const region = toRegion(r)
    const stats = cityStats(r.city)
    const ranked = (db.prepare("SELECT * FROM regions WHERE city = ?").all(r.city) as Row[]).map(toRegion).sort((a, b) => b.temperature - a.temperature)
    const rank = ranked.findIndex((x) => x.id === region.id) + 1
    return {
      title: `Relatório territorial — ${region.name}, ${region.city}/${region.state}`, generatedAt: new Date().toISOString(),
      region, rank: { position: rank, of: ranked.length }, cityAverage: { priceM2: Math.round(stats.price_m2), temperature: +stats.temp.toFixed(1) },
      insights: insights(region, stats),
      methodology: `Temperatura = média ponderada das camadas (demanda ${W.demanda * 100}%, liquidez ${W.liquidez * 100}%, valorização ${W.valorizacao * 100}%, potencial ${W.potencial * 100}%, desenvolvimento ${W.desenvolvimento * 100}%), com penalização quando a oferta excede 60.`,
      disclaimer: region.source === "demo"
        ? "ATENÇÃO: dados de demonstração, gerados para ilustrar a plataforma. Não use para decisões de compra, venda ou investimento."
        : "Informações de apoio à decisão. Não constituem laudo de avaliação, recomendação de investimento nem aconselhamento jurídico ou financeiro.",
    }
  })

  app.get("/api/territory/sources", async () => {
    const demo = !!db.prepare("SELECT 1 FROM regions WHERE source = 'demo' LIMIT 1").get()
    const real = db.prepare("SELECT source, COUNT(*) AS n FROM regions WHERE source <> 'demo' GROUP BY source").all() as Row[]
    const deals = db.prepare("SELECT source, COUNT(*) AS n FROM deals GROUP BY source").all() as Row[]
    return {
      active: [
        ...(demo ? [{ id: "demo", label: "Dados de demonstração", note: "Ilustrativos, nas cidades sem dados reais." }] : []),
        ...real.map((r) => ({ id: r.source, label: r.source, note: `${r.n} regiões` })),
        ...deals.map((d) => ({ id: d.source, label: d.source, note: `${d.n.toLocaleString("pt-BR")} transações` })),
      ],
      planned: [
        { id: "cartorios", label: "Registro de imóveis (serviços oficiais)", note: "Transações registradas." },
        { id: "ibge", label: "IBGE", note: "Indicadores municipais já disponíveis; setores censitários em seguida." },
        { id: "licenciadas", label: "Bases e índices licenciados", note: "Dependem de contrato com cada fornecedor." },
      ],
    }
  })

  // Geocodificação de bairros (admin): usa o Nominatim/OpenStreetMap (1 consulta por segundo, com identificação).
  app.post("/api/admin/geocode", async (req, reply) => {
    const token = process.env.ADMIN_TOKEN
    if (!token) return reply.code(503).send({ error: "ADMIN_TOKEN não configurado no servidor." })
    if (req.headers["x-admin-token"] !== token) return reply.code(401).send({ error: "Não autorizado." })
    const p = z.object({ city: z.string().min(2).max(80), limit: z.number().int().min(1).max(40).default(25) }).safeParse(req.body)
    if (!p.success) return reply.code(400).send({ error: "Informe a cidade." })
    const base = process.env.GEOCODER_URL || "https://nominatim.openstreetmap.org/search"
    const ua = process.env.GEOCODER_UA || "IMOVKEN/1.0 (contato@imovken.com.br)"
    const first = db.prepare("SELECT state FROM deals WHERE city = ? COLLATE NOCASE LIMIT 1").get(p.data.city) as Row | undefined
    if (!first) return reply.code(404).send({ error: "Nenhuma transação importada para essa cidade." })
    const geocode = async (q: string) => {
      const r = await fetch(`${base}?q=${encodeURIComponent(q)}&format=jsonv2&limit=1&countrycodes=br`, { headers: { "User-Agent": ua, accept: "application/json" } })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const j: any = await r.json()
      return j?.[0] ? { lat: Number(j[0].lat), lng: Number(j[0].lon) } : null
    }
    const wait = (ms: number) => new Promise((res) => setTimeout(res, ms))
    const up = db.prepare(`INSERT INTO neighborhood_geo (city,state,neighborhood,lat,lng,status,source,updated_at) VALUES (?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
      ON CONFLICT(city,neighborhood) DO UPDATE SET lat=excluded.lat,lng=excluded.lng,status=excluded.status,source=excluded.source,updated_at=CURRENT_TIMESTAMP`)
    let center = db.prepare("SELECT lat, lng FROM neighborhood_geo WHERE city = ? COLLATE NOCASE AND neighborhood = '__centro__' AND status = 'ok'").get(p.data.city) as Row | undefined
    try {
      if (!center) {
        const c = await geocode(`${p.data.city}, ${first.state}, Brasil`)
        if (!c) return reply.code(422).send({ error: "Não encontrei o centro da cidade no geocodificador." })
        up.run(p.data.city, first.state, "__centro__", c.lat, c.lng, "ok", "OpenStreetMap/Nominatim")
        center = c
        await wait(1100)
      }
    } catch (e: any) { return reply.code(502).send({ error: "Falha ao consultar o geocodificador: " + String(e?.message || e) }) }
    const todo = db.prepare(`SELECT DISTINCT neighborhood FROM deals d WHERE city = ? COLLATE NOCASE AND neighborhood NOT IN (SELECT neighborhood FROM neighborhood_geo WHERE city = ? COLLATE NOCASE)
      AND (SELECT COUNT(*) FROM deals x WHERE x.city = d.city AND x.neighborhood = d.neighborhood AND x.deal_date >= date('now','-12 months')) >= 5 ORDER BY neighborhood`).all(p.data.city, p.data.city) as Row[]
    const km = (a: Row, b: Row) => { const R = 6371, rad = Math.PI / 180, dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad
      const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)) }
    let ok = 0, failed = 0
    for (const row of todo.slice(0, p.data.limit)) {
      try {
        const g = await geocode(`${row.neighborhood}, ${p.data.city}, ${first.state}, Brasil`)
        if (g && km(g, center!) <= 40) { up.run(p.data.city, first.state, row.neighborhood, g.lat, g.lng, "ok", "OpenStreetMap/Nominatim"); ok++ }
        else { up.run(p.data.city, first.state, row.neighborhood, null, null, "falhou", "OpenStreetMap/Nominatim"); failed++ }
      } catch { /* erro de rede: tenta de novo na próxima rodada */ }
      await wait(1100)
    }
    return { ok: true, geocoded: ok, notFound: failed, remaining: Math.max(0, todo.length - p.data.limit) }
  })

  // Importação de dados reais — protegida por ADMIN_TOKEN (variável de ambiente)
  const importBody = z.object({
    replaceDemoForCities: z.boolean().optional(),
    regions: z.array(z.object({
      id: z.string().min(2).max(80), city: z.string().max(80), state: z.string().length(2), name: z.string().max(120),
      lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180), radiusM: z.number().min(100).max(5000).optional(),
      valorizacao: z.number().min(0).max(100), liquidez: z.number().min(0).max(100), oferta: z.number().min(0).max(100),
      demanda: z.number().min(0).max(100), desenvolvimento: z.number().min(0).max(100), potencial: z.number().min(0).max(100),
      priceM2: z.number().optional(), change12m: z.number().optional(), daysOnMarket: z.number().int().optional(),
      deals12m: z.number().int().optional(), listingsActive: z.number().int().optional(),
      source: z.string().min(2).max(80).refine((s) => s !== "demo", "Use o nome da fonte real."),
    })).min(1).max(5000),
  })
  app.post("/api/admin/regions", async (req, reply) => {
    const token = process.env.ADMIN_TOKEN
    if (!token) return reply.code(503).send({ error: "ADMIN_TOKEN não configurado no servidor." })
    if (req.headers["x-admin-token"] !== token) return reply.code(401).send({ error: "Não autorizado." })
    const p = importBody.safeParse(req.body)
    if (!p.success) return reply.code(400).send({ error: "Dados inválidos.", details: p.error.flatten() })
    const up = db.prepare(
      `INSERT INTO regions (id,city,state,name,lat,lng,radius_m,valorizacao,liquidez,oferta,demanda,desenvolvimento,potencial,price_m2,change_12m,days_on_market,deals_12m,listings_active,source,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
       ON CONFLICT(id) DO UPDATE SET city=excluded.city,state=excluded.state,name=excluded.name,lat=excluded.lat,lng=excluded.lng,radius_m=excluded.radius_m,
        valorizacao=excluded.valorizacao,liquidez=excluded.liquidez,oferta=excluded.oferta,demanda=excluded.demanda,desenvolvimento=excluded.desenvolvimento,
        potencial=excluded.potencial,price_m2=excluded.price_m2,change_12m=excluded.change_12m,days_on_market=excluded.days_on_market,
        deals_12m=excluded.deals_12m,listings_active=excluded.listings_active,source=excluded.source,updated_at=CURRENT_TIMESTAMP`,
    )
    db.exec("BEGIN")
    try {
      if (p.data.replaceDemoForCities) {
        const cities = [...new Set(p.data.regions.map((r) => r.city))]
        for (const c of cities) db.prepare("DELETE FROM regions WHERE city = ? AND source = 'demo'").run(c)
      }
      for (const r of p.data.regions) {
        up.run(r.id, r.city, r.state, r.name, r.lat, r.lng, r.radiusM ?? 650, r.valorizacao, r.liquidez, r.oferta, r.demanda, r.desenvolvimento,
          r.potencial, r.priceM2 ?? null, r.change12m ?? null, r.daysOnMarket ?? null, r.deals12m ?? null, r.listingsActive ?? null, r.source)
      }
      db.exec("COMMIT")
    } catch (e) {
      db.exec("ROLLBACK")
      throw e
    }
    return { ok: true, imported: p.data.regions.length }
  })
}
