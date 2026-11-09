import type { FastifyInstance } from "fastify"
import { createHash, randomBytes } from "node:crypto"
import { z } from "zod"
import { db } from "./db.ts"
import { mail } from "./mail.ts"

type Row = Record<string, any>
type Ctx = { currentUser: (req: any) => { id: number; name: string; email: string; role: string } | null; bad: (reply: any, msg: string, code?: number) => any }
const sha = (s: string) => createHash("sha256").update(s).digest("hex")
const ZERO = "0".repeat(64)
const TYPES = ["apartamento", "casa", "terreno", "comercial", "rural", "outro"] as const
const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
const newCode = () => Array.from(randomBytes(10), (b) => ALPHA[b % ALPHA.length]).join("")

// ---- trilha de eventos encadeada por hash (qualquer alteração posterior quebra a cadeia) ----
function addEvent(certId: number, type: string, payload: Record<string, any> = {}) {
  const last = db.prepare("SELECT seq, hash FROM certificate_events WHERE certificate_id = ? ORDER BY seq DESC LIMIT 1").get(certId) as Row | undefined
  const seq = (last?.seq ?? 0) + 1, prev = last?.hash ?? ZERO
  const createdAt = new Date().toISOString()
  const body = JSON.stringify(payload)
  const hash = sha(`${prev}|${seq}|${type}|${body}|${createdAt}`)
  db.prepare("INSERT INTO certificate_events (certificate_id,seq,type,payload,prev_hash,hash,created_at) VALUES (?,?,?,?,?,?,?)").run(certId, seq, type, body, prev, hash, createdAt)
  return hash
}
function verifyChain(certId: number) {
  const ev = db.prepare("SELECT * FROM certificate_events WHERE certificate_id = ? ORDER BY seq").all(certId) as Row[]
  let prev = ZERO
  for (const e of ev) {
    if (e.prev_hash !== prev || sha(`${prev}|${e.seq}|${e.type}|${e.payload}|${e.created_at}`) !== e.hash) return { valid: false, events: ev }
    prev = e.hash
  }
  return { valid: true, events: ev }
}

// ---- hash do dossiê: é ele que o certificado on-chain guarda ----
export function dossierHash(c: Row) {
  const docs = (db.prepare("SELECT label, sha256 FROM certificate_docs WHERE certificate_id = ? ORDER BY id").all(c.id) as Row[]).map((d) => ({ label: d.label, sha256: d.sha256 }))
  const last = db.prepare("SELECT hash FROM certificate_events WHERE certificate_id = ? ORDER BY seq DESC LIMIT 1").get(c.id) as Row | undefined
  const canon = JSON.stringify({
    code: c.code, kind: c.kind, title: c.title, type: c.type, city: c.city, state: c.state, areaM2: c.area_m2 ?? null,
    matriculaHash: sha(`${c.matricula ?? ""}|${c.cartorio ?? ""}|${c.code}`), docs, lastEventHash: last?.hash ?? ZERO,
  })
  return "0x" + sha(canon)
}

const mine = (c: Row) => ({
  id: c.id, code: c.code, kind: c.kind, title: c.title, type: c.type, city: c.city, state: c.state, neighborhood: c.neighborhood, areaM2: c.area_m2,
  cartorio: c.cartorio, matricula: c.matricula, status: c.status, createdAt: c.created_at, issuedAt: c.issued_at, listingId: c.listing_id, contractId: c.contract_id,
  docs: (db.prepare("SELECT id, label, filename, size, sha256, created_at AS createdAt FROM certificate_docs WHERE certificate_id = ? ORDER BY id").all(c.id) as Row[]),
  onchain: c.onchain_tx ? { chain: c.onchain_chain, contract: c.onchain_contract, tokenId: c.onchain_token_id, tx: c.onchain_tx, holder: c.onchain_holder } : null,
})

// Chamada pelo fechamento do contrato (market.ts): abre o certificado do comprador
export function createDealCertificate(p: { contractId: number; listingId: number; buyerId: number; contractSha: string }) {
  if (db.prepare("SELECT 1 FROM certificates WHERE contract_id = ?").get(p.contractId)) return
  const l = db.prepare("SELECT * FROM listings WHERE id = ?").get(p.listingId) as Row
  const buyer = db.prepare("SELECT email FROM users WHERE id = ?").get(p.buyerId) as Row
  const code = newCode()
  const r = db.prepare(`INSERT INTO certificates (code,kind,holder_user_id,listing_id,contract_id,title,type,city,state,neighborhood,area_m2)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(code, "venda", p.buyerId, l.id, p.contractId, l.title, l.type, l.city, l.state, l.neighborhood ?? null, l.area_m2 ?? null)
  const id = Number(r.lastInsertRowid)
  addEvent(id, "negocio_concluido", { contractSha256: p.contractSha, listingId: l.id })
  mail.certificateStarted(buyer.email, l.title)
}

export function registerCertificates(app: FastifyInstance, { currentUser, bad }: Ctx) {
  const auth = (req: any, reply: any) => { const u = currentUser(req); if (!u) bad(reply, "Faça login para continuar.", 401); return u }
  const adminOk = (req: any, reply: any) => {
    const t = process.env.ADMIN_TOKEN
    if (!t) { reply.code(503).send({ error: "ADMIN_TOKEN não configurado no servidor." }); return false }
    if (req.headers["x-admin-token"] !== t) { reply.code(401).send({ error: "Não autorizado." }); return false }
    return true
  }

  // Certificar um imóvel próprio (sem venda)
  const createBody = z.object({
    title: z.string().trim().min(5).max(120), type: z.enum(TYPES), city: z.string().trim().min(2).max(80), state: z.string().trim().length(2),
    neighborhood: z.string().trim().max(120).optional(), areaM2: z.number().positive().max(1e6).optional(),
    matricula: z.string().trim().min(3).max(40), cartorio: z.string().trim().min(3).max(120), declaresOwnership: z.literal(true),
  })
  app.post("/api/certificates", async (req, reply) => {
    const u = auth(req, reply); if (!u) return
    const p = createBody.safeParse(req.body)
    if (!p.success) return bad(reply, "Dados inválidos. Confirme a declaração de titularidade.")
    const d = p.data
    const code = newCode()
    const r = db.prepare(`INSERT INTO certificates (code,kind,holder_user_id,title,type,city,state,neighborhood,area_m2,cartorio,matricula)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(code, "proprio", u.id, d.title, d.type, d.city, d.state.toUpperCase(), d.neighborhood ?? null, d.areaM2 ?? null, d.cartorio, d.matricula)
    addEvent(Number(r.lastInsertRowid), "solicitado", { kind: "proprio" })
    return { id: Number(r.lastInsertRowid), code }
  })

  app.get("/api/me/certificates", async (req, reply) => {
    const u = auth(req, reply); if (!u) return
    const rows = db.prepare("SELECT * FROM certificates WHERE holder_user_id = ? ORDER BY id DESC").all(u.id) as Row[]
    return { items: rows.map(mine) }
  })

  // Completa matrícula/cartório (certificados de venda) enquanto em análise
  app.patch("/api/certificates/:id", async (req, reply) => {
    const u = auth(req, reply); if (!u) return
    const p = z.object({ matricula: z.string().trim().min(3).max(40), cartorio: z.string().trim().min(3).max(120) }).safeParse(req.body)
    const c = db.prepare("SELECT * FROM certificates WHERE id = ? AND holder_user_id = ?").get((req.params as any).id, u.id) as Row | undefined
    if (!p.success || !c) return bad(reply, "Certificado não encontrado ou dados inválidos.", 404)
    if (c.status !== "em_analise") return bad(reply, "Só é possível alterar enquanto o certificado está em análise.", 409)
    db.prepare("UPDATE certificates SET matricula = ?, cartorio = ? WHERE id = ?").run(p.data.matricula, p.data.cartorio, c.id)
    addEvent(c.id, "dados_registrais_informados", {})
    return { ok: true }
  })

  // O arquivo NUNCA é enviado: o navegador calcula o SHA-256 e manda só a impressão digital.
  app.post("/api/certificates/:id/docs", async (req, reply) => {
    const u = auth(req, reply); if (!u) return
    const p = z.object({ label: z.string().trim().min(2).max(60), filename: z.string().max(120).optional(), size: z.number().int().min(0).max(5e9).optional(), sha256: z.string().regex(/^[0-9a-f]{64}$/) }).safeParse(req.body)
    const c = db.prepare("SELECT * FROM certificates WHERE id = ? AND holder_user_id = ?").get((req.params as any).id, u.id) as Row | undefined
    if (!p.success || !c) return bad(reply, "Certificado não encontrado ou dados inválidos.", 404)
    if (["revogado"].includes(c.status)) return bad(reply, "Certificado revogado.", 409)
    if ((db.prepare("SELECT COUNT(*) n FROM certificate_docs WHERE certificate_id = ?").get(c.id) as Row).n >= 20) return bad(reply, "Máximo de 20 documentos.", 409)
    db.prepare("INSERT INTO certificate_docs (certificate_id,label,filename,size,sha256) VALUES (?,?,?,?,?)").run(c.id, p.data.label, p.data.filename ?? null, p.data.size ?? null, p.data.sha256)
    addEvent(c.id, "documento_registrado", { label: p.data.label, sha256: p.data.sha256 })
    return { ok: true }
  })

  // ---------- consulta pública (sem login) ----------
  app.get("/api/certificates/public/:code", async (req, reply) => {
    const c = db.prepare("SELECT c.*, u.name AS holder_name FROM certificates c JOIN users u ON u.id = c.holder_user_id WHERE c.code = ?").get(String((req.params as any).code).toUpperCase()) as Row | undefined
    if (!c) return bad(reply, "Certificado não encontrado.", 404)
    const { valid, events } = verifyChain(c.id)
    const initials = String(c.holder_name).split(/\s+/).filter(Boolean).map((w) => w[0].toUpperCase() + ".").join(" ")
    return {
      code: c.code, status: c.status, kind: c.kind, title: c.title, type: c.type, city: c.city, state: c.state, areaM2: c.area_m2, issuedAt: c.issued_at,
      holder: initials, matriculaHash: c.matricula ? sha(`${c.matricula}|${c.cartorio ?? ""}|${c.code}`) : null,
      docs: (db.prepare("SELECT label, sha256 FROM certificate_docs WHERE certificate_id = ? ORDER BY id").all(c.id) as Row[]),
      events: events.map((e) => ({ seq: e.seq, type: e.type, at: e.created_at, hash: e.hash })), chainValid: valid,
      dossierHash: dossierHash(c), anchoredDossierHash: c.anchored_dossier_hash,
      onchain: c.onchain_tx ? { chain: c.onchain_chain, contract: c.onchain_contract, tokenId: c.onchain_token_id, tx: c.onchain_tx, holder: c.onchain_holder } : null,
    }
  })

  // ---------- administração ----------
  app.get("/api/admin/certificates", async (req, reply) => {
    if (!adminOk(req, reply)) return
    const q = z.object({ status: z.string().optional() }).parse(req.query)
    const rows = (q.status ? db.prepare("SELECT c.*, u.email AS holder_email, u.name AS holder_name FROM certificates c JOIN users u ON u.id = c.holder_user_id WHERE c.status = ? ORDER BY c.id DESC").all(q.status)
      : db.prepare("SELECT c.*, u.email AS holder_email, u.name AS holder_name FROM certificates c JOIN users u ON u.id = c.holder_user_id ORDER BY c.id DESC LIMIT 100").all()) as Row[]
    return { items: rows.map((c) => ({ ...mine(c), holderEmail: c.holder_email, holderName: c.holder_name, dossierHash: dossierHash(c), chainValid: verifyChain(c.id).valid })) }
  })
  const adm = (path: string, fn: (c: Row, body: any, reply: any) => any) =>
    app.post(path, async (req, reply) => {
      if (!adminOk(req, reply)) return
      const c = db.prepare("SELECT * FROM certificates WHERE id = ?").get((req.params as any).id) as Row | undefined
      if (!c) return reply.code(404).send({ error: "Certificado não encontrado." })
      return fn(c, req.body || {}, reply)
    })
  adm("/api/admin/certificates/:id/issue", (c, body, reply) => {
    if (c.status !== "em_analise") return reply.code(409).send({ error: "Só certificados em análise podem ser emitidos." })
    const docs = (db.prepare("SELECT COUNT(*) n FROM certificate_docs WHERE certificate_id = ?").get(c.id) as Row).n
    if (!c.matricula || !c.cartorio || docs < 1) return reply.code(422).send({ error: "Faltam matrícula, cartório ou documentos (mínimo 1)." })
    db.prepare("UPDATE certificates SET status='emitido', issued_at=CURRENT_TIMESTAMP, note=? WHERE id=?").run(String(body.note ?? "").slice(0, 300) || null, c.id)
    addEvent(c.id, "emitido", { note: String(body.note ?? "").slice(0, 300) })
    const u = db.prepare("SELECT email FROM users WHERE id = ?").get(c.holder_user_id) as Row
    mail.certificateIssued(u.email, c.title, c.code)
    return { ok: true, dossierHash: dossierHash(db.prepare("SELECT * FROM certificates WHERE id = ?").get(c.id) as Row) }
  })
  adm("/api/admin/certificates/:id/anchor", (c, body, reply) => {
    const p = z.object({ chain: z.enum(["sepolia", "ethereum"]), contract: z.string().regex(/^0x[0-9a-fA-F]{40}$/), tokenId: z.string().regex(/^\d{1,30}$/), tx: z.string().regex(/^0x[0-9a-fA-F]{64}$/), holder: z.string().regex(/^0x[0-9a-fA-F]{40}$/) }).safeParse(body)
    if (!p.success) return reply.code(400).send({ error: "Dados on-chain inválidos." })
    if (!["emitido", "ancorado"].includes(c.status)) return reply.code(409).send({ error: "Emita o certificado antes de registrar on-chain." })
    const dh = dossierHash(c)
    db.prepare("UPDATE certificates SET status='ancorado', onchain_chain=?, onchain_contract=?, onchain_token_id=?, onchain_tx=?, onchain_holder=?, anchored_dossier_hash=? WHERE id=?")
      .run(p.data.chain, p.data.contract, p.data.tokenId, p.data.tx, p.data.holder, dh, c.id)
    addEvent(c.id, "registrado_on_chain", { chain: p.data.chain, tokenId: p.data.tokenId, tx: p.data.tx })
    return { ok: true }
  })
  adm("/api/admin/certificates/:id/reassign", (c, body, reply) => {
    const p = z.object({ email: z.string().email(), note: z.string().max(300).optional() }).safeParse(body)
    if (!p.success) return reply.code(400).send({ error: "Informe o e-mail do novo titular." })
    const nu = db.prepare("SELECT id FROM users WHERE email = ?").get(p.data.email.toLowerCase()) as Row | undefined
    if (!nu) return reply.code(404).send({ error: "Usuário não encontrado." })
    db.prepare("UPDATE certificates SET holder_user_id = ? WHERE id = ?").run(nu.id, c.id)
    addEvent(c.id, "titular_alterado", { note: p.data.note ?? "" })
    return { ok: true }
  })
  adm("/api/admin/certificates/:id/revoke", (c, body, reply) => {
    const motivo = String(body.reason ?? "").slice(0, 300)
    if (!motivo) return reply.code(400).send({ error: "Informe o motivo." })
    db.prepare("UPDATE certificates SET status='revogado' WHERE id=?").run(c.id)
    addEvent(c.id, "revogado", { motivo })
    return { ok: true }
  })
}
