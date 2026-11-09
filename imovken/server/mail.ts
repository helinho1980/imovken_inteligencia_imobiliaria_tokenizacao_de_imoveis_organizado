import { db } from "./db.ts"

// E-mails automáticos: tudo entra numa fila (email_outbox) e é enviado pelo Resend (https://resend.com).
// Sem RESEND_API_KEY os e-mails ficam "pendente" na fila (nada se perde) e são enviados quando a chave for configurada.
const FROM = process.env.MAIL_FROM || "IMOVKEN <nao-responder@imovken.com.br>"
const SITE = process.env.SITE_URL || "https://www.imovken.com.br"
const esc = (s: string) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!))

function layout(title: string, bodyHtml: string, cta?: { label: string; path: string }) {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:auto;color:#151a22">
  <div style="padding:18px 0;border-bottom:3px solid #ff6a00;font-weight:700;letter-spacing:.2em">IMOVKEN</div>
  <h2 style="margin:22px 0 12px">${esc(title)}</h2>
  <div style="font-size:14px;line-height:1.6;color:#2b323d">${bodyHtml}</div>
  ${cta ? `<p style="margin:24px 0"><a href="${SITE}${cta.path}" style="background:#ff6a00;color:#0a0d12;text-decoration:none;font-weight:700;padding:12px 20px;display:inline-block">${esc(cta.label)}</a></p>` : ""}
  <p style="font-size:11px;color:#737b89;border-top:1px solid #dde1e7;padding-top:12px">Mensagem automática da IMOVKEN. As informações da plataforma não constituem recomendação de investimento. Dúvidas: contato@imovken.com.br</p></div>`
}

async function sendOne(row: { id: number; to_email: string; subject: string; html: string }) {
  const key = process.env.RESEND_API_KEY
  if (!key) return
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [row.to_email], subject: row.subject, html: row.html }),
    })
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`)
    db.prepare("UPDATE email_outbox SET status='enviado', sent_at=CURRENT_TIMESTAMP, attempts=attempts+1, last_error=NULL WHERE id=?").run(row.id)
  } catch (e: any) {
    db.prepare("UPDATE email_outbox SET attempts=attempts+1, last_error=?, status=CASE WHEN attempts+1>=5 THEN 'falhou' ELSE 'pendente' END WHERE id=?").run(String(e?.message || e).slice(0, 300), row.id)
  }
}

export function queueEmail(to: string, subject: string, title: string, bodyHtml: string, cta?: { label: string; path: string }) {
  const r = db.prepare("INSERT INTO email_outbox (to_email, subject, html) VALUES (?,?,?)").run(to, subject, layout(title, bodyHtml, cta))
  const id = Number(r.lastInsertRowid)
  queueMicrotask(() => { void sendOne({ id, to_email: to, subject, html: layout(title, bodyHtml, cta) }) })
}

export async function flushOutbox() {
  if (!process.env.RESEND_API_KEY) return { sent: 0, pending: (db.prepare("SELECT COUNT(*) n FROM email_outbox WHERE status='pendente'").get() as any).n }
  const rows = db.prepare("SELECT id,to_email,subject,html FROM email_outbox WHERE status='pendente' AND attempts<5 ORDER BY id LIMIT 20").all() as any[]
  for (const r of rows) await sendOne(r)
  return { sent: rows.length, pending: (db.prepare("SELECT COUNT(*) n FROM email_outbox WHERE status='pendente'").get() as any).n }
}
setInterval(() => { void flushOutbox() }, 30_000).unref()

export const mail = {
  welcome: (to: string, name: string) =>
    queueEmail(to, "Bem-vindo(a) à IMOVKEN", `Olá, ${name.split(" ")[0]}!`, "<p>Sua conta foi criada. Explore o mapa do território, veja imóveis anunciados e gere relatórios por região.</p>", { label: "Abrir o mapa", path: "/territorio" }),
  proposalReceived: (to: string, listing: string, amount: string, id: number) =>
    queueEmail(to, "Nova proposta no seu anúncio", "Você recebeu uma proposta", `<p>Anúncio: <b>${esc(listing)}</b><br>Valor proposto: <b>${esc(amount)}</b></p>`, { label: "Ver e responder", path: "/painel" }),
  proposalUpdated: (to: string, listing: string, status: string, amount?: string) =>
    queueEmail(to, `Sua proposta foi ${status}`, `Proposta ${status}`, `<p>Anúncio: <b>${esc(listing)}</b>${amount ? `<br>Valor: <b>${esc(amount)}</b>` : ""}</p>`, { label: "Abrir painel", path: "/painel" }),
  contractReady: (to: string, listing: string, contractId: number) =>
    queueEmail(to, "Minuta de contrato disponível", "Minuta pronta para leitura", `<p>A proposta do imóvel <b>${esc(listing)}</b> foi aceita. A minuta do contrato está disponível para leitura e aceite eletrônico.</p>`, { label: "Ver minuta", path: `/contrato/${contractId}` }),
  contractSigned: (to: string, listing: string, contractId: number, both: boolean) =>
    queueEmail(to, both ? "Contrato assinado pelas duas partes" : "A outra parte assinou a minuta", both ? "Contrato assinado" : "Falta a sua assinatura", `<p>Imóvel: <b>${esc(listing)}</b></p><p>${both ? "As duas partes aceitaram a minuta. A transferência da propriedade exige os atos legais (escritura e registro, quando aplicável)." : "A outra parte já aceitou a minuta. Leia e assine para avançar."}</p>`, { label: "Abrir contrato", path: `/contrato/${contractId}` }),
  listingPublished: (to: string, listing: string, days: number, id: number) =>
    queueEmail(to, "Pagamento confirmado: anúncio publicado", "Seu anúncio está no ar", `<p>Recebemos o pagamento e o anúncio <b>${esc(listing)}</b> ficará publicado por ${days} dias.</p>`, { label: "Ver anúncio", path: `/imovel/${id}` }),
  certificateStarted: (to: string, title: string) =>
    queueEmail(to, "Certificado digital do imóvel iniciado", "Complete o seu certificado", `<p>O negócio do imóvel <b>${esc(title)}</b> foi concluído. Para emitir o certificado digital, informe a matrícula e o cartório e anexe os documentos (o arquivo não sai do seu computador, só a impressão digital dele).</p>`, { label: "Abrir painel", path: "/painel" }),
  certificateIssued: (to: string, title: string, code: string) =>
    queueEmail(to, "Certificado digital emitido", "Certificado emitido", `<p>O certificado digital do imóvel <b>${esc(title)}</b> foi emitido. Ele registra a existência e o histórico do imóvel na IMOVKEN e não substitui a matrícula no cartório.</p>`, { label: "Ver certificado", path: `/certificado/${code}` }),
  dealConcluded: (to: string, listing: string) =>
    queueEmail(to, "Negócio concluído", "Negócio concluído", `<p>As duas partes confirmaram a conclusão do negócio do imóvel <b>${esc(listing)}</b>. Obrigado por usar a IMOVKEN.</p>`, { label: "Abrir painel", path: "/painel" }),
}
