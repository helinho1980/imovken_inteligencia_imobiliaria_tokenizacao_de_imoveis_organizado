import type { FastifyInstance } from "fastify"
import { z } from "zod"
import { db } from "./db.ts"

type Row = Record<string, any>

const TYPES = ["apartamento", "casa", "terreno", "comercial", "rural", "outro"] as const
// Só estes tipos usam o preço/m² de bairro (transações e regiões); terreno, rural e outro só com anúncios comparáveis.
const URBAN = new Set(["apartamento", "casa", "comercial"])
const VISIBLE = "(l.status = 'em_negociacao' OR (l.status = 'publicado' AND (l.published_until IS NULL OR l.published_until > datetime('now'))))"

const pct = (sorted: number[], p: number) => {
  if (!sorted.length) return 0
  const i = (sorted.length - 1) * p
  const lo = Math.floor(i), hi = Math.ceil(i)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo)
}
const round = (n: number) => Math.round(n)

export function registerValuation(app: FastifyInstance) {
  app.get("/api/valuation", async (req, reply) => {
    const p = z.object({
      city: z.string().trim().min(2).max(80),
      neighborhood: z.string().trim().max(120).optional(),
      type: z.enum(TYPES),
      area: z.coerce.number().positive().max(1_000_000),
    }).safeParse(req.query)
    if (!p.success) return reply.code(400).send({ error: "Informe cidade, tipo e área (m²) do imóvel." })
    const { city, type, area } = p.data
    const hood = p.data.neighborhood || ""

    // ---- anúncios comparáveis (sempre calculados: servem de método e de referência) ----
    const listingRows = db.prepare(
      `SELECT l.id, l.title, l.neighborhood, l.price_brl, l.area_m2 FROM listings l
       WHERE ${VISIBLE} AND l.city = ? COLLATE NOCASE AND l.type = ? AND l.area_m2 > 0`,
    ).all(city, type) as Row[]
    const comps = listingRows
      .map((r) => ({
        id: r.id as number, title: r.title as string, neighborhood: (r.neighborhood as string) || null,
        priceBrl: r.price_brl as number, areaM2: r.area_m2 as number, pricePerM2: round(r.price_brl / r.area_m2),
        sameHood: !!hood && String(r.neighborhood || "").toLowerCase() === hood.toLowerCase(),
      }))
      .sort((a, b) => Number(b.sameHood) - Number(a.sameHood) || Math.abs(a.areaM2 - area) - Math.abs(b.areaM2 - area))
      .slice(0, 8)
    const listingPm2 = comps.map((c) => c.pricePerM2).sort((a, b) => a - b)

    // ---- 1) transações reais (ITBI/bases importadas), só para tipos urbanos ----
    let method: "transacoes_bairro" | "transacoes_cidade" | "anuncios" | "demonstrativo" | null = null
    let sample = 0, low = 0, mid = 0, high = 0, regionName: string | null = null

    if (URBAN.has(type)) {
      const deals = (where: string, args: any[]) =>
        (db.prepare(
          `SELECT declared_value/area_m2 AS pm2 FROM deals
           WHERE city = ? COLLATE NOCASE ${where} AND deal_date >= date('now','-24 months')
             AND declared_value/area_m2 BETWEEN 500 AND 100000
             AND (property_type IS NULL OR lower(property_type) = ?)`,
        ).all(city, ...args, type) as Row[]).map((r) => r.pm2 as number).sort((a, b) => a - b)

      if (hood) {
        const h = deals("AND neighborhood = ? COLLATE NOCASE", [hood])
        if (h.length >= 5) { method = "transacoes_bairro"; sample = h.length; low = pct(h, 0.25); mid = pct(h, 0.5); high = pct(h, 0.75); regionName = hood }
      }
      if (!method) {
        const c = deals("", [])
        if (c.length >= 8) { method = "transacoes_cidade"; sample = c.length; low = pct(c, 0.25); mid = pct(c, 0.5); high = pct(c, 0.75) }
      }
    }

    // ---- 2) anúncios comparáveis ----
    if (!method && listingPm2.length >= 3) {
      method = "anuncios"; sample = listingPm2.length
      low = pct(listingPm2, 0.25); mid = pct(listingPm2, 0.5); high = pct(listingPm2, 0.75)
    }

    // ---- 3) regiões demonstrativas (valores ilustrativos) ----
    if (!method && URBAN.has(type)) {
      const regs = db.prepare("SELECT name, price_m2 FROM regions WHERE city = ? COLLATE NOCASE AND price_m2 > 0").all(city) as Row[]
      const hit = hood ? regs.find((r) => String(r.name).toLowerCase().includes(hood.toLowerCase())) : undefined
      if (hit) { mid = hit.price_m2; regionName = hit.name; sample = 1 }
      else if (regs.length) { mid = regs.reduce((a, r) => a + r.price_m2, 0) / regs.length; sample = regs.length }
      if (mid > 0) { method = "demonstrativo"; low = mid * 0.8; high = mid * 1.2 }
    }

    if (!method) {
      return reply.code(404).send({
        error: "Ainda não há dados suficientes para esta cidade e tipo de imóvel. Quando houver anúncios ou transações cadastrados, a estimativa aparece aqui.",
      })
    }

    const LABEL: Record<string, string> = {
      transacoes_bairro: "Mediana de transações reais do bairro (últimos 24 meses)",
      transacoes_cidade: "Mediana de transações reais da cidade (últimos 24 meses)",
      anuncios: "Preços pedidos em anúncios comparáveis na plataforma",
      demonstrativo: "Valores demonstrativos da região (ilustrativos)",
    }
    const WARN: Record<string, string | null> = {
      transacoes_bairro: null,
      transacoes_cidade: "Sem transações suficientes no bairro informado: a estimativa usa a cidade inteira.",
      anuncios: "Preços pedidos costumam ficar acima do valor final de venda. Use como referência de mercado, não como valor de negociação.",
      demonstrativo: "Valores ilustrativos: ainda não há transações reais nem anúncios suficientes para esta cidade. Não use para decisões de compra, venda ou investimento.",
    }

    const asking = method !== "anuncios" && listingPm2.length >= 3 ? round(pct(listingPm2, 0.5)) : null

    return {
      method, methodLabel: LABEL[method], warning: WARN[method], sampleSize: sample, isDemo: method === "demonstrativo",
      region: regionName,
      pricePerM2: { low: round(low), mid: round(mid), high: round(high) },
      estimate: { low: round(low * area), mid: round(mid * area), high: round(high * area) },
      askingPricePerM2: asking,
      comparables: comps.slice(0, 6).map(({ sameHood: _s, ...c }) => c),
      disclaimer: "Estimativa indicativa baseada em dados de mercado. Não é laudo de avaliação (ABNT NBR 14653) nem substitui um profissional habilitado.",
    }
  })
}
