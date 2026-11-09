import { useState } from "react"
import { AppShell } from "../ui"

// Página de administração (protegida pelo ADMIN_TOKEN do servidor). Nada fica salvo no navegador.
async function call(token: string, method: string, path: string, body?: any) {
  const r = await fetch(path, { method, headers: { "content-type": "application/json", "x-admin-token": token }, body: body ? JSON.stringify(body) : undefined })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.error ? `${j.error} ${j.details ? JSON.stringify(j.details) : ""}` : `Erro ${r.status}`)
  return j
}

function parseCsv(text: string) {
  const first = text.split(/\r?\n/, 1)[0] || ""
  const delim = (first.match(/;/g)?.length ?? 0) > (first.match(/,/g)?.length ?? 0) ? ";" : ","
  const rows: string[][] = []
  let cur: string[] = [], cell = "", q = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++ } else q = false } else cell += ch }
    else if (ch === '"') q = true
    else if (ch === delim) { cur.push(cell); cell = "" }
    else if (ch === "\n") { cur.push(cell.replace(/\r$/, "")); rows.push(cur); cur = []; cell = "" }
    else cell += ch
  }
  if (cell || cur.length) { cur.push(cell.replace(/\r$/, "")); rows.push(cur) }
  return rows.filter((r) => r.some((c) => c.trim() !== ""))
}
function num(s: string) {
  let v = String(s ?? "").replace(/R\$|\s/g, "")
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(v)) v = v.replace(/\./g, "").replace(",", ".")
  else if (v.includes(",") && !v.includes(".")) v = v.replace(",", ".")
  else if (v.includes(",") && v.includes(".")) v = v.replace(/\./g, "").replace(",", ".")
  const n = Number(v)
  return Number.isFinite(n) ? n : NaN
}
function date(s: string) {
  const t = String(s ?? "").trim()
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return `${m[1]}-${m[2]}-${m[3]}`
  m = t.match(/^(\d{2})\/(\d{2})\/(\d{4})/); if (m) return `${m[3]}-${m[2]}-${m[1]}`
  return ""
}

export default function AdminDataPage() {
  const [token, setToken] = useState("")
  const [log, setLog] = useState<string[]>([])
  const push = (s: string) => setLog((l) => [...l.slice(-40), s])

  // ITBI / transações
  const [csv, setCsv] = useState<string[][] | null>(null)
  const [enc, setEnc] = useState("utf-8")
  const [meta, setMeta] = useState({ city: "", state: "SP", source: "" })
  const [map, setMap] = useState({ neighborhood: "", value: "", area: "", date: "", type: "", ref: "" })
  const [busy, setBusy] = useState(false)

  async function onFile(f: File | undefined) {
    if (!f) return
    const buf = await f.arrayBuffer()
    const rows = parseCsv(new TextDecoder(enc).decode(buf))
    setCsv(rows); push(`Arquivo lido: ${rows.length - 1} linhas de dados, ${rows[0]?.length} colunas.`)
  }
  async function importCsv() {
    if (!csv) return
    const h = csv[0], idx = (n: string) => h.indexOf(n)
    const iN = idx(map.neighborhood), iV = idx(map.value), iA = idx(map.area), iD = idx(map.date), iT = idx(map.type), iR = idx(map.ref)
    if ([iN, iV, iA, iD].some((i) => i < 0) || !meta.city || !meta.source) return push("Preencha cidade, fonte e as colunas de bairro, valor, área e data.")
    const rows: any[] = []; let skipped = 0
    for (const r of csv.slice(1)) {
      const v = num(r[iV]), a = num(r[iA]), d = date(r[iD]), n = (r[iN] || "").trim()
      if (!n || !(v > 0) || !(a >= 8) || !d) { skipped++; continue }
      rows.push({ city: meta.city, state: meta.state, neighborhood: n, declaredValue: v, areaM2: a, dealDate: d, propertyType: iT >= 0 ? r[iT]?.slice(0, 60) : undefined, sourceRef: iR >= 0 ? r[iR]?.slice(0, 120) : undefined })
    }
    push(`${rows.length} linhas válidas, ${skipped} descartadas (vazias ou fora do padrão).`)
    setBusy(true)
    try {
      let added = 0
      for (let i = 0; i < rows.length; i += 1500) {
        const res = await call(token, "POST", "/api/admin/deals/import", { source: meta.source, rows: rows.slice(i, i + 1500) })
        added += res.added; push(`Lote ${i / 1500 + 1}: ${res.added} novas.`)
      }
      push(`Concluído: ${added} transações novas gravadas.`)
    } catch (e: any) { push("Erro: " + e.message) } finally { setBusy(false) }
  }

  // Geocodificação (mapa de calor real)
  const [geoCity, setGeoCity] = useState("")
  async function geocode() {
    if (!geoCity) return push("Informe a cidade.")
    setBusy(true)
    try {
      for (let i = 0; i < 40; i++) {
        const r = await call(token, "POST", "/api/admin/geocode", { city: geoCity, limit: 20 })
        push(`Geocodificação: ${r.geocoded} localizados, ${r.notFound} não encontrados, ${r.remaining} restantes.`)
        if (!r.remaining) break
      }
      push("Pronto. Abra /territorio e escolha a cidade: o mapa passa a usar dados reais.")
    } catch (e: any) { push("Erro: " + e.message) } finally { setBusy(false) }
  }

  // IBGE
  const [codes, setCodes] = useState("3506003")
  async function ibge() {
    try {
      const cities = codes.split(/[\s,;]+/).filter(Boolean).map((c) => ({ ibgeCode: c }))
      const r = await call(token, "POST", "/api/admin/ibge/sync", { cities })
      r.report.forEach((x: any) => push(x.ok ? `IBGE ${x.ibgeCode} (${x.city}): ${x.indicator} = ${x.value.toLocaleString("pt-BR")} (${x.period})` : `IBGE ${x.ibgeCode}: falhou (${x.error})`))
    } catch (e: any) { push("Erro: " + e.message) }
  }
  async function simple(path: string, method = "GET") {
    try { push(JSON.stringify(await call(token, method, path)).slice(0, 1800)) } catch (e: any) { push("Erro: " + e.message) }
  }

  const cols = csv?.[0] ?? []
  const Sel = ({ k, label }: { k: keyof typeof map; label: string }) => (
    <label>{label}<select value={map[k]} onChange={(e) => setMap({ ...map, [k]: e.target.value })}><option value="">—</option>{cols.map((c) => <option key={c} value={c}>{c}</option>)}</select></label>
  )
  return (
    <AppShell title="Administração de dados" subtitle="USO INTERNO">
      <div className="profile-body">
        <div className="auth-card wide">
          <label>Senha de administrador (ADMIN_TOKEN)<input type="password" value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" /></label>
          <p className="auth-note">A senha não é salva. Ela é a variável ADMIN_TOKEN que você criou no Render.</p>
        </div>

        <div className="auth-card wide">
          <h2>1. Importar transações (ITBI ou base licenciada)</h2>
          <p className="auth-note">Use o arquivo CSV divulgado pela prefeitura (se estiver em Excel, salve como CSV). Cada linha precisa ter bairro, valor declarado, área e data.</p>
          <div className="row2">
            <label>Cidade<input value={meta.city} onChange={(e) => setMeta({ ...meta, city: e.target.value })} placeholder="Ex.: São Paulo" /></label>
            <label>UF<input maxLength={2} value={meta.state} onChange={(e) => setMeta({ ...meta, state: e.target.value.toUpperCase() })} /></label>
          </div>
          <label>Nome da fonte (aparece no site)<input value={meta.source} onChange={(e) => setMeta({ ...meta, source: e.target.value })} placeholder="Ex.: ITBI · Prefeitura de São Paulo (dados abertos)" /></label>
          <div className="row2">
            <label>Codificação do arquivo<select value={enc} onChange={(e) => setEnc(e.target.value)}><option value="utf-8">UTF-8</option><option value="windows-1252">Latin-1 (Excel antigo)</option></select></label>
            <label>Arquivo CSV<input type="file" accept=".csv,.txt" onChange={(e) => onFile(e.target.files?.[0])} /></label>
          </div>
          {csv && <>
            <div className="row2"><Sel k="neighborhood" label="Coluna do bairro" /><Sel k="value" label="Coluna do valor declarado" /></div>
            <div className="row2"><Sel k="area" label="Coluna da área (m²)" /><Sel k="date" label="Coluna da data" /></div>
            <div className="row2"><Sel k="type" label="Coluna do tipo (opcional)" /><Sel k="ref" label="Coluna do código único (opcional, evita duplicar)" /></div>
            <button className="btn btn-primary" disabled={busy || !token} onClick={importCsv}><span>{busy ? "Importando..." : "Importar"}</span></button>
          </>}
        </div>

        <div className="auth-card wide">
          <h2>2. Mapa de calor real: localizar os bairros</h2>
          <p className="auth-note">Depois de importar as transações de uma cidade, este passo descobre onde fica cada bairro (OpenStreetMap, cerca de 1 bairro por segundo). Pode levar alguns minutos; deixe a página aberta.</p>
          <label>Cidade (igual à usada na importação)<input value={geoCity} onChange={(e) => setGeoCity(e.target.value)} placeholder="Ex.: São Paulo" /></label>
          <button className="btn btn-primary" disabled={busy || !token} onClick={geocode}><span>{busy ? "Trabalhando..." : "Localizar bairros"}</span></button>
        </div>

        <div className="auth-card wide">
          <h2>3. Indicadores oficiais do IBGE</h2>
          <label>Códigos IBGE dos municípios (7 dígitos, separados por vírgula)<input value={codes} onChange={(e) => setCodes(e.target.value)} /></label>
          <button className="btn btn-primary" disabled={!token} onClick={ibge}><span>Sincronizar com o IBGE</span></button>
        </div>

        <div className="auth-card wide">
          <h2>4. Operação</h2>
          <div className="profile-cta">
            <button className="btn btn-secondary" disabled={!token} onClick={() => simple("/api/admin/outbox")}><span>Ver fila de e-mails</span></button>
            <button className="btn btn-secondary" disabled={!token} onClick={() => simple("/api/admin/outbox/flush", "POST")}><span>Reenviar e-mails pendentes</span></button>
            <button className="btn btn-secondary" disabled={!token} onClick={() => simple("/api/admin/commissions")}><span>Ver comissões</span></button>
          </div>
        </div>
        <pre className="admin-log">{log.join("\n") || "Resultados aparecem aqui."}</pre>
      </div>
    </AppShell>
  )
}
