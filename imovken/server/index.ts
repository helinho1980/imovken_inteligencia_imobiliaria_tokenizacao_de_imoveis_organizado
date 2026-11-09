import Fastify from "fastify"
import cookie from "@fastify/cookie"
import fastifyStatic from "@fastify/static"
import { z } from "zod"
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto"
import { existsSync } from "node:fs"
import { resolve } from "node:path"
import { db } from "./db.ts"
import { registerTerritory } from "./territory.ts"
import { registerValuation } from "./valuation.ts"
import { registerData } from "./data.ts"
import { registerMarket } from "./market.ts"
import { registerPayments } from "./payments.ts"
import { registerCertificates } from "./certificates.ts"
import { mail } from "./mail.ts"
import { LEGAL_VERSIONS, recordConsents, pendingDocs } from "./legal.ts"

const isProd = process.env.NODE_ENV === "production"
const app = Fastify({ logger: true, trustProxy: true, bodyLimit: 5 * 1024 * 1024 })
await app.register(cookie)

// ---------- helpers ----------
const SESSION_DAYS = 14
const hash = (pw: string) => {
  const salt = randomBytes(16).toString("hex")
  return `${salt}:${scryptSync(pw, salt, 64).toString("hex")}`
}
const verify = (pw: string, stored: string) => {
  const [salt, key] = stored.split(":")
  const a = Buffer.from(key, "hex"), b = scryptSync(pw, salt, 64)
  return a.length === b.length && timingSafeEqual(a, b)
}
const brl = (v: number) => `R$ ${(v / 1e6).toFixed(v >= 1e7 ? 1 : 2)}M`
const money = (v: number) => `R$ ${Math.round(v).toLocaleString("pt-BR")}`

type Row = Record<string, any>
const toAsset = (r: Row) => ({
  id: r.id, name: r.name, location: r.location, type: r.type,
  value: brl(r.value_brl), valueBrl: r.value_brl, score: r.score,
  potential: `+${r.potential.toFixed(1)}%`, liquidity: r.liquidity, token: r.token,
  area: r.area, year: r.year, occupancy: r.occupancy, zoning: r.zoning,
  daysToSell: r.days_to_sell, range: `${brl(r.range_low)} — ${brl(r.range_high)}`,
  pricePerM2: money(r.value_brl / r.area),
})

function currentUser(req: any) {
  const sid = req.cookies?.sid
  if (!sid) return null
  const row = db.prepare(
    "SELECT u.id, u.name, u.email, u.role, s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ?",
  ).get(sid) as Row | undefined
  if (!row || row.expires_at < Date.now()) return null
  return { id: row.id as number, name: row.name as string, email: row.email as string, role: row.role as string }
}
function startSession(reply: any, userId: number) {
  const sid = randomBytes(32).toString("hex")
  db.prepare("INSERT INTO sessions VALUES (?,?,?)").run(sid, userId, Date.now() + SESSION_DAYS * 864e5)
  reply.setCookie("sid", sid, {
    httpOnly: true, sameSite: "lax", secure: isProd, path: "/", maxAge: SESSION_DAYS * 86400,
  })
}
const bad = (reply: any, msg: string, code = 400) => reply.code(code).send({ error: msg })

// ---------- rate limit simples (por IP, em memória) ----------
const hits = new Map<string, { n: number; t: number }>()
app.addHook("onRequest", async (req, reply) => {
  if (req.method !== "POST" || !req.url.startsWith("/api/") || req.url.startsWith("/api/admin/")) return
  const now = Date.now(), h = hits.get(req.ip)
  if (!h || now - h.t > 60_000) return void hits.set(req.ip, { n: 1, t: now })
  if (++h.n > 20) return bad(reply, "Muitas tentativas. Aguarde um minuto.", 429)
})

// ---------- rotas ----------
app.get("/api/health", async () => ({ ok: true }))

const ROLES = ["entusiasta", "corretor", "investidor", "proprietario", "incorporador", "instituicao"] as const
const creds = z.object({ email: z.string().email().max(160), password: z.string().min(8).max(200) })
app.post("/api/auth/register", async (req, reply) => {
  const p = creds.extend({ name: z.string().min(2).max(120), role: z.enum(ROLES).default("entusiasta"), age18: z.literal(true), accept: z.record(z.string()) }).safeParse(req.body)
  if (!p.success) return bad(reply, "Dados inválidos. A senha precisa ter 8+ caracteres.")
  for (const [doc, v] of Object.entries(LEGAL_VERSIONS)) {
    if (p.data.accept[doc] !== v) return bad(reply, "É necessário aceitar os Termos, a Política de Privacidade, o Contrato de Adesão e o Aviso de Riscos.")
  }
  const email = p.data.email.toLowerCase()
  if (db.prepare("SELECT 1 FROM users WHERE email = ?").get(email)) return bad(reply, "E-mail já cadastrado.", 409)
  const r = db.prepare("INSERT INTO users (email, name, password_hash, role) VALUES (?,?,?,?)")
    .run(email, p.data.name, hash(p.data.password), p.data.role)
  recordConsents(Number(r.lastInsertRowid), req.ip, String(req.headers["user-agent"] ?? ""))
  mail.welcome(email, p.data.name)
  startSession(reply, Number(r.lastInsertRowid))
  return { user: { name: p.data.name, email, role: p.data.role, needsAcceptance: [] } }
})
app.post("/api/auth/login", async (req, reply) => {
  const p = creds.safeParse(req.body)
  if (!p.success) return bad(reply, "E-mail ou senha inválidos.", 401)
  const u = db.prepare("SELECT * FROM users WHERE email = ?").get(p.data.email.toLowerCase()) as Row | undefined
  if (!u || !verify(p.data.password, u.password_hash)) return bad(reply, "E-mail ou senha inválidos.", 401)
  startSession(reply, u.id)
  return { user: { name: u.name, email: u.email, role: u.role, needsAcceptance: pendingDocs(u.id) } }
})
app.post("/api/auth/logout", async (req, reply) => {
  if (req.cookies.sid) db.prepare("DELETE FROM sessions WHERE id = ?").run(req.cookies.sid)
  reply.clearCookie("sid", { path: "/" })
  return { ok: true }
})
app.get("/api/auth/me", async (req) => {
  const u = currentUser(req)
  return { user: u ? { ...u, needsAcceptance: pendingDocs(u.id) } : null }
})
app.post("/api/legal/accept", async (req, reply) => {
  const u = currentUser(req)
  if (!u) return bad(reply, "Faça login para aceitar.", 401)
  const p = z.object({ accept: z.record(z.string()) }).safeParse(req.body)
  if (!p.success) return bad(reply, "Dados inválidos.")
  for (const [doc, v] of Object.entries(LEGAL_VERSIONS)) {
    if (p.data.accept[doc] !== v) return bad(reply, "Aceite todos os documentos na versão vigente.")
  }
  recordConsents(u.id, req.ip, String(req.headers["user-agent"] ?? ""))
  return { ok: true }
})

const sorts: Record<string, string> = {
  score: "score DESC", value: "value_brl DESC", potential: "potential DESC",
}
app.get("/api/assets", async (req) => {
  const q = z.object({
    q: z.string().max(80).optional(), type: z.string().optional(),
    liquidity: z.string().optional(), token: z.string().optional(),
    minValue: z.coerce.number().optional(), maxValue: z.coerce.number().optional(),
    sort: z.string().optional(),
  }).parse(req.query)
  const where: string[] = [], args: any[] = []
  if (q.q) {
    where.push("(lower(name) LIKE ? OR lower(location) LIKE ? OR lower(id) LIKE ?)")
    const t = `%${q.q.toLowerCase()}%`; args.push(t, t, t)
  }
  if (q.type && q.type !== "Todos") { where.push("type = ?"); args.push(q.type) }
  if (q.liquidity) { where.push("liquidity = ?"); args.push(q.liquidity) }
  if (q.token) { where.push("token = ?"); args.push(q.token) }
  if (q.minValue != null) { where.push("value_brl >= ?"); args.push(q.minValue) }
  if (q.maxValue != null) { where.push("value_brl <= ?"); args.push(q.maxValue) }
  const sql = `SELECT * FROM assets ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY ${sorts[q.sort ?? ""] ?? "id DESC"}`
  const items = (db.prepare(sql).all(...args) as Row[]).map(toAsset)
  return { total: items.length, items }
})
app.get("/api/assets/:id", async (req, reply) => {
  const r = db.prepare("SELECT * FROM assets WHERE id = ?").get((req.params as any).id) as Row | undefined
  return r ? toAsset(r) : bad(reply, "Ativo não encontrado.", 404)
})
app.get("/api/assets/:id/history", async (req, reply) => {
  const { id } = req.params as { id: string }
  const months = { "12M": 12, "24M": 24, "36M": 36 }[String((req.query as any).period ?? "36M")] ?? 36
  const rows = db.prepare(
    "SELECT month, price_m2, benchmark_m2 FROM asset_history WHERE asset_id = ? ORDER BY month DESC LIMIT ?",
  ).all(id, months) as Row[]
  if (!rows.length) return bad(reply, "Ativo não encontrado.", 404)
  rows.reverse()
  const pct = (a: number, b: number) => +(((b - a) / a) * 100).toFixed(1)
  return {
    points: rows.map((r) => ({ month: r.month, price: r.price_m2, benchmark: r.benchmark_m2 })),
    appreciation: pct(rows[0].price_m2, rows.at(-1)!.price_m2),
    regional: pct(rows[0].benchmark_m2, rows.at(-1)!.benchmark_m2),
  }
})

app.post("/api/analysis-requests", async (req, reply) => {
  const p = z.object({
    assetId: z.string(), name: z.string().min(2).max(120),
    email: z.string().email(), message: z.string().max(2000).optional(),
  }).safeParse(req.body)
  if (!p.success) return bad(reply, "Dados inválidos.")
  if (!db.prepare("SELECT 1 FROM assets WHERE id = ?").get(p.data.assetId)) return bad(reply, "Ativo não encontrado.", 404)
  db.prepare("INSERT INTO analysis_requests (asset_id, user_id, name, email, message) VALUES (?,?,?,?,?)")
    .run(p.data.assetId, currentUser(req)?.id ?? null, p.data.name, p.data.email, p.data.message ?? null)
  return reply.code(201).send({ ok: true })
})
app.post("/api/contact", async (req, reply) => {
  const p = z.object({
    name: z.string().min(2).max(120), email: z.string().email(), message: z.string().min(5).max(2000),
  }).safeParse(req.body)
  if (!p.success) return bad(reply, "Dados inválidos.")
  db.prepare("INSERT INTO contacts (name, email, message) VALUES (?,?,?)").run(p.data.name, p.data.email, p.data.message)
  return reply.code(201).send({ ok: true })
})

registerTerritory(app)
registerValuation(app)
registerData(app)
registerMarket(app, { currentUser, bad })
registerPayments(app, { currentUser, bad })
registerCertificates(app, { currentUser, bad })

// ---------- frontend (produção) ----------
const dist = resolve("dist")
if (existsSync(dist)) {
  await app.register(fastifyStatic, { root: dist })
  app.setNotFoundHandler((req, reply) =>
    req.url.startsWith("/api/") ? reply.code(404).send({ error: "Não encontrado." }) : reply.sendFile("index.html"))
}

const port = Number(process.env.API_PORT ?? (isProd ? process.env.PORT : undefined) ?? 3000)
await app.listen({ port, host: "0.0.0.0" })
