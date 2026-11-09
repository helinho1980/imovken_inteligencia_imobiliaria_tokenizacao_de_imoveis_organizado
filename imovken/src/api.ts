import { useSyncExternalStore } from "react"

export type User = { name: string; email: string; role?: string; needsAcceptance?: string[] } | null

export async function api<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "same-origin",
    headers: init?.body ? { "content-type": "application/json" } : undefined,
    ...init,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as any).error || "Erro inesperado. Tente novamente.")
  return data as T
}

// ---- sessão (estado global simples, compartilhado entre componentes) ----
let state: { user: User; loaded: boolean } = { user: null, loaded: false }
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
const set = (user: User) => {
  state = { user, loaded: true }
  emit()
}

let started = false
export function loadSession() {
  if (started) return
  started = true
  api<{ user: User }>("/api/auth/me").then((d) => set(d.user)).catch(() => set(null))
}

export function useMe() {
  loadSession()
  const s = useSyncExternalStore(
    (cb) => (listeners.add(cb), () => listeners.delete(cb)),
    () => state,
  )
  return s
}

export const session = {
  set,
  async logout() {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {})
    set(null)
  },
}

export const ROLE_LABELS: Record<string, string> = {
  entusiasta: "Entusiasta de imóveis",
  corretor: "Corretor(a)",
  investidor: "Investidor(a)",
  proprietario: "Proprietário(a)",
  incorporador: "Incorporador(a)",
  instituicao: "Instituição",
}

export const money = (v: number | null | undefined) => (v == null ? "—" : `R$ ${Math.round(v).toLocaleString("pt-BR")}`)
export const STATUS_LABEL: Record<string, string> = {
  rascunho: "Rascunho", aguardando_pagamento: "Aguardando pagamento", expirado: "Expirado", publicado: "Publicado", em_negociacao: "Em negociação", vendido: "Vendido", pausado: "Pausado",
  enviada: "Enviada", contraproposta: "Contraproposta", aceita: "Aceita", recusada: "Recusada", retirada: "Retirada",
  minuta: "Minuta", parcialmente_assinado: "Falta uma assinatura", assinado: "Assinado", concluido: "Concluído", cancelado: "Cancelado",
}
export const TYPE_LABEL: Record<string, string> = { apartamento: "Apartamento", casa: "Casa", terreno: "Terreno", comercial: "Comercial", rural: "Rural", outro: "Outro" }

export type Config = { adPriceBrl: number; adDays: number; paymentsEnabled: boolean }
let cfg: Promise<Config> | null = null
export const getConfig = () => (cfg ??= api<Config>("/api/config").catch(() => ({ adPriceBrl: 0, adDays: 30, paymentsEnabled: true })))
export async function startCheckout(listingId: number) {
  const d = await api<{ url: string }>(`/api/listings/${listingId}/checkout`, { method: "POST", body: "{}" })
  window.location.href = d.url
}
export const isExpired = (l: { status: string; publishedUntil?: string | null }) =>
  l.status === "publicado" && !!l.publishedUntil && new Date(l.publishedUntil.replace(" ", "T") + "Z").getTime() < Date.now()

// SHA-256 do arquivo calculado no navegador (o arquivo nunca sai do computador)
export async function sha256File(file: File): Promise<string> {
  const buf = await file.arrayBuffer()
  const h = await crypto.subtle.digest("SHA-256", buf)
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("")
}
export const CERT_STATUS: Record<string, string> = { em_analise: "Em análise", emitido: "Emitido", ancorado: "Emitido e registrado em blockchain", revogado: "Revogado" }
export const EVENT_LABEL: Record<string, string> = {
  solicitado: "Certificado solicitado", negocio_concluido: "Negócio concluído na plataforma", dados_registrais_informados: "Dados registrais informados",
  documento_registrado: "Documento registrado (hash)", emitido: "Certificado emitido pela IMOVKEN", registrado_on_chain: "Registrado em blockchain",
  titular_alterado: "Titular alterado após novo registro", revogado: "Certificado revogado",
}
