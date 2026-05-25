import { NavLink } from 'react-router-dom'
import {
  IconHome, IconUsers, IconCalendar,
  IconReceipt, IconChartLine
} from '@tabler/icons-react'

const TABS = [
  { to: '/',         label: 'Início',   Icon: IconHome },
  { to: '/clientes', label: 'Clientes', Icon: IconUsers },
  { to: '/agenda',   label: 'Agenda',   Icon: IconCalendar },
  { to: '/vendas',   label: 'Vendas',   Icon: IconReceipt },
  { to: '/mercado',  label: 'Mercado',  Icon: IconChartLine },
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