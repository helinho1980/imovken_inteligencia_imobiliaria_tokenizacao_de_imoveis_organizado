import { useState } from "react"
import { CERT_STATUS } from "../api"
import { AppShell } from "../ui"

async function call(token: string, method: string, path: string, body?: any) {
  const r = await fetch(path, { method, headers: { "content-type": "application/json", "x-admin-token": token }, body: body ? JSON.stringify(body) : undefined })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.error || `Erro ${r.status}`)
  return j
}

export default function AdminCertificatesPage() {
  const [token, setToken] = useState("")
  const [items, setItems] = useState<any[]>([])
  const [msg, setMsg] = useState("")
  const [anchor, setAnchor] = useState<Record<number, any>>({})
  const load = async () => { try { setItems((await call(token, "GET", "/api/admin/certificates")).items); setMsg("") } catch (e: any) { setMsg(e.message) } }
  async function act(path: string, body?: any) { try { await call(token, "POST", path, body); await load() } catch (e: any) { setMsg(e.message) } }

  return (
    <AppShell title="Administração de certificados" subtitle="USO INTERNO">
      <div className="profile-body">
        <div className="auth-card wide">
          <label>Senha de administrador (ADMIN_TOKEN)<input type="password" value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" /></label>
          <button className="btn btn-primary" disabled={!token} onClick={load}><span>Carregar certificados</span></button>
          {msg && <div className="form-error">{msg}</div>}
        </div>
        {items.map((c) => (
          <div key={c.id} className="auth-card wide">
            <h2>#{c.id} · {c.title} <small>({CERT_STATUS[c.status]})</small></h2>
            <p className="auth-note">Código <b>{c.code}</b> · titular {c.holderName} ({c.holderEmail}) · {c.city}/{c.state} · origem: {c.kind} · histórico {c.chainValid ? "íntegro" : "ADULTERADO"}</p>
            <p className="auth-note">Matrícula: <b>{c.matricula || "—"}</b> · Cartório: <b>{c.cartorio || "—"}</b></p>
            {c.docs.map((d: any) => <div key={d.id} className="hash-row"><b>{d.label}</b> <small>{d.filename}</small><code>{d.sha256}</code></div>)}
            <p className="auth-note">Hash do dossiê (vai no contrato ao emitir): <code>{c.dossierHash}</code></p>
            <div className="profile-cta">
              {c.status === "em_analise" && <button className="btn btn-primary" onClick={() => act(`/api/admin/certificates/${c.id}/issue`, { note: window.prompt("Observação da conferência (opcional):") || "" })}><span>Emitir certificado</span></button>}
              {c.status !== "revogado" && <button className="btn btn-secondary" onClick={() => { const r = window.prompt("Motivo da revogação:"); if (r) act(`/api/admin/certificates/${c.id}/revoke`, { reason: r }) }}><span>Revogar</span></button>}
              {c.status !== "revogado" && <button className="btn btn-secondary" onClick={() => { const e = window.prompt("E-mail do novo titular (após novo registro em cartório):"); if (e) act(`/api/admin/certificates/${c.id}/reassign`, { email: e, note: "Novo registro comprovado" }) }}><span>Trocar titular</span></button>}
            </div>
            {["emitido", "ancorado"].includes(c.status) && (
              <div className="row2">
                {(["chain", "contract", "tokenId", "tx", "holder"] as const).map((k) => (
                  <label key={k}>{{ chain: "Rede (sepolia ou ethereum)", contract: "Endereço do contrato", tokenId: "Token ID", tx: "Hash da transação", holder: "Carteira do titular" }[k]}
                    <input value={anchor[c.id]?.[k] ?? ""} onChange={(e) => setAnchor({ ...anchor, [c.id]: { ...anchor[c.id], [k]: e.target.value.trim() } })} /></label>
                ))}
                <button className="btn btn-secondary" onClick={() => act(`/api/admin/certificates/${c.id}/anchor`, anchor[c.id])}><span>Gravar registro on-chain</span></button>
              </div>
            )}
          </div>
        ))}
      </div>
    </AppShell>
  )
}
