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
CREATE TABLE IF NOT EXISTS regions (
  id TEXT PRIMARY KEY, city TEXT NOT NULL, state TEXT NOT NULL, name TEXT NOT NULL,
  lat REAL NOT NULL, lng REAL NOT NULL, radius_m REAL NOT NULL DEFAULT 650,
  valorizacao REAL NOT NULL, liquidez REAL NOT NULL, oferta REAL NOT NULL,
  demanda REAL NOT NULL, desenvolvimento REAL NOT NULL, potencial REAL NOT NULL,
  price_m2 REAL, change_12m REAL, days_on_market INTEGER, deals_12m INTEGER, listings_active INTEGER,
  source TEXT NOT NULL DEFAULT 'demo', updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_regions_city ON regions(city);
CREATE TABLE IF NOT EXISTS consents (
  id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doc_id TEXT NOT NULL, version TEXT NOT NULL, ip TEXT, user_agent TEXT,
  accepted_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_consents_user ON consents(user_id);

-- dados reais: transações (ITBI e bases licenciadas) e indicadores oficiais (IBGE)
CREATE TABLE IF NOT EXISTS deals (
  id INTEGER PRIMARY KEY, city TEXT NOT NULL, state TEXT NOT NULL, neighborhood TEXT NOT NULL,
  declared_value REAL NOT NULL, area_m2 REAL NOT NULL, deal_date TEXT NOT NULL, property_type TEXT,
  source TEXT NOT NULL, source_ref TEXT, UNIQUE(source, source_ref));
CREATE INDEX IF NOT EXISTS idx_deals_city ON deals(city, neighborhood, deal_date);
CREATE TABLE IF NOT EXISTS city_indicators (
  ibge_code TEXT NOT NULL, city TEXT, indicator TEXT NOT NULL, label TEXT NOT NULL, value REAL NOT NULL, unit TEXT,
  ref_period TEXT, source TEXT NOT NULL, source_url TEXT, fetched_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (ibge_code, indicator));

-- geocodificação de bairros (mapa de calor com dados reais)
CREATE TABLE IF NOT EXISTS neighborhood_geo (
  city TEXT NOT NULL COLLATE NOCASE, state TEXT NOT NULL, neighborhood TEXT NOT NULL COLLATE NOCASE,
  lat REAL, lng REAL, status TEXT NOT NULL DEFAULT 'ok', source TEXT, updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (city, neighborhood));
CREATE TABLE IF NOT EXISTS listing_photos (
  id INTEGER PRIMARY KEY, listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  mime TEXT NOT NULL, data BLOB NOT NULL, position INTEGER NOT NULL DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_photos_listing ON listing_photos(listing_id);
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY, listing_id INTEGER NOT NULL REFERENCES listings(id), user_id INTEGER NOT NULL REFERENCES users(id),
  amount_brl REAL NOT NULL, days INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pendente',
  mp_preference_id TEXT, mp_payment_id TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, paid_at TEXT);

-- certificado digital do imóvel
CREATE TABLE IF NOT EXISTS certificates (
  id INTEGER PRIMARY KEY, code TEXT NOT NULL UNIQUE, kind TEXT NOT NULL, holder_user_id INTEGER NOT NULL REFERENCES users(id),
  listing_id INTEGER, contract_id INTEGER UNIQUE, title TEXT NOT NULL, type TEXT NOT NULL, city TEXT NOT NULL, state TEXT NOT NULL,
  neighborhood TEXT, area_m2 REAL, cartorio TEXT, matricula TEXT, status TEXT NOT NULL DEFAULT 'em_analise', note TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP, issued_at TEXT,
  onchain_chain TEXT, onchain_contract TEXT, onchain_token_id TEXT, onchain_tx TEXT, onchain_holder TEXT, anchored_dossier_hash TEXT);
CREATE INDEX IF NOT EXISTS idx_cert_holder ON certificates(holder_user_id);
CREATE TABLE IF NOT EXISTS certificate_docs (
  id INTEGER PRIMARY KEY, certificate_id INTEGER NOT NULL REFERENCES certificates(id) ON DELETE CASCADE,
  label TEXT NOT NULL, filename TEXT, size INTEGER, sha256 TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS certificate_events (
  id INTEGER PRIMARY KEY, certificate_id INTEGER NOT NULL REFERENCES certificates(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL, type TEXT NOT NULL, payload TEXT NOT NULL, prev_hash TEXT NOT NULL, hash TEXT NOT NULL, created_at TEXT NOT NULL,
  UNIQUE(certificate_id, seq));

-- marketplace: anúncios, propostas, contratos e comissões
CREATE TABLE IF NOT EXISTS listings (
  id INTEGER PRIMARY KEY, owner_id INTEGER NOT NULL REFERENCES users(id), title TEXT NOT NULL, description TEXT,
  type TEXT NOT NULL, city TEXT NOT NULL, state TEXT NOT NULL, neighborhood TEXT, price_brl REAL NOT NULL,
  area_m2 REAL, bedrooms INTEGER, broker_commission_pct REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'rascunho', created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_listings_city ON listings(city, status);
CREATE TABLE IF NOT EXISTS proposals (
  id INTEGER PRIMARY KEY, listing_id INTEGER NOT NULL REFERENCES listings(id), buyer_id INTEGER NOT NULL REFERENCES users(id),
  amount_brl REAL NOT NULL, counter_amount_brl REAL, message TEXT, status TEXT NOT NULL DEFAULT 'enviada',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS contracts (
  id INTEGER PRIMARY KEY, proposal_id INTEGER NOT NULL UNIQUE REFERENCES proposals(id), text TEXT NOT NULL, sha256 TEXT NOT NULL,
  final_price_brl REAL NOT NULL, status TEXT NOT NULL DEFAULT 'minuta',
  buyer_signed_at TEXT, buyer_signed_ip TEXT, seller_signed_at TEXT, seller_signed_ip TEXT,
  buyer_concluded_at TEXT, seller_concluded_at TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS commissions (
  id INTEGER PRIMARY KEY, contract_id INTEGER NOT NULL UNIQUE REFERENCES contracts(id), pct REAL NOT NULL, amount_brl REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'devida', created_at TEXT DEFAULT CURRENT_TIMESTAMP, paid_at TEXT);
CREATE TABLE IF NOT EXISTS email_outbox (
  id INTEGER PRIMARY KEY, to_email TEXT NOT NULL, subject TEXT NOT NULL, html TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente', attempts INTEGER NOT NULL DEFAULT 0, last_error TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP, sent_at TEXT);
`)

// Migração: perfil do usuário (corretor, entusiasta, investidor...)
const userCols = db.prepare("PRAGMA table_info(users)").all() as { name: string }[]
const listCols = db.prepare("PRAGMA table_info(listings)").all() as { name: string }[]
if (!listCols.some((c) => c.name === "published_until")) db.exec("ALTER TABLE listings ADD COLUMN published_until TEXT")
if (!userCols.some((c) => c.name === "creci")) db.exec("ALTER TABLE users ADD COLUMN creci TEXT")
if (!userCols.some((c) => c.name === "role")) {
  db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'entusiasta'")
}

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
