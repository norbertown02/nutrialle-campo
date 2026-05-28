import {
  IconClipboardList, IconReceipt, IconUserPlus,
  IconSend, IconMapPin, IconClock, IconCalendar
} from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/useAuth.jsx'
import { useFarms } from '../lib/useFarms'
import { useVisits } from '../lib/useVisits'
import { useSales } from '../lib/useSales'
import { useAppointments } from '../lib/useAppointments'

const atalhoStyle = {
  padding: '15px 6px',
  flexDirection: 'column',
  gap: 7,
  fontSize: 12
}

function saudacao() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function hoje() {
  return new Date().toISOString().slice(0, 10)
}

function mesAtual() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default function Home() {
  const navigate = useNavigate()
  const { user }  = useAuth()
  const { farms } = useFarms()
  const { visits } = useVisits()
  const { sales }  = useSales()
  const { appointments } = useAppointments()

  const primeiroNome = user?.name?.split(' ')[0] || 'Vendedor'

  // Stats reais
  const visitasHoje  = visits.filter(v => v.visitDate === hoje()).length
  const visitasMes   = visits.filter(v => v.visitDate?.startsWith(mesAtual())).length
  const vendasMes    = sales.filter(s => s.saleDate?.startsWith(mesAtual())).reduce((a, s) => a + (Number(s.total) || 0), 0)
  const novosClientes = farms.filter(f => f.createdAt?.startsWith(mesAtual())).length

  // Próximos compromissos — hoje e futuros, ordenados
  const proximosCompromissos = appointments
    .filter(a => a.status === 'agendado' && a.date >= hoje())
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''))
    .slice(0, 3)

  return (
    <div className="content">
      <div className="page-head">
        <div className="eyebrow">{saudacao()}, {primeiroNome}</div>
        <h2>Hora de visitar</h2>
        <p>
          {proximosCompromissos.length > 0
            ? `Você tem ${proximosCompromissos.length} compromisso${proximosCompromissos.length > 1 ? 's' : ''} pendente${proximosCompromissos.length > 1 ? 's' : ''}`
            : 'Nenhum compromisso agendado'}
        </p>
      </div>

      {/* Stats */}
      <div className="stat-grid">
        <div className="stat">
          <div className="label">Visitas hoje</div>
          <div className="value orange">{visitasHoje}</div>
          <div className="sub">{visitasMes} no mês</div>
        </div>
        <div className="stat">
          <div className="label">Vendas do mês</div>
          <div className="value">
            {vendasMes > 0
              ? `R$ ${(vendasMes / 1000).toFixed(1).replace('.', ',')}k`
              : '—'}
          </div>
          <div className="sub">{novosClientes} novo{novosClientes !== 1 ? 's' : ''} cliente{novosClientes !== 1 ? 's' : ''}</div>
        </div>
      </div>

      {/* Próximos compromissos */}
      <div className="section-label">Próximos compromissos</div>
      {proximosCompromissos.length === 0 ? (
        <div className="empty">
          <IconCalendar />
          <p>Nada agendado</p>
        </div>
      ) : (
        proximosCompromissos.map(apt => {
          const farm = farms.find(f => f.id === apt.farmId)
          const isHoje = apt.date === hoje()
          return (
            <div key={apt.id} className="row-item" onClick={() => navigate('/agenda')} style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: 'rgba(240,125,26,0.13)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--orange)', flexShrink: 0
                }}>
                  <IconClock size={20} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    {farm?.name || apt.title || 'Compromisso'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
                    <IconMapPin size={12} style={{ verticalAlign: -2 }} />
                    {' '}{farm?.city || apt.city || '—'}
                    {apt.time ? ` · ${apt.time}` : ''}
                    {!isHoje && ` · ${new Date(apt.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`}
                  </div>
                </div>
                {isHoje && (
                  <span style={{ fontSize: 10, background: 'rgba(240,125,26,0.15)', color: 'var(--orange)', borderRadius: 6, padding: '2px 7px', fontWeight: 600 }}>
                    HOJE
                  </span>
                )}
              </div>
            </div>
          )
        })
      )}

      {/* Atalhos */}
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
