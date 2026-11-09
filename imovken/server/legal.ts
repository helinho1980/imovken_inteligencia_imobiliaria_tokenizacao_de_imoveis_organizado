import { db } from "./db.ts"

// Mantenha igual a src/legal/documents.ts (LEGAL_DOCS[].version)
export const LEGAL_VERSIONS: Record<string, string> = { termos: "1.3", privacidade: "1.2", adesao: "1.0", riscos: "1.0" }

export function recordConsents(userId: number, ip: string, ua: string) {
  const ins = db.prepare("INSERT INTO consents (user_id, doc_id, version, ip, user_agent) VALUES (?,?,?,?,?)")
  db.exec("BEGIN")
  try {
    for (const [doc, version] of Object.entries(LEGAL_VERSIONS)) ins.run(userId, doc, version, ip, ua.slice(0, 300))
    db.exec("COMMIT")
  } catch (e) {
    db.exec("ROLLBACK")
    throw e
  }
}

export function pendingDocs(userId: number): string[] {
  const rows = db.prepare("SELECT doc_id, version FROM consents WHERE user_id = ?").all(userId) as { doc_id: string; version: string }[]
  const have = new Set(rows.map((r) => `${r.doc_id}@${r.version}`))
  return Object.entries(LEGAL_VERSIONS).filter(([d, v]) => !have.has(`${d}@${v}`)).map(([d]) => d)
}
