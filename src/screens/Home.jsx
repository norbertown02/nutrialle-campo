
import {
  IconClipboardList, IconReceipt, IconUserPlus,
  IconTargetArrow, IconChartBar, IconSend,
  IconMapPin, IconClock
} from '@tabler/icons-react'

import { useNavigate, Link } from 'react-router-dom'

export default function Home() {
  const navigate = useNavigate()
  // dados de demonstração — vão sair daqui quando conectar ao Supabase
  const seller = { name: 'Carlos Eduardo' }
  const stats = {
    visitsToday: 3,
    visitsTotal: 12,
    salesMonth: 38500,
    newClients: 2
  }
  const nextAppointments = [
    { id: 1, farm: 'Fazenda Boa Vista', city: 'Toledo', time: '09:30' },
    { id: 2, farm: 'Sítio Três Pinheiros', city: 'Cascavel', time: '14:00' },
  ]

  return (
    <div className="content">
      <div className="page-head">
        <div className="eyebrow">Olá, {seller.name.split(' ')[0]}</div>
        <h2>Bom dia, hora de visitar</h2>
        <p>Você tem {nextAppointments.length} compromissos hoje</p>
      </div>

      <div className="stat-grid">
        <div className="stat">
          <div className="label">Visitas hoje</div>
          <div className="value orange">{stats.visitsToday}</div>
          <div className="sub">{stats.visitsTotal} no mês</div>
        </div>
        <div className="stat">
          <div className="label">Vendas do mês</div>
          <div className="value">R$ {(stats.salesMonth/1000).toFixed(1).replace('.',',')}k</div>
          <div className="sub">{stats.newClients} novos clientes</div>
        </div>
      </div>

      <div className="section-label">Próximos compromissos</div>
      {nextAppointments.length === 0 ? (
        <div className="empty">
          <IconCalendar />
          <p>Nada agendado para hoje</p>
        </div>
      ) : (
        nextAppointments.map(apt => (
          <div key={apt.id} className="row-item">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'rgba(240,125,26,0.13)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--orange)', fontSize: 18, flexShrink: 0
              }}>
                <IconClock size={20} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{apt.farm}</div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
                  <IconMapPin size={12} style={{ verticalAlign: -2 }} /> {apt.city} · {apt.time}
                </div>
              </div>
            </div>
          </div>
        ))
      )}

      <div className="section-label">Atalhos</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
       <button className="btn btn-ghost" style={atalhoStyle} onClick={() => navigate('/clientes/novo')}>
              <IconUserPlus size={21} />
              Novo cliente
            </button>
        <button className="btn btn-ghost" style={atalhoStyle} onClick={() => navigate('/checklist')}>
          <IconClipboardList size={21} />
            Checklist
          </button>
        <button className="btn btn-ghost" style={atalhoStyle} onClick={() => navigate('/vendas/nova')}>
            <IconReceipt size={21} />
            Venda
          </button>
       
        <button className="btn btn-primary" style={atalhoStyle} onClick={() => navigate('/vendas')}>
        <IconSend size={21} />
        Fechar dia
        </button>
      </div>
    </div>
  )
}

const atalhoStyle = {
  padding: '15px 6px',
  flexDirection: 'column',
  gap: 7,
  fontSize: 12
}