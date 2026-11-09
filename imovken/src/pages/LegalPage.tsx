import { useState } from "react"
import { api, session, useMe } from "../api"
import { LEGAL_DOCS, LEGAL_VERSIONS, UPDATED } from "../legal/documents"
import { AppShell, Button, navigate } from "../ui"

export default function LegalPage({ docId }: { docId: string }) {
  const doc = LEGAL_DOCS.find((d) => d.id === docId)
  if (!doc) {
    return (
      <AppShell title="Documento não encontrado" subtitle="IMOVKEN">
        <div className="profile-body"><Button onClick={() => navigate("/")}>Voltar ao início</Button></div>
      </AppShell>
    )
  }
  return (
    <AppShell title={doc.title} subtitle={`VERSÃO ${doc.version} · ATUALIZADO EM ${UPDATED.toUpperCase()}`}>
      <div className="profile-body legal-body">
        <nav className="legal-tabs">
          {LEGAL_DOCS.map((d) => (
            <button key={d.id} className={d.id === doc.id ? "active" : ""} onClick={() => navigate(`/${d.id === "adesao" ? "contrato-adesao" : d.id}`)}>{d.title}</button>
          ))}
        </nav>
        <p className="legal-summary">{doc.summary}</p>
        {doc.sections.map((s) => (
          <section key={s.title} className="legal-section">
            <h2>{s.title}</h2>
            {s.body.map((p, i) => <p key={i}>{p}</p>)}
          </section>
        ))}
      </div>
    </AppShell>
  )
}

export function legalPathToId(path: string) {
  const p = path.replace(/^\//, "")
  return p === "contrato-adesao" ? "adesao" : p
}

// Aceite dos documentos (usado no cadastro e quando sai uma versão nova)
export function AcceptBox({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="accept-box">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        Tenho 18 anos ou mais e li e aceito os{" "}
        <a href="/termos" target="_blank" rel="noreferrer">Termos de Uso</a>, a{" "}
        <a href="/privacidade" target="_blank" rel="noreferrer">Política de Privacidade</a>, o{" "}
        <a href="/contrato-adesao" target="_blank" rel="noreferrer">Contrato de Adesão</a> e o{" "}
        <a href="/riscos" target="_blank" rel="noreferrer">Aviso de Riscos</a>.
      </span>
    </label>
  )
}

// Aparece sobre qualquer página quando o usuário logado ainda não aceitou a versão vigente
export function ConsentGate() {
  const { user } = useMe()
  const [ok, setOk] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState("")
  if (!user || !user.needsAcceptance || user.needsAcceptance.length === 0) return null

  async function accept() {
    setBusy(true); setErr("")
    try {
      await api("/api/legal/accept", { method: "POST", body: JSON.stringify({ accept: LEGAL_VERSIONS }) })
      session.set({ ...user!, needsAcceptance: [] })
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="report-overlay" role="dialog" aria-modal="true">
      <div className="auth-card consent-card">
        <h2>Atualizamos nossos documentos</h2>
        <p className="auth-note">Para continuar usando a conta, confirme o aceite das versões vigentes.</p>
        <AcceptBox checked={ok} onChange={setOk} />
        {err && <div className="form-error">{err}</div>}
        <button className="btn btn-primary" disabled={!ok || busy} onClick={accept}><span>{busy ? "Aguarde..." : "Aceitar e continuar"}</span></button>
        <button className="link-btn" onClick={() => session.logout()}>Sair da conta</button>
      </div>
    </div>
  )
}
