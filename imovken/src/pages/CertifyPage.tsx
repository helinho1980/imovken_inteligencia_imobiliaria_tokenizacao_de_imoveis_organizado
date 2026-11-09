import { useEffect, useState } from "react"
import { api, TYPE_LABEL, useMe } from "../api"
import { AppShell, navigate } from "../ui"

export default function CertifyPage() {
  const { user, loaded } = useMe()
  const [f, setF] = useState({ title: "", type: "apartamento", city: "", state: "SP", neighborhood: "", areaM2: "", matricula: "", cartorio: "" })
  const [own, setOwn] = useState(false)
  const [err, setErr] = useState("")
  const [busy, setBusy] = useState(false)
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }))
  useEffect(() => { if (loaded && !user) navigate("/entrar") }, [loaded, user])

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setBusy(true)
    try {
      await api("/api/certificates", { method: "POST", body: JSON.stringify({ ...f, areaM2: f.areaM2 ? Number(f.areaM2) : undefined, neighborhood: f.neighborhood || undefined, declaresOwnership: own }) })
      navigate("/painel")
    } catch (x: any) { setErr(x.message) } finally { setBusy(false) }
  }
  return (
    <AppShell title="Certificar um imóvel" subtitle="CERTIFICADO DIGITAL">
      <div className="profile-body">
        <div className="status-banner"><span><strong>O que é.</strong> Um registro digital da existência e do histórico do seu imóvel na IMOVKEN, verificável por qualquer pessoa. <strong>Não é título de propriedade</strong>, não é fração do imóvel e não é negociável. Você registra só a impressão digital dos documentos; os arquivos não saem do seu computador.</span></div>
        <form className="auth-card wide" onSubmit={submit}>
          <label>Nome do imóvel<input required minLength={5} value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="Ex.: Apartamento 2 dormitórios, Centro" /></label>
          <div className="row2">
            <label>Tipo<select value={f.type} onChange={(e) => set("type", e.target.value)}>{Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
            <label>Área (m²)<input inputMode="decimal" value={f.areaM2} onChange={(e) => set("areaM2", e.target.value.replace(",", "."))} /></label>
          </div>
          <div className="row2">
            <label>Cidade<input required value={f.city} onChange={(e) => set("city", e.target.value)} /></label>
            <label>UF<input required maxLength={2} value={f.state} onChange={(e) => set("state", e.target.value.toUpperCase())} /></label>
          </div>
          <label>Bairro (não aparece na página pública)<input value={f.neighborhood} onChange={(e) => set("neighborhood", e.target.value)} /></label>
          <div className="row2">
            <label>Número da matrícula<input required value={f.matricula} onChange={(e) => set("matricula", e.target.value)} /></label>
            <label>Cartório de registro de imóveis<input required value={f.cartorio} onChange={(e) => set("cartorio", e.target.value)} placeholder="Ex.: 1º Registro de Imóveis de Bauru" /></label>
          </div>
          <label className="accept-box"><input type="checkbox" checked={own} onChange={(e) => setOwn(e.target.checked)} /><span>Declaro que sou o titular deste imóvel (ou tenho autorização do titular) e que as informações são verdadeiras. Matrícula e cartório não serão exibidos publicamente.</span></label>
          {err && <div className="form-error">{err}</div>}
          <button className="btn btn-primary" disabled={!own || busy} type="submit"><span>{busy ? "Enviando..." : "Solicitar certificado"}</span></button>
          <p className="auth-note">Depois, no painel, anexe a impressão digital dos documentos (por exemplo, a matrícula atualizada). A IMOVKEN confere e emite.</p>
        </form>
      </div>
    </AppShell>
  )
}
