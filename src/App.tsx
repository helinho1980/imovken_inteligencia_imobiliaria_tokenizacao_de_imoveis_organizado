import { useEffect, useMemo, useState, type ReactNode } from "react"

type IconName = "arrow" | "brain" | "chart" | "check" | "chevron" | "clock" | "data" | "filter" | "layers" | "map" | "menu" | "search" | "shield" | "spark" | "token" | "trend" | "x"

const iconPaths: Record<IconName, ReactNode> = {
  arrow: (
    <>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </>
  ),
  brain: (
    <>
      <path d="M9.5 4.5A3 3 0 0 0 4 6v1.2A3.2 3.2 0 0 0 3 13a3 3 0 0 0 3 4.8A3.2 3.2 0 0 0 12 16V8a3.5 3.5 0 0 0-2.5-3.5Z" />
      <path d="M8 9a3 3 0 0 0 4 2.8M8 15a3 3 0 0 0 4-2.8" />
      <path d="M14.5 4.5A3 3 0 0 1 20 6v1.2a3.2 3.2 0 0 1 1 5.8 3 3 0 0 1-3 4.8 3.2 3.2 0 0 1-6-1.8V8a3.5 3.5 0 0 1 2.5-3.5Z" />
      <path d="M16 9a3 3 0 0 1-4 2.8M16 15a3 3 0 0 1-4-2.8" />
    </>
  ),
  chart: (
    <>
      <path d="M4 19V9M10 19V5M16 19v-7M22 19V3" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  chevron: <path d="m9 18 6-6-6-6" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  data: (
    <>
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
      <path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
    </>
  ),
  filter: (
    <>
      <path d="M4 6h16M7 12h10M10 18h4" />
    </>
  ),
  layers: (
    <>
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 12 9 5 9-5M3 16l9 5 9-5" />
    </>
  ),
  map: (
    <>
      <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z" />
      <path d="M9 3v15M15 6v15" />
    </>
  ),
  menu: (
    <>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 4 6v6c0 5 3.4 8 8 9 4.6-1 8-4 8-9V6l-8-3Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  spark: (
    <>
      <path d="m12 3 1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3Z" />
      <path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z" />
    </>
  ),
  token: (
    <>
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
      <path d="m8 9 4-2 4 2v6l-4 2-4-2V9Z" />
    </>
  ),
  trend: (
    <>
      <path d="m4 17 6-6 4 4 6-8" />
      <path d="M15 7h5v5" />
    </>
  ),
  x: (
    <>
      <path d="m6 6 12 12M18 6 6 18" />
    </>
  ),
}

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {iconPaths[name]}
    </svg>
  )
}

function Logo({
  compact = false,
  tagline = false,
  light = false,
}: {
  compact?: boolean
  tagline?: boolean
  light?: boolean
}) {
  return (
    <div className={`logo-wrap ${light ? "logo-light" : ""}`} aria-label="IMOVKEN">
      <svg className="logo-mark" viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="logoGrad" x1="6" y1="2" x2="34" y2="36" gradientUnits="userSpaceOnUse">
            <stop stopColor="#36D399" />
            <stop offset="1" stopColor="#5B8CFF" />
          </linearGradient>
        </defs>
        <path d="M6 8.5 20 2l14 6.5v15L20 30 6 23.5v-15Z" stroke="url(#logoGrad)" strokeWidth="2" strokeLinejoin="round" />
        <path d="m6 16 14 6.5L34 16M20 2v20.5M12.8 27v5.5L20 36l7.2-3.5V27" stroke="url(#logoGrad)" strokeWidth="2" strokeLinejoin="round" />
        <path d="M16.5 12.5 20 11l3.5 1.5V16L20 17.5 16.5 16v-3.5Z" fill="url(#logoGrad)" />
      </svg>
      {!compact && (
        <span className="logo-text">
          <span className="logo-word">IMOVKEN</span>
          {tagline && <span className="logo-tag">REAL ASSET INTELLIGENCE</span>}
        </span>
      )}
    </div>
  )
}

function navigate(path: string) {
  window.history.pushState({}, "", path)
  window.dispatchEvent(new PopStateEvent("popstate"))
  window.scrollTo({ top: 0, behavior: "smooth" })
}

function Button({
  children,
  variant = "primary",
  onClick,
  icon,
}: {
  children: ReactNode
  variant?: "primary" | "secondary" | "ghost"
  onClick?: () => void
  icon?: IconName
}) {
  return (
    <button className={`btn btn-${variant}`} onClick={onClick}>
      <span>{children}</span>
      {icon && <Icon name={icon} size={16} />}
    </button>
  )
}

function Header({ app = false }: { app?: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <header className={`header ${app ? "header-app" : ""}`}>
      <div className="header-inner">
        <button className="logo-button" onClick={() => navigate("/")}>
          <Logo />
        </button>
        <nav className={`nav ${open ? "nav-open" : ""}`}>
          <button onClick={() => navigate("/assets")}>Product</button>
          <button onClick={() => navigate("/intelligence")}>
            Intelligence
          </button>
          <button
            onClick={() => {
              navigate("/")
              setTimeout(
                () =>
                  document
                    .querySelector("#tokenizacao")
                    ?.scrollIntoView({ behavior: "smooth" }),
                50,
              )
            }}
          >
            Tokenização
          </button>
          <button
            onClick={() => {
              navigate("/")
              setTimeout(
                () =>
                  document
                    .querySelector("#territorio")
                    ?.scrollIntoView({ behavior: "smooth" }),
                50,
              )
            }}
          >
            Mercado
          </button>
          <button
            onClick={() => {
              navigate("/")
              setTimeout(
                () =>
                  document
                    .querySelector("#sobre")
                    ?.scrollIntoView({ behavior: "smooth" }),
                50,
              )
            }}
          >
            Sobre
          </button>
        </nav>
        <div className="header-actions">
          <Button variant="ghost">Entrar</Button>
          <Button onClick={() => navigate("/intelligence")}>
            Explorar plataforma
          </Button>
        </div>
        <button
          className="menu-button"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          onClick={() => setOpen(!open)}
        >
          <Icon name={open ? "x" : "menu"} />
        </button>
      </div>
    </header>
  )
}

function Eyebrow({
  children,
  dark = false,
}: {
  children: ReactNode
  dark?: boolean
}) {
  return (
    <div className={`eyebrow ${dark ? "eyebrow-dark" : ""}`}>
      <span />
      {children}
    </div>
  )
}

function ArchitecturalVisual() {
  return (
    <div
      className="architecture"
      aria-label="Estrutura modular de dados imobiliários"
    >
      <div className="architecture-glow" />
      <svg viewBox="0 0 640 560" fill="none">
        <defs>
          <linearGradient
            id="lineGrad"
            x1="120"
            y1="430"
            x2="530"
            y2="90"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#36D399" />
            <stop offset=".52" stopColor="#5B8CFF" />
            <stop offset="1" stopColor="#9B8AFB" />
          </linearGradient>
          <linearGradient id="faceGrad" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#FFFFFF" stopOpacity=".16" />
            <stop offset="1" stopColor="#FFFFFF" stopOpacity=".02" />
          </linearGradient>
          <filter id="blur">
            <feGaussianBlur stdDeviation="12" />
          </filter>
        </defs>
        <path
          d="M52 456 311 536 588 413 329 334 52 456Z"
          fill="url(#lineGrad)"
          opacity=".09"
          filter="url(#blur)"
        />

        <g stroke="url(#lineGrad)" strokeWidth="1.15">
          {/* Base urbana */}
          <path d="M62 440 310 516 575 399 328 324 62 440Z" />
          <path d="M62 440v25l248 76 265-117v-25M310 516v25" opacity=".7" />
          <path d="m95 425 247 76M132 408l247 76M476 365 211 94M526 387 278 497" opacity=".18" />

          {/* Torre principal */}
          <path d="m249 111 88 26 72-32-88-26-72 32Z" />
          <path d="m249 111 88 26v273l-88-27V111Z" />
          <path d="m337 137 72-32v273l-72 32V137Z" />
          <path d="m270 105 51-18 66 20-50 22-67-20Z" opacity=".45" />
          <path d="m249 160 88 27 72-32M249 209l88 27 72-32M249 258l88 27 72-32M249 307l88 27 72-32M249 356l88 27 72-32" opacity=".48" />
          <path d="M278 120v272M307 129v272M366 124v272M387 115v272" opacity=".23" />

          {/* Torre oeste */}
          <path d="m111 224 76 23 62-27-76-23-62 27Z" />
          <path d="m111 224 76 23v185l-76-23V224Z" />
          <path d="m187 247 62-27v185l-62 27V247Z" />
          <path d="m111 266 76 23 62-27M111 309l76 23 62-27M111 352l76 23 62-27M111 395l76 23 62-27" opacity=".43" />
          <path d="M137 232v185M163 240v185M213 236v185" opacity=".2" />

          {/* Torre leste */}
          <path d="m409 230 72 22 60-26-73-22-59 26Z" />
          <path d="m409 230 72 22v159l-72-22V230Z" />
          <path d="m481 252 60-26v159l-60 26V252Z" />
          <path d="m409 270 72 22 60-26M409 310l72 22 60-26M409 350l72 22 60-26" opacity=".43" />
          <path d="M433 237v159M457 244v159M510 239v159" opacity=".2" />

          {/* Volume baixo frontal */}
          <path d="m194 390 96 29 79-35-96-29-79 35Z" />
          <path d="m194 390 96 29v69l-96-29v-69Z" />
          <path d="m290 419 79-35v69l-79 35v-69Z" />
          <path d="m194 424 96 29 79-35" opacity=".45" />

          {/* Núcleo de dados entre os edifícios */}
          <path d="m346 202 25 8 21-10-26-7-20 9Z" opacity=".8" />
          <path d="m346 202 25 8v36l-25-8v-36ZM371 210l21-10v36l-21 10v-36Z" opacity=".8" />
        </g>

        <g fill="url(#faceGrad)">
          <path d="m249 111 88 26v273l-88-27V111Z" />
          <path d="m337 137 72-32v273l-72 32V137Z" opacity=".65" />
          <path d="m111 224 76 23v185l-76-23V224Z" opacity=".75" />
          <path d="m187 247 62-27v185l-62 27V247Z" opacity=".5" />
          <path d="m409 230 72 22v159l-72-22V230Z" opacity=".7" />
          <path d="m481 252 60-26v159l-60 26V252Z" opacity=".45" />
          <path d="m194 390 96 29v69l-96-29v-69Z" opacity=".65" />
        </g>

        <g fill="#F5F6F8">
          <circle cx="249" cy="111" r="2.6" />
          <circle cx="337" cy="137" r="2.6" />
          <circle cx="409" cy="105" r="2.6" />
          <circle cx="111" cy="224" r="2.6" />
          <circle cx="187" cy="247" r="2.6" />
          <circle cx="409" cy="230" r="2.6" />
          <circle cx="481" cy="252" r="2.6" />
          <circle cx="541" cy="226" r="2.6" />
          <circle cx="290" cy="419" r="2.6" />
        </g>
      </svg>
      <div className="data-label label-value">
        <i />
        VALUE <strong>87.4</strong>
      </div>
      <div className="data-label label-data">
        <i />
        DATA <strong>24K</strong>
      </div>
      <div className="data-label label-ai">
        <i />
        AI <strong>ACTIVE</strong>
      </div>
      <div className="data-label label-rwa">
        <i />
        RWA <strong>READY</strong>
      </div>
      <div className="data-label label-token">
        <i />
        TOKEN <strong>01</strong>
      </div>
    </div>
  )
}

const solutions = [
  {
    icon: "brain" as IconName,
    number: "01",
    title: "Intelligence",
    text: "Transforme dados imobiliários complexos em decisões claras e acionáveis.",
  },
  {
    icon: "chart" as IconName,
    number: "02",
    title: "Valuation",
    text: "Estime valor, potencial e liquidez com modelos proprietários e dados de mercado.",
  },
  {
    icon: "map" as IconName,
    number: "03",
    title: "Territory",
    text: "Compreenda o território, suas dinâmicas e os sinais que antecipam valor.",
  },
  {
    icon: "token" as IconName,
    number: "04",
    title: "Tokenization",
    text: "Estruture ativos reais para representações digitais seguras e rastreáveis.",
  },
]

function MiniMap({ detailed = false }: { detailed?: boolean }) {
  return (
    <div className={`mini-map ${detailed ? "map-detailed" : ""}`}>
      <div className="map-grid" />
      <svg viewBox="0 0 600 400" preserveAspectRatio="none">
        <path
          className="map-road main"
          d="M-20 310C110 260 135 150 260 170s180 48 370-90"
        />
        <path
          className="map-road"
          d="M40-20c55 100 120 165 230 185s220 12 350 170"
        />
        <path
          className="map-road"
          d="M140 420c-20-95 15-180 105-250S380 60 405-20"
        />
        <path
          className="map-road thin"
          d="M0 95c110 35 180 15 275-15s180 10 325 75"
        />
        <path
          className="map-zone zone-a"
          d="m250 110 76 22 30 66-60 50-80-25-12-62Z"
        />
        <path
          className="map-zone zone-b"
          d="m370 225 85-16 47 55-24 70-92 4-43-56Z"
        />
        <path
          className="map-zone zone-c"
          d="m96 188 63-31 55 44-18 77-78 8-41-48Z"
        />
      </svg>
      <span className="map-point point-one">
        <i />
        8.7
      </span>
      <span className="map-point point-two">
        <i />
        9.2
      </span>
      <span className="map-point point-three">
        <i />
        7.9
      </span>
      <div className="map-coordinates">22°19' S&nbsp;&nbsp;49°04' W</div>
    </div>
  )
}

function DashboardPreview({ full = false }: { full?: boolean }) {
  return (
    <div className={`dashboard-frame ${full ? "dashboard-full" : ""}`}>
      <div className="dash-sidebar">
        <Logo compact />
        {["layers", "chart", "map", "data"].map((icon, index) => (
          <button className={index === 0 ? "active" : ""} key={icon}>
            <Icon name={icon as IconName} />
          </button>
        ))}
        <div className="sidebar-spacer" />
        <button>
          <Icon name="menu" />
        </button>
      </div>
      <div className="dash-main">
        <div className="dash-top">
          <div>
            <span className="dash-overline">ASSET INTELLIGENCE</span>
            <h3>Alameda Corporate</h3>
          </div>
          <div className="verified">
            <Icon name="shield" size={14} /> VERIFIED ASSET
          </div>
        </div>
        <div className="metric-row">
          <div className="metric metric-score">
            <span>ASSET SCORE</span>
            <strong>87.4</strong>
            <small>TOP 8% DA REGIÃO</small>
          </div>
          <div className="metric">
            <span>ESTIMATED VALUE</span>
            <strong>R$ 2.48M</strong>
            <small>
              <b>↑ 4.2%</b> vs. 12 meses
            </small>
          </div>
          <div className="metric">
            <span>POTENTIAL</span>
            <strong className="green">+18.6%</strong>
            <small>Horizonte de 36 meses</small>
          </div>
          <div className="metric">
            <span>LOCATION</span>
            <strong>Bauru, SP</strong>
            <small>Zona Sul · Alto padrão</small>
          </div>
        </div>
        <div className="dash-grid">
          <div className="dash-card map-card">
            <div className="card-head">
              <span>Territorial intelligence</span>
              <button>
                <Icon name="layers" size={14} /> CAMADAS
              </button>
            </div>
            <MiniMap detailed={full} />
          </div>
          <div className="dash-card valuation-card">
            <div className="card-head">
              <span>Valuation history</span>
              <small>36 MESES</small>
            </div>
            <div className="chart-value">
              R$ 8.420 <small>/ m²</small>
            </div>
            <svg
              className="line-chart"
              viewBox="0 0 420 150"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                  <stop stopColor="#36D399" stopOpacity=".3" />
                  <stop offset="1" stopColor="#36D399" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                className="chart-area"
                d="M0 128C40 118 55 122 86 105s48-8 74-25 48 10 78-7 42-35 74-26 52-2 108-38V150H0Z"
              />
              <path
                className="chart-line"
                d="M0 128C40 118 55 122 86 105s48-8 74-25 48 10 78-7 42-35 74-26 52-2 108-38"
              />
            </svg>
            <div className="chart-axis">
              <span>2023</span>
              <span>2024</span>
              <span>2025</span>
              <span>2026</span>
            </div>
          </div>
          <div className="dash-card insight-card">
            <div className="card-head">
              <span>
                <Icon name="spark" size={15} /> AI INSIGHTS
              </span>
              <small>ATUALIZADO AGORA</small>
            </div>
            <p>
              O ativo apresenta <b>potencial superior à média</b> devido à
              expansão comercial e menor oferta no raio de 2 km.
            </p>
            <div className="insight-tags">
              <span>Alta liquidez</span>
              <span>Risco baixo</span>
              <span>Oferta −12%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Landing() {
  return (
    <main>
      <div className="dark-shell">
        <Header />
        <section className="hero">
          <div className="hero-noise" />
          <div className="hero-copy">
            <Eyebrow dark>REAL ASSET INTELLIGENCE</Eyebrow>
            <h1>
              O imóvel agora
              <br />
              pode ser <span>inteligente.</span>
            </h1>
            <p>
              Inteligência imobiliária, dados e tokenização para transformar
              ativos reais em novas possibilidades digitais.
            </p>
            <div className="hero-actions">
              <Button onClick={() => navigate("/intelligence")} icon="arrow">
                Explorar IMOVKEN
              </Button>
              <Button
                variant="ghost"
                icon="arrow"
                onClick={() =>
                  document
                    .querySelector("#solucao")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                Como funciona
              </Button>
            </div>
            <div className="hero-meta">
              <span>DATA-DRIVEN</span>
              <span>INSTITUTIONAL GRADE</span>
              <span>BUILT FOR REAL ASSETS</span>
            </div>
          </div>
          <ArchitecturalVisual />
        </section>
        <div className="trust-bar">
          {["REAL ESTATE", "DATA", "AI", "RWA", "BLOCKCHAIN"].map((item, i) => (
            <span key={item}>
              {item}
              {i < 4 && <i />}
            </span>
          ))}
        </div>
      </div>

      <section className="problem section-light">
        <div className="section-index">
          01 <span>THE GAP</span>
        </div>
        <div className="problem-copy">
          <Eyebrow>O PROBLEMA</Eyebrow>
          <h2>
            O mercado imobiliário possui valor. Mas grande parte dele ainda não
            possui <em>inteligência suficiente.</em>
          </h2>
        </div>
        <div className="fragmentation">
          {[
            ["01", "DADOS", "Fragmentados"],
            ["02", "AVALIAÇÃO", "Subjetiva"],
            ["03", "LOCALIZAÇÃO", "Subutilizada"],
            ["04", "MERCADO", "Opaco"],
            ["05", "PROPRIEDADE", "Ilíquida"],
          ].map((item, index) => (
            <div className="fragment-card" key={item[1]}>
              <span>{item[0]}</span>
              <Icon
                name={
                  ["data", "chart", "map", "trend", "layers"][index] as IconName
                }
                size={22}
              />
              <strong>{item[1]}</strong>
              <small>{item[2]}</small>
              <i style={{ width: `${74 - index * 7}%` }} />
            </div>
          ))}
        </div>
      </section>

      <section className="solution" id="solucao">
        <div className="section-heading">
          <div>
            <Eyebrow dark>A CAMADA DE INTELIGÊNCIA</Eyebrow>
            <h2>
              Um novo sistema operacional
              <br />
              para ativos reais.
            </h2>
          </div>
          <p>
            Da leitura de dados à representação digital, a IMOVKEN conecta as
            camadas que tornam o patrimônio mais compreensível, estruturado e
            inteligente.
          </p>
        </div>
        <div className="solution-grid">
          {solutions.map((item) => (
            <article className="solution-card" key={item.title}>
              <div className="solution-top">
                <span>{item.number}</span>
                <div>
                  <Icon name={item.icon} />
                </div>
              </div>
              <div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
              <button aria-label={`Explorar ${item.title}`}>
                <Icon name="arrow" />
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="flow-section">
        <div className="section-index">
          02 <span>THE SYSTEM</span>
        </div>
        <Eyebrow>DO FÍSICO AO DIGITAL</Eyebrow>
        <div className="flow-line">
          {[
            ["PROPERTY", "layers"],
            ["DATA", "data"],
            ["INTELLIGENCE", "brain"],
            ["DIGITAL ASSET", "token"],
            ["RWA", "shield"],
          ].map((item, i) => (
            <div className="flow-step" key={item[0]}>
              <div className="flow-node">
                <Icon name={item[1] as IconName} />
                <span className="pulse" />
              </div>
              <span>{String(i + 1).padStart(2, "0")}</span>
              <strong>{item[0]}</strong>
              {i < 4 && (
                <div className="flow-connector">
                  <i />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="dashboard-section">
        <div className="dashboard-heading">
          <div>
            <Eyebrow dark>INTELLIGENCE, IN CONTEXT</Eyebrow>
            <h2>
              Do dado disperso à<br />
              decisão de valor.
            </h2>
          </div>
          <p>
            Uma visão integrada do ativo, do entorno e do mercado — atualizada
            por dados e interpretada por inteligência artificial.
          </p>
        </div>
        <DashboardPreview />
        <div className="dashboard-caption">
          <span>IMOVKEN INTELLIGENCE PLATFORM</span>
          <button onClick={() => navigate("/intelligence")}>
            Explorar dashboard <Icon name="arrow" size={15} />
          </button>
        </div>
      </section>

      <section className="token-section" id="tokenizacao">
        <div className="token-copy">
          <Eyebrow dark>REAL WORLD ASSETS</Eyebrow>
          <h2>
            Do patrimônio físico
            <br />
            ao <span>ativo digital.</span>
          </h2>
          <p>
            A tecnologia estrutura dados, propriedade e governança para criar
            representações digitais rastreáveis de ativos reais.
          </p>
          <div className="safe-note">
            <Icon name="shield" />
            <span>
              <strong>Infraestrutura, não especulação.</strong> Tecnologia para
              registro, transparência e novas estruturas de acesso.
            </span>
          </div>
        </div>
        <div className="token-flow">
          {[
            ["01", "IMÓVEL", "Registro do ativo físico"],
            ["02", "ATIVO", "Estrutura jurídica e dados"],
            ["03", "REPRESENTAÇÃO DIGITAL", "Identidade digital verificável"],
            ["04", "BLOCKCHAIN", "Registro e rastreabilidade"],
            ["05", "RWA", "Ativo real conectado"],
          ].map((item, i) => (
            <div className={`token-row token-row-${i}`} key={item[1]}>
              <span>{item[0]}</span>
              <div>
                <strong>{item[1]}</strong>
                <small>{item[2]}</small>
              </div>
              <i>{i === 4 ? <Icon name="check" /> : <Icon name="chevron" />}</i>
            </div>
          ))}
        </div>
      </section>

      <section className="territory-section" id="territorio">
        <div className="territory-copy">
          <div>
            <Eyebrow>TERRITORIAL INTELLIGENCE</Eyebrow>
            <h2>Leia o território.</h2>
          </div>
          <p>
            Descubra onde o valor está — e para onde ele pode ir. Camadas
            geoespaciais transformam o entorno em sinais de decisão.
          </p>
        </div>
        <div className="territory-map">
          <MiniMap detailed />
          <div className="layer-panel">
            <span className="layer-title">
              <Icon name="layers" size={16} /> CAMADAS ATIVAS
            </span>
            {[
              ["Valorização", "green", true],
              ["Liquidez", "blue", true],
              ["Oferta", "violet", false],
              ["Demanda", "yellow", true],
              ["Desenvolvimento", "white", false],
              ["Potencial", "gradient", true],
            ].map((item) => (
              <button key={String(item[0])}>
                <i className={`layer-dot ${item[1]}`} />
                {item[0]}
                <span className={item[2] ? "toggle on" : "toggle"} />
              </button>
            ))}
          </div>
          <div className="map-stat">
            <span>ÍNDICE DE POTENCIAL</span>
            <strong>91.2</strong>
            <small>
              <b>↑ 14.8%</b> vs. região
            </small>
          </div>
        </div>
      </section>

      <section className="audience">
        <div className="section-heading light-heading">
          <div>
            <Eyebrow>INTELLIGENCE FOR EVERY SIDE</Eyebrow>
            <h2>
              Uma infraestrutura.
              <br />
              Múltiplas perspectivas.
            </h2>
          </div>
        </div>
        <div className="audience-grid">
          {[
            [
              "01",
              "Investidores",
              "Encontre ativos, entenda risco e identifique potencial com mais precisão.",
              "trend",
            ],
            [
              "02",
              "Proprietários",
              "Conheça o valor real do seu patrimônio e prepare-o para novas possibilidades.",
              "layers",
            ],
            [
              "03",
              "Incorporadores",
              "Leia o território, valide teses e tome decisões com contexto.",
              "map",
            ],
            [
              "04",
              "Instituições",
              "Acesse dados estruturados, governança e inteligência em escala.",
              "shield",
            ],
          ].map((item) => (
            <article key={item[1]}>
              <span>{item[0]}</span>
              <Icon name={item[3] as IconName} size={25} />
              <h3>{item[1]}</h3>
              <p>{item[2]}</p>
              <button>
                <Icon name="arrow" />
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="manifesto" id="sobre">
        <Logo compact />
        <p>REAL ASSET INTELLIGENCE</p>
        <h2>
          Real Estate is physical.
          <br />
          <span>Value doesn't have to be.</span>
        </h2>
        <div className="manifesto-line" />
      </section>

      <section className="final-cta">
        <div className="cta-grid" />
        <Eyebrow dark>THE NEXT LAYER OF REAL ESTATE</Eyebrow>
        <h2>
          O próximo mercado imobiliário
          <br />
          começa com <span>dados.</span>
        </h2>
        <p>Conheça a inteligência por trás dos ativos.</p>
        <Button onClick={() => navigate("/intelligence")} icon="arrow">
          Conhecer IMOVKEN
        </Button>
      </section>
      <Footer />
    </main>
  )
}

function Footer() {
  return (
    <footer>
      <div className="footer-top">
        <div className="footer-brand">
          <Logo tagline />
        </div>
        <div className="footer-links">
          <div>
            <strong>PLATFORM</strong>
            <button onClick={() => navigate("/assets")}>Product</button>
            <button onClick={() => navigate("/intelligence")}>
              Intelligence
            </button>
            <button>Tokenization</button>
          </div>
          <div>
            <strong>COMPANY</strong>
            <button>Research</button>
            <button>Sobre</button>
            <button>Contato</button>
          </div>
          <div>
            <strong>FOLLOW</strong>
            <button>LinkedIn ↗</button>
            <button>X ↗</button>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 IMOVKEN</span>
        <div>
          <button>Terms</button>
          <button>Privacy</button>
          <button>Disclaimer</button>
        </div>
        <span>BUILT FOR REAL ASSETS</span>
      </div>
    </footer>
  )
}

const assets = [
  {
    id: "IK-0421",
    name: "Alameda Corporate",
    location: "Bauru, SP",
    type: "Comercial",
    value: "R$ 2.48M",
    score: 87.4,
    potential: "+18.6%",
    liquidity: "Alta",
    token: "Elegível",
  },
  {
    id: "IK-0388",
    name: "Axis Faria Lima",
    location: "São Paulo, SP",
    type: "Corporativo",
    value: "R$ 18.2M",
    score: 92.1,
    potential: "+12.4%",
    liquidity: "Alta",
    token: "Estruturado",
  },
  {
    id: "IK-0314",
    name: "Parque Log I",
    location: "Campinas, SP",
    type: "Logístico",
    value: "R$ 8.76M",
    score: 84.9,
    potential: "+21.3%",
    liquidity: "Média",
    token: "Elegível",
  },
  {
    id: "IK-0297",
    name: "Lumière Residences",
    location: "Ribeirão Preto, SP",
    type: "Residencial",
    value: "R$ 4.12M",
    score: 81.6,
    potential: "+16.8%",
    liquidity: "Alta",
    token: "Análise",
  },
  {
    id: "IK-0251",
    name: "Vértice Mixed Use",
    location: "Curitiba, PR",
    type: "Mixed use",
    value: "R$ 11.9M",
    score: 89.3,
    potential: "+14.2%",
    liquidity: "Média",
    token: "Estruturado",
  },
]

function AppShell({
  children,
  title,
  subtitle,
  action,
}: {
  children: ReactNode
  title: string
  subtitle: string
  action?: ReactNode
}) {
  return (
    <div className="app-page">
      <Header app />
      <div className="app-title">
        <div>
          <Eyebrow>{subtitle}</Eyebrow>
          <h1>{title}</h1>
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

function IntelligencePage() {
  const [period, setPeriod] = useState("36M")
  return (
    <AppShell
      title="Asset Intelligence"
      subtitle="IMOVKEN PLATFORM"
      action={
        <div className="page-actions">
          <Button variant="secondary" icon="clock">
            Última atualização: agora
          </Button>
          <Button icon="arrow" onClick={() => navigate("/assets")}>
            Explorar ativos
          </Button>
        </div>
      }
    >
      <div className="intel-tabs">
        <button className="active">Visão geral</button>
        <button>Valuation</button>
        <button>Território</button>
        <button>Comparáveis</button>
        <button>Documentos</button>
      </div>
      <div className="intelligence-workspace">
        <DashboardPreview full />
        <div className="intel-bottom-grid">
          <div className="workspace-card comparables">
            <div className="workspace-head">
              <div>
                <span>COMPARÁVEIS</span>
                <h3>Ativos similares na região</h3>
              </div>
              <button>
                Ver todos <Icon name="arrow" size={14} />
              </button>
            </div>
            {assets.slice(1, 4).map((asset, i) => (
              <button
                className="comparable-row"
                key={asset.id}
                onClick={() => navigate(`/asset/${asset.id}`)}
              >
                <span className="asset-pin">{i + 1}</span>
                <div>
                  <strong>{asset.name}</strong>
                  <small>
                    {asset.location} · {asset.type}
                  </small>
                </div>
                <span>{asset.value}</span>
                <em>{asset.score}</em>
                <Icon name="chevron" size={15} />
              </button>
            ))}
          </div>
          <div className="workspace-card history">
            <div className="workspace-head">
              <div>
                <span>HISTÓRICO</span>
                <h3>Performance do ativo</h3>
              </div>
              <div className="period">
                {["12M", "24M", "36M"].map((p) => (
                  <button
                    className={period === p ? "active" : ""}
                    onClick={() => setPeriod(p)}
                    key={p}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="history-stats">
              <div>
                <span>VALORIZAÇÃO</span>
                <strong>+16.8%</strong>
              </div>
              <div>
                <span>MÉDIA REGIONAL</span>
                <strong>+9.4%</strong>
              </div>
            </div>
            <svg
              className="big-chart"
              viewBox="0 0 600 180"
              preserveAspectRatio="none"
            >
              <path className="gridline" d="M0 30h600M0 80h600M0 130h600" />
              <path
                className="benchmark"
                d="M0 145C90 130 145 138 220 110s140 6 200-30 95-18 180-50"
              />
              <path
                className="performance"
                d="M0 155C70 150 110 126 165 136s100-55 165-38 95-54 150-45 72-24 120-44"
              />
            </svg>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

function AssetsPage() {
  const [query, setQuery] = useState("")
  const [type, setType] = useState("Todos")
  const [filtered, setFiltered] = useState<typeof assets>(assets)
  useEffect(() => {
    const ctrl = new AbortController()
    const t = setTimeout(() => {
      fetch(`/api/assets?q=${encodeURIComponent(query)}&type=${encodeURIComponent(type)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((d) => setFiltered(d.items))
        .catch(() => {})
    }, 200)
    return () => { clearTimeout(t); ctrl.abort() }
  }, [query, type])
  return (
    <AppShell
      title="Asset Explorer"
      subtitle="MERCADO & OPORTUNIDADES"
      action={<Button icon="layers">Comparar ativos</Button>}
    >
      <div className="asset-toolbar">
        <label className="search-box">
          <Icon name="search" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por ativo, cidade ou ID"
          />
          <kbd>⌘ K</kbd>
        </label>
        <div className="filter-row">
          <span>
            <Icon name="filter" size={16} /> FILTROS
          </span>
          {[
            "Localização",
            "Tipo",
            "Valor",
            "Potencial",
            "Liquidez",
            "Tokenização",
          ].map((item) => (
            <button key={item}>
              {item}
              <Icon name="chevron" size={13} />
            </button>
          ))}
        </div>
      </div>
      <div className="asset-content">
        <aside className="asset-map-panel">
          <MiniMap detailed />
          <div className="map-count">
            <strong>{filtered.length}</strong>
            <span>ATIVOS NESTA ÁREA</span>
          </div>
        </aside>
        <div className="asset-list-panel">
          <div className="asset-list-head">
            <span>{filtered.length} ATIVOS ENCONTRADOS</span>
            <div>
              {["Todos", "Comercial", "Corporativo", "Logístico", "Residencial", "Mixed use"].map((t) => (
                <button
                  className={type === t ? "active" : ""}
                  onClick={() => setType(t)}
                  key={t}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="asset-table-head">
            <span>ATIVO</span>
            <span>VALOR</span>
            <span>SCORE</span>
            <span>POTENCIAL</span>
            <span>LIQUIDEZ</span>
            <span>TOKENIZAÇÃO</span>
            <span />
          </div>
          {filtered.map((asset, i) => (
            <button
              className="asset-table-row"
              key={asset.id}
              onClick={() => navigate(`/asset/${asset.id}`)}
            >
              <div>
                <i>{String(i + 1).padStart(2, "0")}</i>
                <span>
                  <strong>{asset.name}</strong>
                  <small>
                    {asset.location} · {asset.type}
                    <em>{asset.id}</em>
                  </small>
                </span>
              </div>
              <strong>{asset.value}</strong>
              <b>{asset.score}</b>
              <em>{asset.potential}</em>
              <span className="liquidity">{asset.liquidity}</span>
              <span className="token-status">{asset.token}</span>
              <Icon name="chevron" size={15} />
            </button>
          ))}
          {!filtered.length && (
            <div className="empty-state">
              <Icon name="search" size={30} />
              <strong>Nenhum ativo encontrado</strong>
              <span>Ajuste sua busca ou os filtros selecionados.</span>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}

function AssetDetail({ id }: { id: string }) {
  const [remote, setRemote] = useState<any>(null)
  const [missing, setMissing] = useState(false)
  useEffect(() => {
    setRemote(null); setMissing(false)
    fetch(`/api/assets/${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setRemote)
      .catch(() => setMissing(true))
  }, [id])
  const base: any = assets.find((a) => a.id === id)
  const asset: any = remote || base || assets[0]
  if (missing && !base)
    return (
      <AppShell title="Ativo não encontrado" subtitle="ASSET">
        <div className="empty-state">
          <Icon name="search" size={30} />
          <strong>Não encontramos o ativo {id}</strong>
          <Button icon="arrow" onClick={() => navigate("/assets")}>Voltar aos ativos</Button>
        </div>
      </AppShell>
    )
  return (
    <AppShell
      title={asset.name}
      subtitle={`ASSET / ${asset.id}`}
      action={
        <div className="page-actions">
          <Button variant="secondary" icon="shield">
            Data room
          </Button>
          <Button icon="arrow">Solicitar análise</Button>
        </div>
      }
    >
      <div className="asset-detail-meta">
        <span>
          <Icon name="map" size={15} />
          {asset.location}
        </span>
        <span>{asset.type}</span>
        <span className="verified">
          <Icon name="shield" size={13} /> VERIFIED ASSET
        </span>
      </div>
      <div className="detail-grid">
        <section className="detail-main">
          <div className="detail-score-row">
            <div className="score-orbit">
              <strong>{asset.score}</strong>
              <span>
                ASSET
                <br />
                SCORE
              </span>
            </div>
            <div className="detail-metric">
              <span>VALOR ESTIMADO</span>
              <strong>{asset.value}</strong>
              <small>Faixa: {asset.range ?? "R$ 2.32M — R$ 2.61M"}</small>
            </div>
            <div className="detail-metric">
              <span>POTENCIAL</span>
              <strong className="green">{asset.potential}</strong>
              <small>Horizonte de 36 meses</small>
            </div>
            <div className="detail-metric">
              <span>LIQUIDEZ</span>
              <strong>{asset.liquidity}</strong>
              <small>{asset.daysToSell ?? 74} dias estimados</small>
            </div>
          </div>
          <div className="detail-map-card">
            <div className="workspace-head">
              <div>
                <span>TERRITORY</span>
                <h3>Contexto geoespacial</h3>
              </div>
              <button>
                <Icon name="layers" size={14} /> Camadas
              </button>
            </div>
            <MiniMap detailed />
          </div>
          <div className="detail-two-col">
            <div className="workspace-card">
              <div className="workspace-head">
                <div>
                  <span>VALUATION</span>
                  <h3>Evolução de valor</h3>
                </div>
                <span className="green">+16.8%</span>
              </div>
              <svg
                className="big-chart"
                viewBox="0 0 600 180"
                preserveAspectRatio="none"
              >
                <path className="gridline" d="M0 30h600M0 80h600M0 130h600" />
                <path
                  className="performance"
                  d="M0 155C70 150 110 126 165 136s100-55 165-38 95-54 150-45 72-24 120-44"
                />
              </svg>
            </div>
            <div className="workspace-card property-data">
              <div className="workspace-head">
                <div>
                  <span>PROPERTY DATA</span>
                  <h3>Dados do ativo</h3>
                </div>
              </div>
              {[
                ["Área privativa", `${asset.area ?? 294} m²`],
                ["Preço / m²", asset.pricePerM2 ?? "R$ 8.420"],
                ["Ano", String(asset.year ?? 2021)],
                ["Ocupação", `${asset.occupancy ?? 100}%`],
                ["Zoneamento", asset.zoning ?? "ZCOR-2"],
              ].map((row) => (
                <div key={row[0]}>
                  <span>{row[0]}</span>
                  <strong>{row[1]}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>
        <aside className="detail-aside">
          <div className="ai-panel">
            <div className="ai-title">
              <span>
                <Icon name="spark" />
                AI INSIGHTS
              </span>
              <small>4 SINAIS</small>
            </div>
            <h3>Leitura inteligente do ativo</h3>
            <p>
              Ativo com fundamentos acima da média regional e exposição positiva
              a vetores de desenvolvimento urbano.
            </p>
            {[
              "Expansão comercial no raio de 2 km",
              "Oferta de classe A caiu 12%",
              "Demanda corporativa em alta",
              "Baixo risco de vacância",
            ].map((signal, i) => (
              <div className="signal" key={signal}>
                <i>{i + 1}</i>
                <span>{signal}</span>
                <Icon name="trend" size={15} />
              </div>
            ))}
            <Button icon="arrow">Gerar relatório completo</Button>
          </div>
          <div className="rwa-readiness">
            <div>
              <Icon name="token" />
              <span>
                <strong>RWA READINESS</strong>
                <small>Elegibilidade estrutural</small>
              </span>
            </div>
            <strong>82%</strong>
            <div className="readiness-bar">
              <i />
            </div>
            <p>Documentação e dados compatíveis com estruturação digital.</p>
          </div>
        </aside>
      </div>
    </AppShell>
  )
}

export default function App() {
  const [path, setPath] = useState(window.location.pathname)
  useEffect(() => {
    const update = () => setPath(window.location.pathname)
    window.addEventListener("popstate", update)
    return () => window.removeEventListener("popstate", update)
  }, [])
  if (path === "/intelligence") return <IntelligencePage />
  if (path === "/assets") return <AssetsPage />
  if (path.startsWith("/asset/"))
    return <AssetDetail id={decodeURIComponent(path.split("/").pop() || "")} />
  return <Landing />
}
