import type { FastifyInstance } from "fastify"
import { createHmac, timingSafeEqual } from "node:crypto"
import { db } from "./db.ts"

// Assinatura IMOVKEN Pro via Stripe (sem dependência nova: fala direto com a API REST).
// Variáveis no Render: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, (opcional) SUB_PRICE_CENTS=999, SUB_REFUND_DAYS=7,
// PREMIUM_EMAILS=email1,email2 (acesso liberado sem cobrança: você e testadores), SITE_URL.
const SITE = (process.env.SITE_URL || "https://www.imovken.com.br").replace(/\/$/, "")
export const SUB_PRICE_CENTS = Math.max(100, Number(process.env.SUB_PRICE_CENTS || 999))
export const REFUND_DAYS = Math.max(0, Number(process.env.SUB_REFUND_DAYS || 7)) // CDC art. 49: 7 dias de arrependimento
const FREE_EMAILS = new Set((process.env.PREMIUM_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean))
const ACTIVE = new Set(["active", "trialing"])

type Row = Record<string, any>
type Ctx = { currentUser: (req: any) => { id: number; name: string; email: string; role: string } | null; bad: (reply: any, msg: string, code?: number) => any }

db.exec(`CREATE TABLE IF NOT EXISTS subscriptions (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer TEXT, stripe_subscription TEXT, status TEXT NOT NULL DEFAULT 'none',
  period_end INTEGER, started_at INTEGER, refunded_at INTEGER, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`)

export function isPremium(user: { id: number; email: string } | null): boolean {
  if (!user) return false
  if (FREE_EMAILS.has(user.email.toLowerCase())) return true
  const r = db.prepare("SELECT status, period_end FROM subscriptions WHERE user_id = ?").get(user.id) as Row | undefined
  return !!r && ACTIVE.has(r.status) && (!r.period_end || r.period_end * 1000 > Date.now() - 864e5)
}

async function stripe(path: string, method = "GET", form?: Record<string, string>) {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error("STRIPE_SECRET_KEY não configurada")
  const r = await fetch("https://api.stripe.com/v1" + path, {
    method,
    headers: { Authorization: `Bearer ${key}`, ...(form ? { "content-type": "application/x-www-form-urlencoded" } : {}) },
    body: form ? new URLSearchParams(form).toString() : undefined,
  })
  const j: any = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(`Stripe ${r.status}: ${j?.error?.message ?? "erro"}`)
  return j
}

function verifySignature(raw: string, header: string | undefined, secret: string) {
  if (!header) return false
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]))
  const t = Number(parts.t)
  if (!t || Math.abs(Date.now() / 1000 - t) > 300) return false
  const expected = createHmac("sha256", secret).update(`${parts.t}.${raw}`).digest("hex")
  const a = Buffer.from(expected), b = Buffer.from(String(parts.v1 ?? ""))
  return a.length === b.length && timingSafeEqual(a, b)
}

const periodEndOf = (s: any): number | null => s.current_period_end ?? s.items?.data?.[0]?.current_period_end ?? null

function saveFromSubscription(userId: number, s: any) {
  const now = Math.floor(Date.now() / 1000)
  db.prepare(`INSERT INTO subscriptions (user_id, stripe_customer, stripe_subscription, status, period_end, started_at)
    VALUES (?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET stripe_customer=excluded.stripe_customer,
    stripe_subscription=excluded.stripe_subscription, status=excluded.status, period_end=excluded.period_end,
    started_at=COALESCE(subscriptions.started_at, excluded.started_at), updated_at=CURRENT_TIMESTAMP`)
    .run(userId, String(s.customer), String(s.id), String(s.status), periodEndOf(s), s.start_date ?? now)
}
function userOfSubscription(s: any): number | null {
  const byMeta = Number(s.metadata?.user_id)
  if (byMeta) return byMeta
  const r = db.prepare("SELECT user_id FROM subscriptions WHERE stripe_subscription = ? OR stripe_customer = ?").get(String(s.id), String(s.customer)) as Row | undefined
  return r?.user_id ?? null
}

// Recursos que ficam atrás do cadeado (backend). A tela também tem cadeado, mas este é o que vale.
const LOCKED: RegExp[] = [/^\/api\/valuation(\/|\?|$)/, /^\/api\/territory\/regions\/[^/]+\/report/]

export function registerSubscription(app: FastifyInstance, { currentUser, bad }: Ctx) {
  // guarda o corpo bruto (a assinatura do Stripe é calculada sobre ele)
  app.addContentTypeParser("application/json", { parseAs: "string" }, (req: any, body: string, done) => {
    req.rawBody = body
    if (!body) return done(null, {})
    try { done(null, JSON.parse(body)) } catch { done(Object.assign(new Error("JSON inválido"), { statusCode: 400 }), undefined) }
  })

  app.addHook("onRequest", async (req, reply) => {
    if (req.method !== "GET" || !LOCKED.some((re) => re.test(req.url))) return
    const u = currentUser(req)
    if (!u) return bad(reply, "Entre na sua conta para usar este recurso.", 401)
    if (!isPremium(u)) return reply.code(402).send({ error: "Recurso exclusivo para assinantes IMOVKEN Pro.", code: "premium_required" })
  })

  app.get("/api/subscription", async (req) => {
    const u = currentUser(req)
    const row = u ? (db.prepare("SELECT * FROM subscriptions WHERE user_id = ?").get(u.id) as Row | undefined) : undefined
    const premium = isPremium(u)
    const refundable = !!row && ACTIVE.has(row.status) && !row.refunded_at && !!row.started_at &&
      Date.now() < (row.started_at + REFUND_DAYS * 86400) * 1000
    return {
      enabled: !!process.env.STRIPE_SECRET_KEY, premium, status: row?.status ?? "none",
      periodEnd: row?.period_end ?? null, refundable, refundDays: REFUND_DAYS, priceCents: SUB_PRICE_CENTS,
      complimentary: !!u && FREE_EMAILS.has(u.email.toLowerCase()),
    }
  })

  app.post("/api/subscription/checkout", async (req, reply) => {
    const u = currentUser(req); if (!u) return bad(reply, "Faça login para assinar.", 401)
    if (!process.env.STRIPE_SECRET_KEY) return bad(reply, "Assinatura ainda não configurada. Tente novamente mais tarde.", 503)
    if (isPremium(u)) return bad(reply, "Você já tem acesso ao IMOVKEN Pro.", 409)
    try {
      const prior = db.prepare("SELECT stripe_customer FROM subscriptions WHERE user_id = ?").get(u.id) as Row | undefined
      const f: Record<string, string> = {
        mode: "subscription",
        client_reference_id: String(u.id),
        success_url: `${SITE}/assinatura?ok=1`,
        cancel_url: `${SITE}/assinatura?cancelado=1`,
        "subscription_data[metadata][user_id]": String(u.id),
        locale: "pt-BR",
      }
      if (prior?.stripe_customer) f.customer = prior.stripe_customer; else f.customer_email = u.email
      if (process.env.STRIPE_PRICE_ID) { f["line_items[0][price]"] = process.env.STRIPE_PRICE_ID; f["line_items[0][quantity]"] = "1" }
      else {
        f["line_items[0][quantity]"] = "1"
        f["line_items[0][price_data][currency]"] = "brl"
        f["line_items[0][price_data][unit_amount]"] = String(SUB_PRICE_CENTS)
        f["line_items[0][price_data][recurring][interval]"] = "month"
        f["line_items[0][price_data][product_data][name]"] = "IMOVKEN Pro"
      }
      const s = await stripe("/checkout/sessions", "POST", f)
      return { url: s.url }
    } catch (e: any) { req.log.error(e); return bad(reply, "Não foi possível abrir o pagamento agora.", 502) }
  })

  // gerenciar cartão / cancelar (precisa ativar o Portal do cliente no painel do Stripe)
  app.post("/api/subscription/portal", async (req, reply) => {
    const u = currentUser(req); if (!u) return bad(reply, "Faça login.", 401)
    const row = db.prepare("SELECT stripe_customer FROM subscriptions WHERE user_id = ?").get(u.id) as Row | undefined
    if (!row?.stripe_customer) return bad(reply, "Nenhuma assinatura encontrada.", 404)
    try {
      const s = await stripe("/billing_portal/sessions", "POST", { customer: row.stripe_customer, return_url: `${SITE}/assinatura` })
      return { url: s.url }
    } catch (e: any) { req.log.error(e); return bad(reply, "Não foi possível abrir o portal agora.", 502) }
  })

  // estorno: dentro do prazo, devolve o primeiro pagamento e encerra a assinatura
  app.post("/api/subscription/refund", async (req, reply) => {
    const u = currentUser(req); if (!u) return bad(reply, "Faça login.", 401)
    const row = db.prepare("SELECT * FROM subscriptions WHERE user_id = ?").get(u.id) as Row | undefined
    if (!row || !ACTIVE.has(row.status)) return bad(reply, "Nenhuma assinatura ativa.", 404)
    if (row.refunded_at) return bad(reply, "Esta assinatura já foi estornada.", 409)
    if (Date.now() >= (row.started_at + REFUND_DAYS * 86400) * 1000) return bad(reply, `O prazo de estorno (${REFUND_DAYS} dias) terminou. Você ainda pode cancelar a renovação pelo portal.`, 409)
    try {
      const ch = await stripe(`/charges?customer=${encodeURIComponent(row.stripe_customer)}&limit=5`)
      const paid = (ch.data as Row[]).find((c) => c.paid && !c.refunded)
      if (!paid) return bad(reply, "Pagamento não encontrado para estorno. Fale com o suporte.", 404)
      await stripe("/refunds", "POST", { charge: paid.id })
      await stripe(`/subscriptions/${row.stripe_subscription}`, "DELETE")
      db.prepare("UPDATE subscriptions SET status='canceled', refunded_at=?, updated_at=CURRENT_TIMESTAMP WHERE user_id=?").run(Math.floor(Date.now() / 1000), u.id)
      return { ok: true }
    } catch (e: any) { req.log.error(e); return bad(reply, "Não foi possível estornar agora. Tente novamente ou fale com o suporte.", 502) }
  })

  app.post("/api/stripe/webhook", async (req: any, reply) => {
    const secret = process.env.STRIPE_WEBHOOK_SECRET
    if (!secret) return bad(reply, "Webhook não configurado.", 503)
    if (!verifySignature(req.rawBody ?? "", req.headers["stripe-signature"] as string | undefined, secret)) return bad(reply, "Assinatura inválida.", 400)
    const ev = req.body as Row
    try {
      if (ev.type === "checkout.session.completed" && ev.data.object.mode === "subscription") {
        const o = ev.data.object, uid = Number(o.client_reference_id)
        if (uid && o.subscription) saveFromSubscription(uid, await stripe(`/subscriptions/${o.subscription}`))
      } else if (ev.type?.startsWith("customer.subscription.")) {
        const s = ev.data.object, uid = userOfSubscription(s)
        if (uid) saveFromSubscription(uid, s)
      } else if (ev.type === "invoice.payment_failed") {
        const c = String(ev.data.object.customer)
        db.prepare("UPDATE subscriptions SET status='past_due', updated_at=CURRENT_TIMESTAMP WHERE stripe_customer=? AND status='active'").run(c)
      }
    } catch (e: any) { req.log.error(e); return reply.code(500).send({ error: "falha ao processar" }) } // Stripe reenvia
    return { received: true }
  })
}
