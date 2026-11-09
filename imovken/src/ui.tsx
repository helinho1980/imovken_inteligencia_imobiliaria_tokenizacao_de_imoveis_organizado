import { useState, type ReactNode } from "react"
import { useMe, session } from "./api"

export type IconName = "arrow" | "brain" | "chart" | "check" | "chevron" | "clock" | "data" | "filter" | "layers" | "map" | "menu" | "search" | "shield" | "spark" | "token" | "trend" | "x"

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

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
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

export function Logo({
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

export function navigate(path: string) {
  window.history.pushState({}, "", path)
  window.dispatchEvent(new PopStateEvent("popstate"))
  window.scrollTo({ top: 0, behavior: "smooth" })
}

export function Button({
  children,
  variant = "primary",
  onClick,
  icon,
  disabled,
}: {
  children: ReactNode
  variant?: "primary" | "secondary" | "ghost"
  onClick?: () => void
  icon?: IconName
  disabled?: boolean
}) {
  return (
    <button className={`btn btn-${variant}`} onClick={onClick} disabled={disabled}>
      <span>{children}</span>
      {icon && <Icon name={icon} size={16} />}
    </button>
  )
}

export function Header({ app = false }: { app?: boolean }) {
  const [open, setOpen] = useState(false)
  const { user } = useMe()
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
          <button onClick={() => navigate("/tokenizacao")}>Tokenização</button>
          <button onClick={() => navigate("/imoveis")}>Imóveis</button>
          <button onClick={() => navigate("/token")}>VKEN</button>
          <button onClick={() => navigate("/territorio")}>
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
          {user ? (
            <>
              <Button variant="ghost" onClick={() => navigate("/painel")}>Painel</Button>
              <span className="header-user">{user.name.split(" ")[0]}</span>
              <Button variant="ghost" onClick={() => session.logout()}>
                Sair
              </Button>
            </>
          ) : (
            <Button variant="ghost" onClick={() => navigate("/entrar")}>
              Entrar
            </Button>
          )}
          <Button onClick={() => navigate("/territorio")}>
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

export function Eyebrow({
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

export function Footer() {
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
            <button onClick={() => navigate("/tokenizacao")}>Tokenization</button>
            <button onClick={() => navigate("/token")}>Token VKEN</button>
          </div>
          <div>
            <strong>COMPANY</strong>
            <a className="footer-link" href="/whitepaper-imovken.pdf" download>White Paper (PDF)</a>
            <button
              onClick={() => {
                navigate("/")
                setTimeout(() => document.querySelector("#sobre")?.scrollIntoView({ behavior: "smooth" }), 50)
              }}
            >
              Sobre
            </button>
            <a className="footer-link" href="mailto:contato@imovken.com.br">Contato</a>
          </div>
          <div>
            <strong>FOLLOW</strong>
            <button disabled title="Em breve">LinkedIn</button>
            <button disabled title="Em breve">X</button>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 IMOVKEN</span>
        <div>
          <button onClick={() => navigate("/termos")}>Termos</button>
          <button onClick={() => navigate("/privacidade")}>Privacidade</button>
          <button onClick={() => navigate("/riscos")}>Aviso de riscos</button>
        </div>
        <span>BUILT FOR REAL ASSETS</span>
      </div>
    </footer>
  )
}

export function AppShell({
  children,
  title,
  subtitle,
  action,
}: {
  children: ReactNode
  title: ReactNode
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
