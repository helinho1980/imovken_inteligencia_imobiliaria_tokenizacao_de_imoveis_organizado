import type { ReactNode } from "react"
import { useMe, useSubscription } from "../api"
import { AppShell, Button, navigate } from "../ui"

// Envolve uma tela que só assinantes veem. O servidor também barra os dados; isto é só a experiência.
export default function PremiumGate({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const { user, loaded } = useMe()
  const sub = useSubscription()
  if (!loaded || !sub.ready) return <AppShell title={title} subtitle={subtitle}><div className="profile-body"><p>Carregando…</p></div></AppShell>
  if (user && sub.premium) return <>{children}</>
  return (
    <AppShell title={title} subtitle={subtitle}>
      <div className="profile-body">
        <div className="status-banner"><span><strong>Recurso do IMOVKEN Pro.</strong> {user ? "Assine para liberar esta área e o cruzamento de camadas no mapa." : "Entre na sua conta para continuar."}</span></div>
        <div className="page-actions">
          {user ? <Button icon="arrow" onClick={() => navigate("/assinatura")}>Ver o plano Pro</Button> : <Button icon="arrow" onClick={() => navigate("/entrar")}>Entrar</Button>}
          <Button variant="secondary" onClick={() => navigate("/imoveis")}>Voltar à vitrine</Button>
        </div>
      </div>
    </AppShell>
  )
}
