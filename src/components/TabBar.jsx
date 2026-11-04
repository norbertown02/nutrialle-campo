import { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  IconHome, IconUsers, IconFileText, IconCalendar, IconReceipt,
  IconTag, IconFlask2, IconChartBar, IconTarget, IconClipboardList,
  IconMapPin, IconDots, IconX, IconChevronRight, IconBuildingStore, IconUsersGroup
} from '@tabler/icons-react'
import logo from '../assets/logo-cotacao-header.png'
import { useAuth } from '../lib/useAuth.jsx'
import { supabase } from '../lib/supabase'

const MAIN = [
  { to: '/', label: 'Início', Icon: IconHome },
  { to: '/clientes', label: 'Carteira', Icon: IconUsers },
  { to: '/agenda', label: 'Agenda', Icon: IconCalendar },
  { to: '/prospeccao', label: 'Cotações', Icon: IconFileText },
]

const TEAM = { to: '/minha-equipe', label: 'Minha Equipe', Icon: IconUsersGroup, note: 'Visitas, pedidos e agenda da equipe' }

const MORE = [
  { to: '/vendas', label: 'Pedidos', Icon: IconReceipt, note: 'Pedidos e histórico' },
  { to: '/budget', label: 'Previsão de Vendas', Icon: IconTarget, note: 'Planejamento comercial' },
  { to: '/nutricao', label: 'Nutrição', Icon: IconFlask2, note: 'TMR e planos nutricionais' },
  { to: '/checklist', label: 'Checklists', Icon: IconClipboardList, note: 'Diagnósticos técnicos' },
  { to: '/precos', label: 'Tabela de Preços', Icon: IconTag, note: 'Produtos e preços' },
  { to: '/dashboard-vendas', label: 'Meus Indicadores', Icon: IconChartBar, note: 'Resultados e evolução' },
  { to: '/visitas/nova', label: 'Registrar Visita', Icon: IconMapPin, note: 'Atendimento em campo' },
  { to: '/mercado', label: 'Mercado', Icon: IconBuildingStore, note: 'Informações comerciais' },
]

const GROUPS = [
  { title: 'Visão geral', items: [MAIN[0]] },
  { title: 'Operação comercial', items: [MAIN[1], MAIN[2], MAIN[3], MORE[0], MORE[1]] },
  { title: 'Técnico e ferramentas', items: [MORE[2], MORE[3], MORE[4], MORE[6]] },
  { title: 'Análises', items: [MORE[5], MORE[7]] },
]

const activePath = (pathname, to) =>
  to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(to + '/')

function NavItem({ item, className = '', onClick }) {
  const { to, label, Icon } = item
  return (
    <NavLink
      to={to}
      end={to === '/'}
      onClick={onClick}
      className={({ isActive }) => `${className}${isActive ? ' active' : ''}`}
    >
      <Icon size={19} stroke={1.8} aria-hidden="true" />
      <span>{label}</span>
    </NavLink>
  )
}

export default function TabBar() {
  const [moreOpen, setMoreOpen] = useState(false)
  const [hasTeam, setHasTeam] = useState(false)
  const { user } = useAuth()
  useEffect(() => {
    let active = true
    setHasTeam(false)
    if (!user?.id) return
    supabase.from('commercial_supervision').select('seller_id').eq('supervisor_id', user.id).limit(1)
      .then(({ data, error }) => { if (active && !error) setHasTeam((data || []).length > 0) })
    return () => { active = false }
  }, [user?.id])
  const groups = hasTeam ? GROUPS.map(g => g.title === 'Análises' ? { ...g, items: [TEAM, ...g.items] } : g) : GROUPS
  const moreItems = hasTeam ? [TEAM, ...MORE] : MORE
  const location = useLocation()
  const navigate = useNavigate()
  const moreActive = moreItems.some(item => activePath(location.pathname, item.to))

  useEffect(() => setMoreOpen(false), [location.pathname])

  useEffect(() => {
    if (!moreOpen) return
    const onKey = e => { if (e.key === 'Escape') setMoreOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [moreOpen])

  return (
    <>
      <aside className="campo-sidebar" aria-label="Menu principal">
        <div className="campo-sidebar__brand">
          <img src={logo} alt="Nutrialle" />
        </div>
        <nav className="campo-sidebar__nav">
          {groups.map(group => (
            <div key={group.title} className="campo-nav-group">
              <div className="campo-nav-group__title">{group.title}</div>
              {group.items.map(item => (
                <NavItem key={item.to} item={item} className="campo-side-link" />
              ))}
            </div>
          ))}
        </nav>
        <div className="campo-sidebar__footer"><span className="campo-sidebar__status" /> NUTRIALLE · INTELIGÊNCIA EM CAMPO</div>
      </aside>

      <nav className="tabbar campo-mobile-tabs" aria-label="Navegação principal">
        {MAIN.map(item => <NavItem key={item.to} item={item} className="tab" />)}
        <button
          type="button"
          className={`tab campo-tab-more${moreActive || moreOpen ? ' active' : ''}`}
          onClick={() => setMoreOpen(v => !v)}
          aria-label="Abrir demais funcionalidades"
          aria-expanded={moreOpen}
          aria-controls="campo-more-menu"
        >
          <IconDots size={22} stroke={1.8} aria-hidden="true" />
          <span>Mais</span>
        </button>
      </nav>

      {moreOpen && (
        <div className="campo-more-backdrop" onClick={() => setMoreOpen(false)}>
          <section
            id="campo-more-menu"
            className="campo-more-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Mais funcionalidades"
            onClick={e => e.stopPropagation()}
          >
            <div className="campo-more-sheet__head">
              <div>
                <span className="campo-more-sheet__eyebrow">NAVEGAÇÃO</span>
                <h2>Mais funcionalidades</h2>
              </div>
              <button className="campo-more-close" onClick={() => setMoreOpen(false)} aria-label="Fechar menu"><IconX size={20} /></button>
            </div>
            <div className="campo-more-sheet__list">
              {MORE.map(({ to, label, Icon, note }) => (
                <button
                  key={to}
                  type="button"
                  className={`campo-more-option${activePath(location.pathname, to) ? ' active' : ''}`}
                  onClick={() => { setMoreOpen(false); navigate(to) }}
                >
                  <span className="campo-more-option__icon"><Icon size={20} stroke={1.8} /></span>
                  <span className="campo-more-option__text"><strong>{label}</strong><small>{note}</small></span>
                  <IconChevronRight size={17} className="campo-more-option__arrow" aria-hidden="true" />
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </>
  )
}
