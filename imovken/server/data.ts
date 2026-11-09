import type { FastifyInstance } from "fastify"
import { z } from "zod"
import { db } from "./db.ts"

type Row = Record<string, any>
const adminOk = (req: any, reply: any) => {
  const token = process.env.ADMIN_TOKEN
  if (!token) { reply.code(503).send({ error: "ADMIN_TOKEN não configurado no servidor." }); return false }
  if (req.headers["x-admin-token"] !== token) { reply.code(401).send({ error: "Não autorizado." }); return false }
  return true
}

// Indicadores oficiais do IBGE (API de agregados v3). Para incluir outro indicador, adicione uma linha aqui
// (agregado e variável conforme https://servicodados.ibge.gov.br/api/docs/agregados).
const IBGE_INDICATORS = [
  { key: "pop_estimada", agregado: 6579, variavel: 9324, label: "População residente estimada", unit: "pessoas" },
]

export function registerData(app: FastifyInstance) {
  // ---------- importação de transações (ITBI / bases licenciadas) ----------
  const deal = z.object({
    city: z.string().min(2).max(80), state: z.string().length(2), neighborhood: z.string().min(1).max(120),
    declaredValue: z.number().positive().max(1e10), areaM2: z.number().min(8).max(100000),
    dealDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), propertyType: z.string().max(60).optional(), sourceRef: z.string().max(120).optional(),
  })
  const body = z.object({ source: z.string().min(2).max(120).refine((s) => s.toLowerCase() !== "demo"), rows: z.array(deal).min(1).max(2000) })
  app.post("/api/admin/deals/import", async (req, reply) => {
    if (!adminOk(req, reply)) return
    const p = body.safeParse(req.body)
    if (!p.success) return reply.code(400).send({ error: "Dados inválidos.", details: p.error.flatten().fieldErrors })
    const ins = db.prepare(`INSERT OR IGNORE INTO deals (city,state,neighborhood,declared_value,area_m2,deal_date,property_type,source,source_ref) VALUES (?,?,?,?,?,?,?,?,?)`)
    let added = 0
    db.exec("BEGIN")
    try {
      for (const r of p.data.rows) {
        const res = ins.run(r.city.trim(), r.state.toUpperCase(), r.neighborhood.trim(), r.declaredValue, r.areaM2, r.dealDate, r.propertyType ?? null, p.data.source, r.sourceRef ?? null)
        added += Number(res.changes)
      }
      db.exec("COMMIT")
    } catch (e) { db.exec("ROLLBACK"); throw e }
    return { ok: true, received: p.data.rows.length, added, duplicates: p.data.rows.length - added }
  })

  // ---------- sincronização IBGE ----------
  const ibgeBody = z.object({ cities: z.array(z.object({ ibgeCode: z.string().regex(/^\d{7}$/), name: z.string().max(80).optional() })).min(1).max(50) })
  app.post("/api/admin/ibge/sync", async (req, reply) => {
    if (!adminOk(req, reply)) return
    const p = ibgeBody.safeParse(req.body)
    if (!p.success) return reply.code(400).send({ error: "Informe códigos IBGE de 7 dígitos." })
    const up = db.prepare(`INSERT INTO city_indicators (ibge_code,city,indicator,label,value,unit,ref_period,source,source_url,fetched_at)
      VALUES (?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
      ON CONFLICT(ibge_code,indicator) DO UPDATE SET city=excluded.city,label=excluded.label,value=excluded.value,unit=excluded.unit,ref_period=excluded.ref_period,source_url=excluded.source_url,fetched_at=CURRENT_TIMESTAMP`)
    const report: Row[] = []
    for (const c of p.data.cities) {
      for (const ind of IBGE_INDICATORS) {
        const url = `https://servicodados.ibge.gov.br/api/v3/agregados/${ind.agregado}/periodos/-1/variaveis/${ind.variavel}?localidades=N6[${c.ibgeCode}]`
        try {
          const r = await fetch(url, { headers: { accept: "application/json" } })
          if (!r.ok) throw new Error(`HTTP ${r.status}`)
          const j: any = await r.json()
          const serie = j?.[0]?.resultados?.[0]?.series?.[0]
          const periodo = serie && Object.keys(serie.serie || {})[0]
          const raw = periodo ? serie.serie[periodo] : null
          const value = Number(raw)
          if (!serie || !Number.isFinite(value)) throw new Error("resposta sem valor numérico")
          up.run(c.ibgeCode, serie.localidade?.nome ?? c.name ?? c.ibgeCode, ind.key, ind.label, value, ind.unit, periodo, "IBGE", url)
          report.push({ ibgeCode: c.ibgeCode, city: serie.localidade?.nome, indicator: ind.key, value, period: periodo, ok: true })
        } catch (e: any) {
          report.push({ ibgeCode: c.ibgeCode, indicator: ind.key, ok: false, error: String(e?.message || e) })
        }
      }
    }
    return { ok: report.every((r) => r.ok), report }
  })

  // ---------- consulta pública (somente dados reais, com fonte) ----------
  app.get("/api/data/city", async (req) => {
    const q = z.object({ city: z.string().max(80) }).parse(req.query)
    const indicators = db.prepare("SELECT indicator, label, value, unit, ref_period AS refPeriod, source, source_url AS sourceUrl FROM city_indicators WHERE city = ? COLLATE NOCASE").all(q.city) as Row[]
    const sources = db.prepare("SELECT source, COUNT(*) AS n, MIN(deal_date) AS from_date, MAX(deal_date) AS to_date FROM deals WHERE city = ? COLLATE NOCASE GROUP BY source").all(q.city) as Row[]
    // preço/m² por bairro (mediana) nos últimos 12 meses e nos 12 anteriores
    const rows = db.prepare(`SELECT neighborhood, declared_value/area_m2 AS pm2, deal_date FROM deals
      WHERE city = ? COLLATE NOCASE AND deal_date >= date('now','-24 months') AND declared_value/area_m2 BETWEEN 500 AND 100000`).all(q.city) as Row[]
    const cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() - 12)
    const cut = cutoff.toISOString().slice(0, 10)
    const by = new Map<string, { cur: number[]; prev: number[] }>()
    for (const r of rows) {
      const e = by.get(r.neighborhood) ?? { cur: [], prev: [] }
      ;(r.deal_date >= cut ? e.cur : e.prev).push(r.pm2)
      by.set(r.neighborhood, e)
    }
    const med = (a: number[]) => { const s = [...a].sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : null }
    const neighborhoods = [...by.entries()].filter(([, e]) => e.cur.length >= 5).map(([name, e]) => {
      const c = med(e.cur)!, pv = e.prev.length >= 5 ? med(e.prev) : null
      return { name, medianPriceM2: Math.round(c), deals12m: e.cur.length, change12m: pv ? +(((c - pv) / pv) * 100).toFixed(1) : null }
    }).sort((a, b) => b.deals12m - a.deals12m).slice(0, 30)
    return {
      indicators, sources: sources.map((s) => ({ source: s.source, deals: s.n, from: s.from_date, to: s.to_date })), neighborhoods,
      note: "Preço por m² = valor declarado na transação ÷ área informada na fonte. Bairros com menos de 5 transações no período não são exibidos.",
    }
  })
}
