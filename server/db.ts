import { DatabaseSync } from "node:sqlite"
import { mkdirSync } from "node:fs"
import { dirname } from "node:path"

const file = process.env.DB_PATH || "data/imovken.db"
mkdirSync(dirname(file), { recursive: true })
export const db = new DatabaseSync(file)

db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
  password_hash TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, location TEXT NOT NULL, type TEXT NOT NULL,
  value_brl REAL NOT NULL, score REAL NOT NULL, potential REAL NOT NULL,
  liquidity TEXT NOT NULL, token TEXT NOT NULL, area REAL, year INTEGER,
  occupancy INTEGER, zoning TEXT, days_to_sell INTEGER, range_low REAL, range_high REAL);
CREATE TABLE IF NOT EXISTS asset_history (
  asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  month TEXT NOT NULL, price_m2 REAL NOT NULL, benchmark_m2 REAL NOT NULL,
  PRIMARY KEY (asset_id, month));
CREATE TABLE IF NOT EXISTS analysis_requests (
  id INTEGER PRIMARY KEY, asset_id TEXT NOT NULL REFERENCES assets(id),
  user_id INTEGER REFERENCES users(id), name TEXT NOT NULL, email TEXT NOT NULL,
  message TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS contacts (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL,
  message TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
`)

// Dados de demonstração (só entram se a tabela estiver vazia)
const seed = [
  ["IK-0421", "Alameda Corporate", "Bauru, SP", "Comercial", 2480000, 87.4, 18.6, "Alta", "Elegível", 294, 2021, 100, "ZCOR-2", 74, 2320000, 2610000, 8420],
  ["IK-0388", "Axis Faria Lima", "São Paulo, SP", "Corporativo", 18200000, 92.1, 12.4, "Alta", "Estruturado", 820, 2019, 96, "ZEU", 61, 17100000, 19000000, 22200],
  ["IK-0314", "Parque Log I", "Campinas, SP", "Logístico", 8760000, 84.9, 21.3, "Média", "Elegível", 5400, 2020, 100, "ZI-1", 96, 8100000, 9300000, 1620],
  ["IK-0297", "Lumière Residences", "Ribeirão Preto, SP", "Residencial", 4120000, 81.6, 16.8, "Alta", "Análise", 310, 2022, 88, "ZR-3", 82, 3850000, 4400000, 13300],
  ["IK-0251", "Vértice Mixed Use", "Curitiba, PR", "Mixed use", 11900000, 89.3, 14.2, "Média", "Estruturado", 1450, 2023, 92, "ZM-2", 90, 11100000, 12600000, 8200],
] as const

if (!db.prepare("SELECT 1 FROM assets LIMIT 1").get()) {
  const ins = db.prepare("INSERT INTO assets VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
  const hist = db.prepare("INSERT INTO asset_history VALUES (?,?,?,?)")
  db.exec("BEGIN")
  for (const a of seed) {
    ins.run(...a.slice(0, 16))
    const base = a[16]
    for (let i = 35; i >= 0; i--) {
      const d = new Date(2026, 9 - i, 1)
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      const trend = 1 - (i / 35) * (a[6] / 100) * 1.1
      const wave = 1 + Math.sin(i / 3) * 0.012
      hist.run(a[0], month, Math.round(base * trend * wave), Math.round(base * (1 - (i / 35) * 0.094) * wave))
    }
  }
  db.exec("COMMIT")
}
