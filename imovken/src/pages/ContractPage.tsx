import { useEffect, useState } from "react"
import { api, money, STATUS_LABEL, useMe } from "../api"
import { AppShell, Button, navigate } from "../ui"

type Contract = {
  id: number; status: string; text: string; sha256: string; finalPriceBrl: number; listingId: number; listingTitle: string; role: "comprador" | "vendedor"
  buyerSignedAt?: string; sellerSignedAt?: string; buyerConcludedAt?: string; sellerConcludedAt?: string
}

export default function ContractPage({ id }: { id: string }) {
  const { user, loaded } = useMe()
  const [c, setC] = useState<Contract | null>(null)
  const [err, setErr] = useState("")
  const [read, setRead] = useState(false)
  const load = () => api<{ contract: Contract }>(`/api/contracts/${id}`).then((d) => setC(d.contract)).catch((e) => setErr(e.message))
  useEffect(() => { if (loaded && !user) navigate("/entrar"); else if (user) load() }, [id, loaded, user?.email])

  async function act(path: string) {
    setErr("")
    try { await api(`/api/contracts/${id}/${path}`, { method: "POST", body: "{}" }); await load() } catch (e: any) { setErr(e.message) }
  }
  if (!c) return <AppShell title={err ? "Contrato não encontrado" : "Carregando..."} subtitle="CONTRATO">{err && <div className="profile-body"><div className="form-error" style={{ margin: 0 }}>{err}</div></div>}</AppShell>

  const mine = c.role === "comprador" ? { signed: c.buyerSignedAt, concluded: c.buyerConcludedAt } : { signed: c.sellerSignedAt, concluded: c.sellerConcludedAt }
  const when = (s?: string) => (s ? new Date(s.replace(" ", "T") + "Z").toLocaleString("pt-BR") : "pendente")
  const open = ["minuta", "parcialmente_assinado"].includes(c.status)

  return (
    <AppShell title={`Contrato · ${c.listingTitle}`} subtitle={`VOCÊ É ${c.role.toUpperCase()}(A) · ${STATUS_LABEL[c.status]?.toUpperCase()}`}>
      <div className="profile-body">
        <div className="status-banner"><span><strong>Minuta, não escritura.</strong> Este texto registra o acordo na plataforma. A transferência do imóvel exige os atos legais (em regra, escritura pública e registro em cartório) e o pagamento do ITBI. Complemente a qualificação das partes e, se quiser, peça revisão de um advogado ou corretor habilitado.</span></div>
        <div className="contract-text">{c.text}</div>
        <p className="auth-note">Preço acordado: <b>{money(c.finalPriceBrl)}</b> · Código de integridade (SHA-256): <code>{c.sha256}</code></p>
        <div className="kv light">
          <div><span>Assinatura do comprador</span><b>{when(c.buyerSignedAt)}</b></div>
          <div><span>Assinatura do vendedor</span><b>{when(c.sellerSignedAt)}</b></div>
          <div><span>Conclusão (comprador)</span><b>{when(c.buyerConcludedAt)}</b></div>
          <div><span>Conclusão (vendedor)</span><b>{when(c.sellerConcludedAt)}</b></div>
        </div>
        {err && <div className="form-error" style={{ margin: 0 }}>{err}</div>}
        {open && !mine.signed && (
          <>
            <label className="accept-box"><input type="checkbox" checked={read} onChange={(e) => setRead(e.target.checked)} /><span>Li integralmente esta minuta, concordo com seus termos e declaro que meu aceite eletrônico (com registro de data, hora e IP) vale como minha manifestação de vontade.</span></label>
            <div className="profile-cta"><Button disabled={!read} onClick={() => act("sign")}>Aceitar e assinar</Button><Button variant="secondary" onClick={() => act("cancel")}>Cancelar negociação</Button></div>
          </>
        )}
        {open && mine.signed && <p className="auth-note">Você já assinou. Aguardando a outra parte. <button className="link-btn" onClick={() => act("cancel")}>Cancelar negociação</button></p>}
        {c.status === "assinado" && (
          <div className="profile-cta">
            {!mine.concluded ? <Button onClick={() => act("conclude")}>Confirmar conclusão do negócio (escritura/registro feitos)</Button> : <p className="auth-note">Você confirmou a conclusão. Aguardando a outra parte.</p>}
          </div>
        )}
        {c.status === "concluido" && <div className="form-ok">Negócio concluído pelas duas partes.</div>}
        <Button variant="secondary" onClick={() => navigate("/painel")}>Voltar ao painel</Button>
      </div>
    </AppShell>
  )
}
