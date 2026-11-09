import { useEffect, useState } from "react"
import { api, CERT_STATUS, EVENT_LABEL, sha256File, TYPE_LABEL } from "../api"
import { AppShell, Button, Icon, navigate } from "../ui"

type Pub = {
  code: string; status: string; kind: string; title: string; type: string; city: string; state: string; areaM2?: number; issuedAt?: string; holder: string
  matriculaHash?: string; docs: { label: string; sha256: string }[]; events: { seq: number; type: string; at: string; hash: string }[]; chainValid: boolean
  dossierHash: string; anchoredDossierHash?: string; onchain?: { chain: string; contract: string; tokenId: string; tx: string; holder: string }
}
const scan = (chain: string) => (chain === "sepolia" ? "https://sepolia.etherscan.io" : "https://etherscan.io")

export default function CertificatePublicPage({ code }: { code: string }) {
  const [c, setC] = useState<Pub | null>(null)
  const [err, setErr] = useState("")
  const [check, setCheck] = useState<{ name: string; label?: string } | null>(null)
  useEffect(() => { api<Pub>(`/api/certificates/public/${code}`).then(setC).catch((e) => setErr(e.message)) }, [code])

  async function verify(f: File | undefined) {
    if (!f || !c) return
    const h = await sha256File(f)
    setCheck({ name: f.name, label: c.docs.find((d) => d.sha256 === h)?.label })
  }
  if (!c) return <AppShell title={err ? "Certificado não encontrado" : "Carregando..."} subtitle="VERIFICAÇÃO PÚBLICA">{err && <div className="profile-body"><div className="form-error" style={{ margin: 0 }}>{err}</div></div>}</AppShell>

  const live = (c.status === "emitido" || c.status === "ancorado") && c.chainValid
  return (
    <AppShell title={`Certificado ${c.code}`} subtitle="VERIFICAÇÃO PÚBLICA · IMOVKEN">
      <div className="profile-body">
        <div className={live ? "form-ok cert-status" : "form-error cert-status"} style={{ margin: 0 }}>
          <b>{CERT_STATUS[c.status] ?? c.status}</b>{" · "}
          {c.chainValid ? "histórico íntegro (cadeia de hashes verificada agora)" : "ATENÇÃO: histórico adulterado ou inconsistente. Não confie neste certificado."}
        </div>
        <div className="status-banner"><Icon name="shield" /><span><strong>Isto não é título de propriedade.</strong> O certificado registra a existência e o histórico do imóvel na IMOVKEN. A propriedade só se transfere com o registro no cartório de registro de imóveis. O certificado não é uma fração do imóvel, não promete rendimento e não é negociável.</span></div>
        <div className="kv light cert-kv">
          <div><span>Imóvel</span><b>{c.title}</b></div>
          <div><span>Tipo e local</span><b>{TYPE_LABEL[c.type] ?? c.type} · {c.city}/{c.state}</b></div>
          <div><span>Área</span><b>{c.areaM2 ? `${c.areaM2} m²` : "—"}</b></div>
          <div><span>Titular</span><b>{c.holder}</b></div>
          <div><span>Origem</span><b>{c.kind === "venda" ? "Negócio concluído na plataforma" : "Imóvel certificado pelo titular"}</b></div>
          <div><span>Emitido em</span><b>{c.issuedAt ? new Date(c.issuedAt.replace(" ", "T") + "Z").toLocaleDateString("pt-BR") : "—"}</b></div>
        </div>

        {c.onchain && (
          <div className="auth-card wide">
            <h2>Registro em blockchain</h2>
            <p className="auth-note">Rede: {c.onchain.chain === "sepolia" ? "Sepolia (teste)" : "Ethereum"} · Token #{c.onchain.tokenId}</p>
            <code className="addr">Contrato: {c.onchain.contract}</code>
            <p className="auth-note"><a href={`${scan(c.onchain.chain)}/tx/${c.onchain.tx}`} target="_blank" rel="noreferrer">Ver transação</a> · <a href={`${scan(c.onchain.chain)}/token/${c.onchain.contract}?a=${c.onchain.tokenId}`} target="_blank" rel="noreferrer">Ver token</a></p>
            <p className="auth-note">Hash do dossiê gravado: <code>{c.anchoredDossierHash}</code>{c.anchoredDossierHash === c.dossierHash ? " (igual ao dossiê atual)" : " (o dossiê mudou depois do registro; novos eventos aparecem abaixo)"}</p>
          </div>
        )}

        <div className="auth-card wide">
          <h2>Documentos (impressões digitais)</h2>
          {c.docs.length === 0 ? <p className="auth-note">Nenhum documento registrado.</p> : c.docs.map((d) => <div key={d.sha256} className="hash-row"><b>{d.label}</b><code>{d.sha256}</code></div>)}
          <label className="photo-add">Verificar um arquivo<input type="file" onChange={(e) => verify(e.target.files?.[0])} /></label>
          <p className="auth-note">O arquivo não é enviado: o cálculo é feito no seu navegador.</p>
          {check && (check.label ? <div className="form-ok">“{check.name}” confere com o documento registrado: {check.label}.</div> : <div className="form-error" style={{ margin: 0 }}>“{check.name}” NÃO confere com nenhum documento registrado.</div>)}
        </div>

        <div className="auth-card wide">
          <h2>Histórico</h2>
          {c.events.map((e) => (
            <div key={e.seq} className="hash-row"><b>{e.seq}. {EVENT_LABEL[e.type] ?? e.type}</b><small>{new Date(e.at).toLocaleString("pt-BR")}</small><code>{e.hash}</code></div>
          ))}
        </div>
        <Button variant="secondary" onClick={() => navigate("/")}>Ir ao site</Button>
      </div>
    </AppShell>
  )
}
