import { AppShell, Button, Icon, navigate, type IconName } from "../ui"

type Profile = { slug: string; role: string; title: string; subtitle: string; intro: string; icon: IconName; items: [string, string][] }

export const PROFILES: Profile[] = [
  { slug: "investidores", role: "investidor", title: "Investidores", subtitle: "INTELLIGENCE FOR INVESTORS", icon: "trend",
    intro: "Encontre ativos, entenda risco e identifique potencial com mais precisão.",
    items: [["Mapa de temperatura", "Compare regiões por valorização, liquidez, oferta e demanda."], ["Análise do ativo", "Score, faixa de valor e histórico frente à média regional."], ["Relatório por região", "Leitura objetiva para anexar à sua tese de investimento."]] },
  { slug: "proprietarios", role: "proprietario", title: "Proprietários", subtitle: "INTELLIGENCE FOR OWNERS", icon: "layers",
    intro: "Conheça o valor real do seu patrimônio e prepare-o para novas possibilidades.",
    items: [["Referência de preço", "Veja o preço por m² da sua região e a tendência dos últimos 12 meses."], ["Liquidez", "Entenda quanto tempo imóveis similares levam para vender."], ["Solicitar análise", "Peça uma análise do seu imóvel à equipe IMOVKEN."]] },
  { slug: "incorporadores", role: "incorporador", title: "Incorporadores", subtitle: "INTELLIGENCE FOR DEVELOPERS", icon: "map",
    intro: "Leia o território, valide teses e tome decisões com contexto.",
    items: [["Desenvolvimento e potencial", "Identifique regiões com atividade de obras e potencial acima da valorização."], ["Oferta x demanda", "Evite regiões saturadas e encontre janelas de oportunidade."], ["Relatórios", "Material de apoio para comitês e parceiros."]] },
  { slug: "instituicoes", role: "instituicao", title: "Instituições", subtitle: "INTELLIGENCE FOR INSTITUTIONS", icon: "shield",
    intro: "Acesse dados estruturados, governança e inteligência em escala.",
    items: [["Dados estruturados", "Camadas territoriais padronizadas e com fonte identificada."], ["Governança", "Metodologia aberta e transparência sobre cada fonte de dados."], ["Integração", "Conversa sobre acesso via API e relatórios sob medida."]] },
  { slug: "corretores", role: "corretor", title: "Corretores", subtitle: "INTELLIGENCE FOR BROKERS", icon: "chart",
    intro: "Argumentos de mercado em segundos: onde o interesse está, quanto vale e quanto tempo leva para vender.",
    items: [["Temperatura por região", "Mostre ao cliente, no mapa, por que a região está aquecida."], ["Relatório para o cliente", "Gere um relatório da região pronto para imprimir ou salvar em PDF."], ["Preço de referência", "Apoie a precificação com preço/m² e prazo médio de venda."]] },
  { slug: "entusiastas", role: "entusiasta", title: "Entusiastas de imóveis", subtitle: "INTELLIGENCE FOR EVERYONE", icon: "search",
    intro: "Explore cidades, descubra regiões em alta e aprenda a ler o mercado imobiliário.",
    items: [["Explore o mapa", "Veja a temperatura do mercado em várias cidades."], ["Entenda os indicadores", "Cada camada tem explicação e metodologia."], ["Acompanhe", "Crie sua conta para acompanhar novas cidades e funcionalidades."]] },
]

export default function ProfilePage({ slug }: { slug: string }) {
  const p = PROFILES.find((x) => x.slug === slug)
  if (!p) {
    return (
      <AppShell title="Perfil não encontrado" subtitle="IMOVKEN">
        <div className="profile-body"><Button onClick={() => navigate("/")}>Voltar ao início</Button></div>
      </AppShell>
    )
  }
  return (
    <AppShell title={p.title} subtitle={p.subtitle}>
      <div className="profile-body">
        <p className="profile-intro"><Icon name={p.icon} size={22} /> {p.intro}</p>
        <div className="profile-grid">
          {p.items.map(([t, d], i) => (
            <article key={t}><span>0{i + 1}</span><h3>{t}</h3><p>{d}</p></article>
          ))}
        </div>
        <div className="profile-cta">
          <Button icon="arrow" onClick={() => navigate("/territorio")}>Ver o mapa do território</Button>
          <Button variant="secondary" onClick={() => navigate(`/cadastro?perfil=${p.role}`)}>Criar conta como {p.title.toLowerCase()}</Button>
        </div>
      </div>
    </AppShell>
  )
}
