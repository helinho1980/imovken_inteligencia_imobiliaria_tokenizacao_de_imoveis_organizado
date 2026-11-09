import type { FastifyInstance } from "fastify"
import { createHash } from "node:crypto"
import { z } from "zod"
import { db } from "./db.ts"
import { mail, flushOutbox } from "./mail.ts"
import { AD_PRICE_BRL } from "./payments.ts"
import { createDealCertificate } from "./certificates.ts"

type Row = Record<string, any>
type Ctx = { currentUser: (req: any) => { id: number; name: string; email: string; role: string } | null; bad: (reply: any, msg: string, code?: number) => any }
const money = (v: number) => `R$ ${Math.round(v).toLocaleString("pt-BR")}`
const TYPES = ["apartamento", "casa", "terreno", "comercial", "rural", "outro"] as const
const VISIBLE = "(l.status = 'em_negociacao' OR (l.status = 'publicado' AND (l.published_until IS NULL OR l.published_until > datetime('now'))))"
const BROKER = { name: process.env.BROKER_NAME || "", creci: process.env.BROKER_CRECI || "", payer: process.env.PLATFORM_FEE_PAYER || "vendedor" }
const PLATFORM_FEE_PCT = Math.max(0, Math.min(10, Number(process.env.PLATFORM_FEE_PCT || 0)))

const adminOk = (req: any, reply: any) => {
  const t = process.env.ADMIN_TOKEN
  if (!t) { reply.code(503).send({ error: "ADMIN_TOKEN não configurado no servidor." }); return false }
  if (req.headers["x-admin-token"] !== t) { reply.code(401).send({ error: "Não autorizado." }); return false }
  return true
}

const photosOf = (id: number) => (db.prepare("SELECT id FROM listing_photos WHERE listing_id = ? ORDER BY position, id").all(id) as Row[]).map((x) => x.id as number)
const toListing = (r: Row) => ({
  photos: photosOf(r.id), publishedUntil: r.published_until,
  id: r.id, title: r.title, description: r.description, type: r.type, city: r.city, state: r.state, neighborhood: r.neighborhood,
  priceBrl: r.price_brl, areaM2: r.area_m2, bedrooms: r.bedrooms, pricePerM2: r.area_m2 ? Math.round(r.price_brl / r.area_m2) : null,
  brokerCommissionPct: r.broker_commission_pct, status: r.status, createdAt: r.created_at,
  owner: { name: String(r.owner_name).split(" ")[0], role: r.owner_role, creci: r.owner_role === "corretor" ? r.owner_creci : null },
})
const LISTING_SELECT = `SELECT l.*, u.name AS owner_name, u.role AS owner_role, u.creci AS owner_creci FROM listings l JOIN users u ON u.id = l.owner_id`

function contractText(l: Row, seller: Row, buyer: Row, price: number, proposalMsg: string | null) {
  const d = new Date().toLocaleDateString("pt-BR")
  return [
    "MINUTA DE INSTRUMENTO PARTICULAR DE PROMESSA DE COMPRA E VENDA DE IMÓVEL",
    `Gerada eletronicamente em ${d} pela plataforma IMOVKEN (www.imovken.com.br), que não é parte deste contrato.`,
    "",
    `PROMITENTE VENDEDOR(A): ${seller.name} (e-mail cadastrado: ${seller.email}). Qualificação completa (CPF/CNPJ, estado civil, endereço) a ser complementada pelas partes.`,
    `PROMITENTE COMPRADOR(A): ${buyer.name} (e-mail cadastrado: ${buyer.email}). Qualificação completa (CPF/CNPJ, estado civil, endereço) a ser complementada pelas partes.`,
    "",
    "CLÁUSULA 1 — OBJETO. O(A) vendedor(a) promete vender e o(a) comprador(a) promete comprar o imóvel anunciado como:",
    `"${l.title}", tipo ${l.type}, localizado em ${[l.neighborhood, l.city + "/" + l.state].filter(Boolean).join(", ")}${l.area_m2 ? `, área informada de ${l.area_m2} m²` : ""}. A matrícula e a descrição registral completa deverão ser indicadas pelas partes antes da escritura.`,
    `CLÁUSULA 2 — PREÇO. O preço ajustado é de ${money(price)}, conforme proposta aceita na plataforma. Forma, prazos, sinal e financiamento: a definir por escrito entre as partes${proposalMsg ? `. Observações da proposta: "${proposalMsg}"` : ""}.`,
    "CLÁUSULA 3 — CONDIÇÕES. A conclusão do negócio depende, no mínimo, de: (a) certidões do imóvel e do vendedor em ordem; (b) inexistência de ônus não informados; (c) pagamento do ITBI e das taxas devidas; (d) escritura pública e registro no Cartório de Registro de Imóveis, quando exigidos por lei, o que ocorre na maioria das transações.",
    "CLÁUSULA 4 — NATUREZA DESTA MINUTA. Este documento registra a intenção e as condições gerais acordadas na plataforma. A transferência da propriedade só ocorre com o registro do título no cartório competente. As partes devem revisar este texto e, se desejarem, submetê-lo a advogado ou corretor habilitado antes de assumir obrigações.",
    BROKER.creci && PLATFORM_FEE_PCT > 0
      ? `CLÁUSULA 5 — CORRETAGEM. A intermediação deste negócio foi realizada por ${BROKER.name || "corretor responsável"}, CRECI ${BROKER.creci}, com remuneração de corretagem de ${PLATFORM_FEE_PCT}% do preço, a cargo do(a) ${BROKER.payer}, devida apenas se o negócio for concluído. Comissão de corretagem informada no anúncio pelo anunciante: ${l.broker_commission_pct || 0}%, ajustada diretamente com o corretor do anunciante, se houver.`
      : `CLÁUSULA 5 — CORRETAGEM. Comissão de corretagem informada no anúncio: ${l.broker_commission_pct || 0}% do preço, a ser ajustada diretamente entre vendedor(a) e o(a) corretor(a) responsável, se houver. A IMOVKEN não presta serviço de corretagem nem é responsável por ela.`,
    "CLÁUSULA 6 — ACEITE ELETRÔNICO. As partes concordam em manifestar o aceite deste instrumento por meio eletrônico na plataforma, ficando registrados a data, a hora e o endereço IP de cada aceite, bem como o código de integridade (SHA-256) deste texto.",
    "CLÁUSULA 7 — FORO. Aplicam-se as leis brasileiras. O foro é o da comarca onde se situa o imóvel, salvo escolha diferente por escrito entre as partes.",
  ].join("\n")
}

export function registerMarket(app: FastifyInstance, { currentUser, bad }: Ctx) {
  const auth = (req: any, reply: any) => { const u = currentUser(req); if (!u) bad(reply, "Faça login para continuar.", 401); return u }

  // ---------- perfil (CRECI) ----------
  app.patch("/api/me/profile", async (req, reply) => {
    const u = auth(req, reply); if (!u) return
    const p = z.object({ creci: z.string().trim().min(3).max(30) }).safeParse(req.body)
    if (!p.success) return bad(reply, "Informe um CRECI válido.")
    db.prepare("UPDATE users SET creci = ? WHERE id = ?").run(p.data.creci, u.id)
    return { ok: true }
  })

  // ---------- anúncios ----------
  app.get("/api/listings", async (req) => {
    const q = z.object({ city: z.string().max(80).optional(), type: z.enum(TYPES).optional(), min: z.coerce.number().optional(), max: z.coerce.number().optional(), q: z.string().max(80).optional() }).parse(req.query)
    const w = [VISIBLE], a: any[] = []
    if (q.city) { w.push("l.city = ? COLLATE NOCASE"); a.push(q.city) }
    if (q.type) { w.push("l.type = ?"); a.push(q.type) }
    if (q.min) { w.push("l.price_brl >= ?"); a.push(q.min) }
    if (q.max) { w.push("l.price_brl <= ?"); a.push(q.max) }
    if (q.q) { w.push("(l.title LIKE ? OR l.neighborhood LIKE ?)"); a.push(`%${q.q}%`, `%${q.q}%`) }
    const rows = db.prepare(`${LISTING_SELECT} WHERE ${w.join(" AND ")} ORDER BY l.id DESC LIMIT 60`).all(...a) as Row[]
    return { items: rows.map(toListing) }
  })

  app.get("/api/listings/:id", async (req, reply) => {
    const r = db.prepare(`${LISTING_SELECT} WHERE l.id = ?`).get((req.params as any).id) as Row | undefined
    const u = currentUser(req)
    const visible = r && db.prepare(`SELECT 1 FROM listings l WHERE l.id = ? AND ${VISIBLE}`).get(r.id)
    if (!r || (!visible && r.owner_id !== u?.id)) return bad(reply, "Anúncio não encontrado.", 404)
    return { listing: toListing(r), isOwner: r.owner_id === u?.id }
  })

  const listingBody = z.object({
    title: z.string().trim().min(5).max(120), description: z.string().trim().max(2000).optional(), type: z.enum(TYPES),
    city: z.string().trim().min(2).max(80), state: z.string().trim().length(2), neighborhood: z.string().trim().max(120).optional(),
    priceBrl: z.number().positive().max(1e10), areaM2: z.number().positive().max(1e6).optional(), bedrooms: z.number().int().min(0).max(30).optional(),
    brokerCommissionPct: z.number().min(0).max(10).default(0), declaresAuthority: z.literal(true),
  })
  app.post("/api/listings", async (req, reply) => {
    const u = auth(req, reply); if (!u) return
    const p = listingBody.safeParse(req.body)
    if (!p.success) return bad(reply, "Dados do anúncio inválidos. Confirme a declaração de autorização para anunciar.")
    if (u.role === "corretor") {
      const row = db.prepare("SELECT creci FROM users WHERE id = ?").get(u.id) as Row
      if (!row?.creci) return bad(reply, "Corretores precisam informar o número do CRECI antes de anunciar.", 422)
    }
    const d = p.data
    const r = db.prepare(`INSERT INTO listings (owner_id,title,description,type,city,state,neighborhood,price_brl,area_m2,bedrooms,broker_commission_pct,status)
      VALUES (?,?,?,?,?,?,?,?,?,?,?, ?)`).run(u.id, d.title, d.description ?? null, d.type, d.city, d.state.toUpperCase(), d.neighborhood ?? null, d.priceBrl, d.areaM2 ?? null, d.bedrooms ?? null, d.brokerCommissionPct, AD_PRICE_BRL > 0 ? "aguardando_pagamento" : "publicado")
    return { id: Number(r.lastInsertRowid), needsPayment: AD_PRICE_BRL > 0 }
  })

  app.post("/api/listings/:id/status", async (req, reply) => {
    const u = auth(req, reply); if (!u) return
    const p = z.object({ status: z.enum(["publicado", "pausado"]) }).safeParse(req.body)
    const l = db.prepare("SELECT * FROM listings WHERE id = ? AND owner_id = ?").get((req.params as any).id, u.id) as Row | undefined
    if (!p.success || !l) return bad(reply, "Anúncio não encontrado.", 404)
    if (["em_negociacao", "vendido"].includes(l.status)) return bad(reply, "Anúncio em negociação ou vendido não pode ser alterado.", 409)
    if (p.data.status === "publicado" && AD_PRICE_BRL > 0 && (!l.published_until || l.published_until <= new Date().toISOString().slice(0, 19).replace("T", " "))) return bad(reply, "Pague para publicar o anúncio.", 402)
    db.prepare("UPDATE listings SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(p.data.status, l.id)
    return { ok: true }
  })

  // ---------- propostas ----------
  app.post("/api/listings/:id/proposals", async (req, reply) => {
    const u = auth(req, reply); if (!u) return
    const p = z.object({ amountBrl: z.number().positive().max(1e10), message: z.string().trim().max(800).optional() }).safeParse(req.body)
    const l = db.prepare(`${LISTING_SELECT} WHERE l.id = ?`).get((req.params as any).id) as Row | undefined
    const live = l && db.prepare(`SELECT 1 FROM listings l WHERE l.id = ? AND l.status = 'publicado' AND (l.published_until IS NULL OR l.published_until > datetime('now'))`).get(l.id)
    if (!p.success || !l || !live) return bad(reply, "Anúncio indisponível ou proposta inválida.", 404)
    if (l.owner_id === u.id) return bad(reply, "Você não pode propor no seu próprio anúncio.", 409)
    const open = db.prepare("SELECT 1 FROM proposals WHERE listing_id = ? AND buyer_id = ? AND status IN ('enviada','contraproposta','aceita')").get(l.id, u.id)
    if (open) return bad(reply, "Você já tem uma proposta em andamento neste anúncio.", 409)
    const r = db.prepare("INSERT INTO proposals (listing_id,buyer_id,amount_brl,message) VALUES (?,?,?,?)").run(l.id, u.id, p.data.amountBrl, p.data.message ?? null)
    const seller = db.prepare("SELECT email FROM users WHERE id = ?").get(l.owner_id) as Row
    mail.proposalReceived(seller.email, l.title, money(p.data.amountBrl), Number(r.lastInsertRowid))
    return { id: Number(r.lastInsertRowid) }
  })

  app.post("/api/proposals/:id/respond", async (req, reply) => {
    const u = auth(req, reply); if (!u) return
    const p = z.object({ action: z.enum(["accept", "reject", "counter", "withdraw"]), amountBrl: z.number().positive().max(1e10).optional() }).safeParse(req.body)
    const pr = db.prepare("SELECT * FROM proposals WHERE id = ?").get((req.params as any).id) as Row | undefined
    if (!p.success || !pr) return bad(reply, "Proposta não encontrada.", 404)
    const l = db.prepare("SELECT * FROM listings WHERE id = ?").get(pr.listing_id) as Row
    const isSeller = l.owner_id === u.id, isBuyer = pr.buyer_id === u.id
    if (!isSeller && !isBuyer) return bad(reply, "Proposta não encontrada.", 404)
    const buyer = db.prepare("SELECT id,name,email FROM users WHERE id = ?").get(pr.buyer_id) as Row
    const seller = db.prepare("SELECT id,name,email FROM users WHERE id = ?").get(l.owner_id) as Row
    const set = (status: string, extra = "") => db.prepare(`UPDATE proposals SET status = ?, updated_at = CURRENT_TIMESTAMP${extra} WHERE id = ?`)
    const { action } = p.data

    // vendedor responde a "enviada"
    if (isSeller && pr.status === "enviada" && ["accept", "reject", "counter"].includes(action)) {
      if (action === "reject") { set("recusada").run("recusada", pr.id); mail.proposalUpdated(buyer.email, l.title, "recusada"); return { ok: true } }
      if (action === "counter") {
        if (!p.data.amountBrl) return bad(reply, "Informe o valor da contraproposta.")
        db.prepare("UPDATE proposals SET status='contraproposta', counter_amount_brl=?, updated_at=CURRENT_TIMESTAMP WHERE id=?").run(p.data.amountBrl, pr.id)
        mail.proposalUpdated(buyer.email, l.title, "respondida com contraproposta", money(p.data.amountBrl)); return { ok: true }
      }
      return acceptProposal(pr, l, seller, buyer, pr.amount_brl, reply)
    }
    // comprador responde a "contraproposta"
    if (isBuyer && pr.status === "contraproposta" && ["accept", "reject"].includes(action)) {
      if (action === "reject") { set("recusada").run("recusada", pr.id); mail.proposalUpdated(seller.email, l.title, "recusada pelo comprador"); return { ok: true } }
      return acceptProposal(pr, l, seller, buyer, pr.counter_amount_brl, reply)
    }
    // comprador retira
    if (isBuyer && action === "withdraw" && ["enviada", "contraproposta"].includes(pr.status)) {
      set("retirada").run("retirada", pr.id); mail.proposalUpdated(seller.email, l.title, "retirada pelo comprador"); return { ok: true }
    }
    return bad(reply, "Ação não permitida para o estado atual da proposta.", 409)
  })

  function acceptProposal(pr: Row, l: Row, seller: Row, buyer: Row, price: number, reply: any) {
    if (l.status !== "publicado") return bad(reply, "O anúncio não está mais disponível.", 409)
    db.exec("BEGIN")
    try {
      db.prepare("UPDATE proposals SET status='aceita', updated_at=CURRENT_TIMESTAMP WHERE id=?").run(pr.id)
      db.prepare("UPDATE listings SET status='em_negociacao', updated_at=CURRENT_TIMESTAMP WHERE id=?").run(l.id)
      const text = contractText(l, seller, buyer, price, pr.message)
      const sha = createHash("sha256").update(text).digest("hex")
      const r = db.prepare("INSERT INTO contracts (proposal_id,text,sha256,final_price_brl) VALUES (?,?,?,?)").run(pr.id, text, sha, price)
      db.exec("COMMIT")
      const cid = Number(r.lastInsertRowid)
      mail.contractReady(buyer.email, l.title, cid); mail.contractReady(seller.email, l.title, cid)
      return { ok: true, contractId: cid }
    } catch (e) { db.exec("ROLLBACK"); throw e }
  }

  // ---------- contratos ----------
  const loadContract = (id: any, uid: number) => {
    const c = db.prepare(`SELECT c.*, p.buyer_id, p.listing_id, l.owner_id AS seller_id, l.title AS listing_title FROM contracts c
      JOIN proposals p ON p.id = c.proposal_id JOIN listings l ON l.id = p.listing_id WHERE c.id = ?`).get(id) as Row | undefined
    if (!c || (c.buyer_id !== uid && c.seller_id !== uid)) return null
    return c
  }
  const toContract = (c: Row, uid: number) => ({
    id: c.id, status: c.status, text: c.text, sha256: c.sha256, finalPriceBrl: c.final_price_brl, listingId: c.listing_id, listingTitle: c.listing_title,
    role: c.buyer_id === uid ? "comprador" : "vendedor",
    buyerSignedAt: c.buyer_signed_at, sellerSignedAt: c.seller_signed_at, buyerConcludedAt: c.buyer_concluded_at, sellerConcludedAt: c.seller_concluded_at,
  })
  app.get("/api/contracts/:id", async (req, reply) => {
    const u = auth(req, reply); if (!u) return
    const c = loadContract((req.params as any).id, u.id); if (!c) return bad(reply, "Contrato não encontrado.", 404)
    return { contract: toContract(c, u.id) }
  })
  const otherParty = (c: Row, uid: number) => db.prepare("SELECT email FROM users WHERE id = ?").get(c.buyer_id === uid ? c.seller_id : c.buyer_id) as Row

  app.post("/api/contracts/:id/sign", async (req, reply) => {
    const u = auth(req, reply); if (!u) return
    const c = loadContract((req.params as any).id, u.id); if (!c) return bad(reply, "Contrato não encontrado.", 404)
    if (!["minuta", "parcialmente_assinado"].includes(c.status)) return bad(reply, "Este contrato não está aberto para assinatura.", 409)
    const col = c.buyer_id === u.id ? "buyer" : "seller"
    if (c[`${col}_signed_at`]) return bad(reply, "Você já assinou.", 409)
    db.prepare(`UPDATE contracts SET ${col}_signed_at = CURRENT_TIMESTAMP, ${col}_signed_ip = ? WHERE id = ?`).run(req.ip, c.id)
    const after = db.prepare("SELECT buyer_signed_at, seller_signed_at FROM contracts WHERE id = ?").get(c.id) as Row
    const both = !!(after.buyer_signed_at && after.seller_signed_at)
    db.prepare("UPDATE contracts SET status = ? WHERE id = ?").run(both ? "assinado" : "parcialmente_assinado", c.id)
    mail.contractSigned(otherParty(c, u.id).email, c.listing_title, c.id, both)
    if (both) mail.contractSigned(u.email, c.listing_title, c.id, true)
    return { ok: true, status: both ? "assinado" : "parcialmente_assinado" }
  })

  app.post("/api/contracts/:id/cancel", async (req, reply) => {
    const u = auth(req, reply); if (!u) return
    const c = loadContract((req.params as any).id, u.id); if (!c) return bad(reply, "Contrato não encontrado.", 404)
    if (c.status === "concluido" || c.status === "cancelado") return bad(reply, "Contrato não pode ser cancelado.", 409)
    db.exec("BEGIN")
    db.prepare("UPDATE contracts SET status='cancelado' WHERE id=?").run(c.id)
    db.prepare("UPDATE proposals SET status='retirada', updated_at=CURRENT_TIMESTAMP WHERE id=?").run(c.proposal_id)
    db.prepare("UPDATE listings SET status='publicado', updated_at=CURRENT_TIMESTAMP WHERE id=?").run(c.listing_id)
    db.exec("COMMIT")
    mail.proposalUpdated(otherParty(c, u.id).email, c.listing_title, "cancelada (contrato cancelado pela outra parte)")
    return { ok: true }
  })

  app.post("/api/contracts/:id/conclude", async (req, reply) => {
    const u = auth(req, reply); if (!u) return
    const c = loadContract((req.params as any).id, u.id); if (!c) return bad(reply, "Contrato não encontrado.", 404)
    if (!["assinado"].includes(c.status)) return bad(reply, "Só é possível confirmar a conclusão de contratos assinados pelas duas partes.", 409)
    const col = c.buyer_id === u.id ? "buyer" : "seller"
    if (c[`${col}_concluded_at`]) return bad(reply, "Você já confirmou.", 409)
    db.prepare(`UPDATE contracts SET ${col}_concluded_at = CURRENT_TIMESTAMP WHERE id = ?`).run(c.id)
    const after = db.prepare("SELECT buyer_concluded_at, seller_concluded_at FROM contracts WHERE id = ?").get(c.id) as Row
    if (after.buyer_concluded_at && after.seller_concluded_at) {
      db.exec("BEGIN")
      db.prepare("UPDATE contracts SET status='concluido' WHERE id=?").run(c.id)
      db.prepare("UPDATE listings SET status='vendido', updated_at=CURRENT_TIMESTAMP WHERE id=?").run(c.listing_id)
      if (PLATFORM_FEE_PCT > 0) {
        db.prepare("INSERT OR IGNORE INTO commissions (contract_id,pct,amount_brl) VALUES (?,?,?)").run(c.id, PLATFORM_FEE_PCT, +(c.final_price_brl * PLATFORM_FEE_PCT / 100).toFixed(2))
      }
      db.exec("COMMIT")
      createDealCertificate({ contractId: c.id, listingId: c.listing_id, buyerId: c.buyer_id, contractSha: c.sha256 })
      mail.dealConcluded(u.email, c.listing_title); mail.dealConcluded(otherParty(c, u.id).email, c.listing_title)
      return { ok: true, status: "concluido" }
    }
    return { ok: true, status: "assinado" }
  })

  // ---------- painel do usuário ----------
  app.get("/api/me/overview", async (req, reply) => {
    const u = auth(req, reply); if (!u) return
    const listings = db.prepare(`${LISTING_SELECT} WHERE l.owner_id = ? ORDER BY l.id DESC`).all(u.id) as Row[]
    const received = db.prepare(`SELECT p.*, l.title AS listing_title, b.name AS buyer_name, c.id AS contract_id FROM proposals p JOIN listings l ON l.id = p.listing_id JOIN users b ON b.id = p.buyer_id
      LEFT JOIN contracts c ON c.proposal_id = p.id WHERE l.owner_id = ? ORDER BY p.id DESC`).all(u.id) as Row[]
    const sent = db.prepare(`SELECT p.*, l.title AS listing_title, c.id AS contract_id FROM proposals p JOIN listings l ON l.id = p.listing_id LEFT JOIN contracts c ON c.proposal_id = p.id WHERE p.buyer_id = ? ORDER BY p.id DESC`).all(u.id) as Row[]
    const map = (r: Row) => ({ id: r.id, listingId: r.listing_id, listingTitle: r.listing_title, amountBrl: r.amount_brl, counterAmountBrl: r.counter_amount_brl, message: r.message, status: r.status, buyerName: r.buyer_name, contractId: r.contract_id, createdAt: r.created_at })
    const creci = (db.prepare("SELECT creci FROM users WHERE id = ?").get(u.id) as Row)?.creci ?? null
    return { creci, listings: listings.map(toListing), received: received.map(map), sent: sent.map(map) }
  })

  // ---------- fotos (guardadas no próprio banco; o navegador reduz a imagem antes de enviar) ----------
  app.addContentTypeParser("image/jpeg", { parseAs: "buffer", bodyLimit: 1_200_000 }, (_req, body, done) => done(null, body))
  const MAX_PHOTOS = 8
  app.post("/api/listings/:id/photos", async (req, reply) => {
    const u = auth(req, reply); if (!u) return
    const l = db.prepare("SELECT id FROM listings WHERE id = ? AND owner_id = ?").get((req.params as any).id, u.id)
    if (!l) return bad(reply, "Anúncio não encontrado.", 404)
    const buf = req.body as Buffer
    if (!Buffer.isBuffer(buf) || buf.length < 1000 || buf.length > 1_100_000) return bad(reply, "Imagem inválida ou grande demais (máx. 1 MB).")
    if (!(buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff)) return bad(reply, "Envie uma imagem JPEG.")
    const n = (db.prepare("SELECT COUNT(*) n FROM listing_photos WHERE listing_id = ?").get((l as Row).id) as Row).n
    if (n >= MAX_PHOTOS) return bad(reply, `Máximo de ${MAX_PHOTOS} fotos por anúncio.`, 409)
    const r = db.prepare("INSERT INTO listing_photos (listing_id, mime, data, position) VALUES (?,?,?,?)").run((l as Row).id, "image/jpeg", buf, n)
    return { id: Number(r.lastInsertRowid) }
  })
  app.delete("/api/photos/:id", async (req, reply) => {
    const u = auth(req, reply); if (!u) return
    const ph = db.prepare("SELECT p.id FROM listing_photos p JOIN listings l ON l.id = p.listing_id WHERE p.id = ? AND l.owner_id = ?").get((req.params as any).id, u.id)
    if (!ph) return bad(reply, "Foto não encontrada.", 404)
    db.prepare("DELETE FROM listing_photos WHERE id = ?").run((ph as Row).id)
    return { ok: true }
  })
  app.get("/api/photos/:id", async (req, reply) => {
    const ph = db.prepare("SELECT mime, data FROM listing_photos WHERE id = ?").get((req.params as any).id) as Row | undefined
    if (!ph) return reply.code(404).send()
    return reply.header("content-type", ph.mime).header("cache-control", "public, max-age=86400, immutable").send(ph.data)
  })

  // ---------- administração (ADMIN_TOKEN) ----------
  app.get("/api/admin/commissions", async (req, reply) => {
    if (!adminOk(req, reply)) return
    return { platformFeePct: PLATFORM_FEE_PCT, items: db.prepare("SELECT * FROM commissions ORDER BY id DESC LIMIT 200").all() }
  })
  app.post("/api/admin/commissions/:id/paid", async (req, reply) => {
    if (!adminOk(req, reply)) return
    db.prepare("UPDATE commissions SET status='paga', paid_at=CURRENT_TIMESTAMP WHERE id=?").run((req.params as any).id)
    return { ok: true }
  })
  app.get("/api/admin/outbox", async (req, reply) => {
    if (!adminOk(req, reply)) return
    return { resend: !!process.env.RESEND_API_KEY, items: db.prepare("SELECT id,to_email,subject,status,attempts,last_error,created_at,sent_at FROM email_outbox ORDER BY id DESC LIMIT 100").all() }
  })
  app.post("/api/admin/outbox/flush", async (req, reply) => {
    if (!adminOk(req, reply)) return
    return await flushOutbox()
  })
}
