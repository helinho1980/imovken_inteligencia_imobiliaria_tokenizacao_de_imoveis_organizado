import type { FastifyInstance } from "fastify"
import { db } from "./db.ts"
import { mail } from "./mail.ts"

type Row = Record<string, any>
type Ctx = { currentUser: (req: any) => { id: number; name: string; email: string; role: string } | null; bad: (reply: any, msg: string, code?: number) => any }

// Pagamento de anúncios via Mercado Pago (Checkout Pro: Pix, cartão e boleto, tudo na página do Mercado Pago).
// O servidor NUNCA confia no aviso (webhook) sozinho: ele consulta o pagamento direto na API do Mercado Pago antes de liberar o anúncio.
export const AD_PRICE_BRL = Math.max(0, Number(process.env.AD_PRICE_BRL || 0))
export const AD_DAYS = Math.max(1, Math.min(365, Number(process.env.AD_DAYS || 30)))
const MP_BASE = process.env.MP_API_BASE || "https://api.mercadopago.com"
const SITE = (process.env.SITE_URL || "https://www.imovken.com.br").replace(/\/$/, "")

async function mp(path: string, init?: RequestInit) {
  const token = process.env.MP_ACCESS_TOKEN
  if (!token) throw new Error("MP_ACCESS_TOKEN não configurado")
  const r = await fetch(MP_BASE + path, { ...init, headers: { Authorization: `Bearer ${token}`, "content-type": "application/json", ...(init?.headers || {}) } })
  const j: any = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(`Mercado Pago HTTP ${r.status}: ${JSON.stringify(j).slice(0, 200)}`)
  return j
}

function settle(paymentRow: Row, mpPaymentId: string) {
  const l = db.prepare("SELECT l.*, u.email AS owner_email FROM listings l JOIN users u ON u.id = l.owner_id WHERE l.id = ?").get(paymentRow.listing_id) as Row
  db.exec("BEGIN")
  try {
    db.prepare("UPDATE payments SET status='pago', mp_payment_id=?, paid_at=CURRENT_TIMESTAMP WHERE id=? AND status<>'pago'").run(mpPaymentId, paymentRow.id)
    // estende a partir do maior entre agora e o fim atual
    const nowStr = new Date().toISOString().slice(0, 19).replace("T", " ")
    const base = l.published_until && l.published_until > nowStr ? l.published_until : nowStr
    const newStatus = ["em_negociacao", "vendido"].includes(l.status) ? l.status : "publicado"
    db.prepare("UPDATE listings SET status=?, published_until=datetime(?, ?), updated_at=CURRENT_TIMESTAMP WHERE id=?").run(newStatus, base, `+${Math.trunc(Number(paymentRow.days))} days`, l.id)
    db.exec("COMMIT")
  } catch (e) { db.exec("ROLLBACK"); throw e }
  mail.listingPublished(l.owner_email, l.title, paymentRow.days, l.id)
}

export function registerPayments(app: FastifyInstance, { currentUser, bad }: Ctx) {
  app.get("/api/config", async () => ({ adPriceBrl: AD_PRICE_BRL, adDays: AD_DAYS, paymentsEnabled: AD_PRICE_BRL === 0 || !!process.env.MP_ACCESS_TOKEN }))

  app.post("/api/listings/:id/checkout", async (req, reply) => {
    const u = currentUser(req); if (!u) return bad(reply, "Faça login para continuar.", 401)
    if (AD_PRICE_BRL <= 0) return bad(reply, "Anúncios são gratuitos no momento.", 409)
    if (!process.env.MP_ACCESS_TOKEN) return bad(reply, "Pagamento ainda não configurado. Tente novamente mais tarde.", 503)
    const l = db.prepare("SELECT * FROM listings WHERE id = ? AND owner_id = ?").get((req.params as any).id, u.id) as Row | undefined
    if (!l) return bad(reply, "Anúncio não encontrado.", 404)
    if (l.status === "vendido") return bad(reply, "Anúncio já vendido.", 409)
    const pay = db.prepare("INSERT INTO payments (listing_id,user_id,amount_brl,days) VALUES (?,?,?,?)").run(l.id, u.id, AD_PRICE_BRL, AD_DAYS)
    const pid = Number(pay.lastInsertRowid)
    try {
      const pref = await mp("/checkout/preferences", {
        method: "POST",
        body: JSON.stringify({
          items: [{ id: `ad-${l.id}`, title: `Anúncio IMOVKEN por ${AD_DAYS} dias`, description: String(l.title).slice(0, 120), quantity: 1, currency_id: "BRL", unit_price: AD_PRICE_BRL }],
          external_reference: `pay_${pid}`,
          notification_url: `${SITE}/api/payments/mp/webhook`,
          back_urls: { success: `${SITE}/painel?pagamento=ok`, failure: `${SITE}/painel?pagamento=falha`, pending: `${SITE}/painel?pagamento=pendente` },
          auto_return: "approved",
          statement_descriptor: "IMOVKEN",
        }),
      })
      db.prepare("UPDATE payments SET mp_preference_id=? WHERE id=?").run(String(pref.id), pid)
      return { url: pref.init_point, paymentId: pid }
    } catch (e: any) {
      db.prepare("UPDATE payments SET status='falhou' WHERE id=?").run(pid)
      app.log.error(e)
      return bad(reply, "Não foi possível iniciar o pagamento agora. Tente novamente.", 502)
    }
  })

  // Aviso do Mercado Pago. Sempre responde 200 rápido; a verificação real é feita consultando a API.
  app.post("/api/payments/mp/webhook", async (req, reply) => {
    const body: any = req.body || {}, q: any = req.query || {}
    const type = body.type || q.type || q.topic
    const id = body?.data?.id || q["data.id"] || q.id
    if (type !== "payment" || !id || !/^\d+$/.test(String(id))) return reply.code(200).send({ ok: true })
    try {
      const p = await mp(`/v1/payments/${id}`)
      const ref = String(p.external_reference || "")
      const m = ref.match(/^pay_(\d+)$/)
      if (!m) return reply.code(200).send({ ok: true })
      const row = db.prepare("SELECT * FROM payments WHERE id = ?").get(Number(m[1])) as Row | undefined
      if (!row || row.status === "pago") return reply.code(200).send({ ok: true })
      if (p.status === "approved" && Math.abs(Number(p.transaction_amount) - Number(row.amount_brl)) < 0.01 && String(p.currency_id || "BRL") === "BRL") {
        settle(row, String(id))
      } else if (["rejected", "cancelled"].includes(p.status)) {
        db.prepare("UPDATE payments SET status='falhou', mp_payment_id=? WHERE id=?").run(String(id), row.id)
      }
    } catch (e) {
      app.log.error(e)
      return reply.code(500).send({ ok: false }) // o Mercado Pago tentará de novo
    }
    return reply.code(200).send({ ok: true })
  })
}
