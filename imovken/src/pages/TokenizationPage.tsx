import { useState } from "react"
import { api } from "../api"
import { AppShell, Icon, navigate } from "../ui"

const STEPS: [string, string, string][] = [
  ["01", "Imóvel", "Registro e documentação do ativo físico: matrícula, certidões, avaliação e situação fiscal."],
  ["02", "Ativo", "Estrutura jurídica que segrega o imóvel (por exemplo, uma sociedade ou fundo específico) e define direitos de cada participante."],
  ["03", "Representação digital", "Identidade digital verificável do ativo, vinculada aos documentos e à estrutura jurídica."],
  ["04", "Blockchain", "Registro e rastreabilidade de eventos e titularidade, conforme o desenho jurídico escolhido."],
  ["05", "RWA", "Ativo real conectado: informações e regras on-chain refletindo o que existe no mundo físico."],
]

export default function TokenizationPage() {
  const [form, setForm] = useState({ name: "", email: "", message: "" })
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle")
  const [err, setErr] = useState("")

  async function send(e: React.FormEvent) {
    e.preventDefault()
    setState("sending")
    try {
      await api("/api/contact", { method: "POST", body: JSON.stringify({ ...form, message: `[Tokenização] ${form.message}` }) })
      setState("done")
    } catch (x: any) {
      setErr(x.message); setState("error")
    }
  }

  return (
    <AppShell title="Do patrimônio físico ao ativo digital" subtitle="REAL WORLD ASSETS">
      <div className="profile-body">
        <div className="status-banner">
          <Icon name="shield" />
          <span>
            <strong>Em estruturação.</strong> A tokenização envolve regras de mercado de capitais, registro de imóveis e
            tributação. Estamos definindo a estrutura jurídica e fiscal com especialistas antes de abrir ofertas.
            Nenhum token está à venda neste site.
          </span>
        </div>
        <div className="status-banner"><Icon name="layers" /><span><strong>Já disponível: certificado digital do imóvel.</strong> Registre a existência e o histórico de um imóvel (próprio ou de um negócio concluído aqui), com documentos verificados por impressão digital e trilha à prova de adulteração. Não é título de propriedade, não é fração do imóvel e não é negociável. <a href="/certificar">Certificar um imóvel</a></span></div>
        <div className="profile-grid steps-grid">
          {STEPS.map(([n, t, d]) => (
            <article key={n}><span>{n}</span><h3>{t}</h3><p>{d}</p></article>
          ))}
        </div>
        <form className="auth-card contact-card" onSubmit={send}>
          <h2>Quer participar do piloto?</h2>
          <p className="auth-note">Deixe seu contato e a equipe retorna quando houver novidades.</p>
          <label>Nome<input required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label>E-mail<input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          <label>Mensagem<textarea required minLength={5} rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></label>
          {state === "error" && <div className="form-error">{err}</div>}
          {state === "done" ? <div className="form-ok">Recebemos seu contato. Obrigado!</div> : (
            <button className="btn btn-primary" disabled={state === "sending"} type="submit"><span>{state === "sending" ? "Enviando..." : "Enviar"}</span></button>
          )}
        </form>
        <p className="auth-note"><button className="link-btn" onClick={() => navigate("/territorio")}>Ver o mapa do território →</button></p>
      </div>
    </AppShell>
  )
}
