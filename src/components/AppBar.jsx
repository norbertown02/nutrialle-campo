import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { IconUser, IconLogout, IconChevronDown, IconX } from '@tabler/icons-react'
import { useAuth } from '../lib/useAuth.jsx'
import logo from '../assets/logo-nutrialle.jpg'

const TITLES = [
  ['/clientes', 'Minha Carteira'],
  ['/agenda', 'Agenda'],
  ['/prospeccao', 'Cotações'],
  ['/vendas', 'Pedidos'],
  ['/budget', 'Previsão de Vendas'],
  ['/checklist', 'Checklists'],
  ['/visitas', 'Visitas'],
  ['/nutricao', 'Nutrição'],
  ['/precos', 'Tabela de Preços'],
  ['/dashboard-vendas', 'Meus Indicadores'],
  ['/mercado', 'Mercado'],
  ['/fazenda-dados', 'Dados da Fazenda'],
  ['/sincronizacao', 'Sincronização'],
]

export default function AppBar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [menuAberto, setMenuAberto] = useState(false)
  const page = TITLES.find(([path]) => location.pathname.startsWith(path))?.[1] || 'Visão geral'

  useEffect(() => setMenuAberto(false), [location.pathname])

  return (
    <>
      <header className="appbar campo-appbar">
        <div className="campo-appbar__identity">
          <img src={logo} alt="" />
          <span>NUTRIALLE <b>CAMPO</b></span>
        </div>
        <div className="campo-appbar__divider" />
        <h1>{page}</h1>
        <button
          type="button"
          className="campo-profile-trigger"
          onClick={() => setMenuAberto(open => !open)}
          aria-label="Abrir perfil do usuário"
          aria-expanded={menuAberto}
          aria-controls="campo-account-menu"
        >
          <span className="campo-profile-trigger__avatar"><IconUser size={17} /></span>
          <IconChevronDown size={14} className={menuAberto ? 'expanded' : ''} />
        </button>
      </header>
      {menuAberto && (
        <>
          <div className="campo-account-backdrop" onClick={() => setMenuAberto(false)} />
          <section id="campo-account-menu" className="campo-account-menu" aria-label="Perfil do usuário">
            <div className="campo-account-menu__heading">
              <span>MINHA CONTA</span>
              <button onClick={() => setMenuAberto(false)} aria-label="Fechar perfil"><IconX size={17}/></button>
            </div>
            <div className="campo-account-menu__user">
              <strong>{user?.name || 'Usuário Nutrialle'}</strong>
              <small>{user?.email}</small>
              {user?.role && <em>{user.role}</em>}
            </div>
            <button type="button" className="campo-account-menu__logout" onClick={() => { setMenuAberto(false); logout() }}>
              <IconLogout size={18} /> Sair da conta
            </button>
          </section>
        </>
      )}
    </>
  )
}
