import { useState } from "react"
import { api, ROLE_LABELS, session } from "../api"
import { Header, Eyebrow, navigate } from "../ui"
import { AcceptBox } from "./LegalPage"
import { LEGAL_VERSIONS } from "../legal/documents"

export default function AuthPage({ mode }: { mode: "entrar" | "cadastro" }) {
  const params = new URLSearchParams(window.location.search)
  const initialRole = Object.keys(ROLE_LABELS).includes(params.get("perfil") || "") ? params.get("perfil")! : "entusiasta"
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState(initialRole)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const signup = mode === "cadastro"

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError("")
    try {
      const body = signup ? { name, email, password, role, age18: true, accept: LEGAL_VERSIONS } : { email, password }
      const d = await api<{ user: any }>(`/api/auth/${signup ? "register" : "login"}`, { method: "POST", body: JSON.stringify(body) })
      session.set(d.user)
      navigate("/territorio")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="app-page">
      <Header app />
      <div className="auth-wrap">
        <form className="auth-card" onSubmit={submit}>
          <Eyebrow>{signup ? "CRIAR CONTA" : "ACESSO"}</Eyebrow>
          <h1>{signup ? "Comece na IMOVKEN" : "Entrar na IMOVKEN"}</h1>
          {signup && (
            <label>Nome<input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} autoComplete="name" /></label>
          )}
          <label>E-mail<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></label>
          <label>Senha<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete={signup ? "new-password" : "current-password"} /></label>
          {signup && (
            <label>Seu perfil
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
          )}
          {signup && <AcceptBox checked={accepted} onChange={setAccepted} />}
          {error && <div className="form-error">{error}</div>}
          <button className="btn btn-primary" disabled={busy || (signup && !accepted)} type="submit"><span>{busy ? "Aguarde..." : signup ? "Criar conta" : "Entrar"}</span></button>
          <p className="auth-switch">
            {signup ? "Já tem conta?" : "Ainda não tem conta?"}{" "}
            <button type="button" onClick={() => navigate(signup ? "/entrar" : "/cadastro")}>{signup ? "Entrar" : "Criar conta"}</button>
          </p>
          <p className="auth-note">A senha precisa ter 8 ou mais caracteres.</p>
        </form>
      </div>
    </div>
  )
}
