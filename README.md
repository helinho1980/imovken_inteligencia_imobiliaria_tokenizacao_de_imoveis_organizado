# IMOVKEN — Real Asset Intelligence

Frontend: React 19 + Vite + Tailwind v4 (`src/`). Backend: Fastify + SQLite (`server/`).

## Rodar localmente (Node 22.18+)
    pnpm install
    pnpm dev:api     # API em http://localhost:3000
    pnpm dev         # site em http://localhost:8443 (proxy /api -> 3000)

## Produção (um único serviço)
    pnpm build && pnpm start      # serve site + API na porta $PORT
    # ou: docker build -t imovken . && docker run -p 3000:3000 -v imovken-data:/data imovken

Variáveis: `PORT`, `DB_PATH` (padrão `data/imovken.db`; em produção aponte para um volume persistente).

## API
GET /api/health · POST /api/auth/{register,login,logout} · GET /api/auth/me
GET /api/assets?q&type&liquidity&token&minValue&maxValue&sort=score|value|potential
GET /api/assets/:id · GET /api/assets/:id/history?period=12M|24M|36M
POST /api/analysis-requests · POST /api/contact

## Publicação (Vercel + Render)
1. **Render (API):** New + > Blueprint > repositório do projeto. O `render.yaml` cria o serviço `imovken-api`
   (plano Starter + disco de 1 GB para o SQLite). Anote a URL final (ex.: https://imovken-api.onrender.com).
2. **Vercel (site):** Add New > Project > mesmo repositório. Em `vercel.json`, troque o destino do rewrite
   `/api/*` pela URL real do Render. O site e a API ficam no mesmo domínio, então o cookie de login funciona.
3. **Domínio:** em Vercel > Settings > Domains adicione `www.imovken.com.br` (principal) e `imovken.com.br`
   (redirecionando para o www). Crie no Registro.br os registros DNS que a Vercel mostrar.
