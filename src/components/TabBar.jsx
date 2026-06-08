import { NavLink } from 'react-router-dom'
import {
  IconHome, IconUsers, IconFileText, IconCalendar, IconReceipt, IconTag
} from '@tabler/icons-react'

const TABS = [
  { to: '/',           label: 'Início',   Icon: IconHome },
  { to: '/clientes',   label: 'Clientes', Icon: IconUsers },
  { to: '/prospeccao', label: 'Cotações', Icon: IconFileText },
  { to: '/agenda',     label: 'Agenda',   Icon: IconCalendar },
  { to: '/vendas',     label: 'Vendas',   Icon: IconReceipt },
  { to: '/precos',     label: 'Preços',   Icon: IconTag },
]

export default function TabBar() {
  return (
    <div className="tabbar">
      {TABS.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) => 'tab' + (isActive ? ' active' : '')}
        >
          <Icon />
          <span>{label}</span>
        </NavLink>
      ))}
    </div>
  )
}
