import {
  IconClipboardList,
  IconUserPlus,
  IconMapPin,
  IconClock,
  IconCalendar,
  IconFileText,
  IconChartBar,
  IconSend,
  IconArrowRight,
  IconUsers,
  IconTrendingUp,
  IconChevronRight,
  IconCircleCheck,
} from '@tabler/icons-react'

import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/useAuth.jsx'
import { useFarms } from '../lib/useFarms'
import { useVisits } from '../lib/useVisits'
import { useSales } from '../lib/useSales'
import { useAppointments } from '../lib/useAppointments'

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

function fmtMoeda(n) {
  const valor = Number(n) || 0

  if (valor >= 1000000) return `R$ ${(valor / 1000000).toFixed(1)}M`
  if (valor >= 1000) return `R$ ${(valor / 1000).toFixed(0)}k`

  return `R$ ${valor.toFixed(0)}`
}

function formatarData(data) {
  if (!data) return '—'

  return new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  })
}

export default function Home() {
  const navigate = useNavigate()

  const { user } = useAuth()
  const { farms } = useFarms()
  const { visits } = useVisits()
  const { sales } = useSales()
  const { appointments } = useAppointments()

  const primeiroNome = user?.name?.split(' ')[0] || 'Vendedor'

  const visitasHoje = visits.filter(v => v.visitDate === hoje()).length
  const visitasMes = visits.filter(v => v.visitDate?.startsWith(mesAtual())).length
  const vendasMes = sales
    .filter(s => s.saleDate?.startsWith(mesAtual()))
    .reduce((a, s) => a + (Number(s.total) || 0), 0)

  const totalClientes = farms.length

  const propostasMes = sales.filter(s => s.saleDate?.startsWith(mesAtual())).length

  const proximosCompromissos = appointments
    .filter(a => a.status === 'agendado' && a.appointmentDate >= hoje())
    .sort((a, b) => (a.appointmentDate || '').localeCompare(b.appointmentDate || ''))
    .slice(0, 3)

  const kpis = [
    {
      icon: <IconMapPin size={21} />,
      label: 'Visitas hoje',
      value: visitasHoje,
      sub: `${visitasMes} no mês`,
    },
    {
      icon: <IconUsers size={21} />,
      label: 'Clientes',
      value: totalClientes,
      sub: 'na carteira',
    },
    {
      icon: <IconCalendar size={21} />,
      label: 'Visitas no mês',
      value: visitasMes,
      sub: 'registradas',
    },
    {
      icon: <IconTrendingUp size={21} />,
      label: 'Vendas no mês',
      value: fmtMoeda(vendasMes),
      sub: `${propostasMes} proposta${propostasMes === 1 ? '' : 's'}`,
      wideValue: true,
    },
  ]

  const quickActions = [
    {
      icon: <IconUserPlus size={20} />,
      label: 'Nova Fazenda',
      path: '/clientes/novo',
    },
    {
      icon: <IconClipboardList size={20} />,
      label: 'Checklist',
      path: '/checklist',
    },
    {
      icon: <IconSend size={20} />,
      label: 'Agendar',
      path: '/agenda/novo',
    },
  ]

  return (
    <main className="home-pro">

      <section className="home-hero">
        <div className="home-hero__glow" />
        <div className="home-hero__brand-shape" aria-hidden="true">
          <svg viewBox="0 0 260 220" fill="none">
            <path
              d="M79 181C47 139 39 96 61 47C91 76 108 110 105 157C104 170 96 178 79 181Z"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M77 175C78 132 75 99 66 68"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M80 127C91 116 99 104 103 91"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx="184" cy="60" r="36" stroke="currentColor" strokeWidth="2" />
            <circle cx="202" cy="151" r="35" stroke="currentColor" strokeWidth="2" />
            <circle cx="118" cy="160" r="34" stroke="currentColor" strokeWidth="2" />
            <path d="M151 86L132 132" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <path d="M176 96L191 119" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>

        <div className="home-hero__content">
          <div className="home-eyebrow">{saudacao()}</div>

          <h2>
            Olá, <span>{primeiroNome}</span>
          </h2>

          <p className="home-hero__subtitle">
            Pronto para mais um dia de resultados.
          </p>

          <div className="home-today-card">
            <div className="home-today-card__icon">
              <IconCalendar size={22} />
            </div>

            <div>
              <strong>
                <span>{proximosCompromissos.length}</span>
                {' '}
                compromisso{proximosCompromissos.length === 1 ? '' : 's'} hoje
              </strong>

              <p>
                {proximosCompromissos.length > 0
                  ? 'Você possui agenda para acompanhar'
                  : 'Sua agenda está livre'}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="home-panel">

        <div className="home-kpi-grid">
          {kpis.map((kpi, index) => (
            <article className="home-kpi-card" key={index}>
              <div className="home-kpi-card__icon">
                {kpi.icon}
              </div>

              <div className="home-kpi-card__label">
                {kpi.label}
              </div>

              <div className={kpi.wideValue ? 'home-kpi-card__value home-kpi-card__value--small' : 'home-kpi-card__value'}>
                {kpi.value}
              </div>

              <div className="home-kpi-card__sub">
                {kpi.sub}
              </div>
            </article>
          ))}
        </div>

        <div className="home-main-actions">
          <button
            type="button"
            className="home-action-card home-action-card--orange"
            onClick={() => navigate('/prospeccao/nova')}
          >
            <span className="home-action-card__icon">
              <IconFileText size={26} />
            </span>

            <span className="home-action-card__text">
              <strong>Nova Cotação</strong>
              <small>Crie uma proposta para seu cliente</small>
            </span>

            <span className="home-action-card__arrow">
              <IconArrowRight size={24} />
            </span>
          </button>

          <button
            type="button"
            className="home-action-card home-action-card--dark"
            onClick={() => navigate('/visitas/nova')}
          >
            <span className="home-action-card__icon">
              <IconMapPin size={26} />
            </span>

            <span className="home-action-card__text">
              <strong>Registrar Visita</strong>
              <small>Registre uma visita e acompanhe</small>
            </span>

            <span className="home-action-card__arrow">
              <IconArrowRight size={24} />
            </span>
          </button>
        </div>

        <div className="home-section-title">
          Ações rápidas
        </div>

        <div className="home-quick-actions">
          {quickActions.map((action, index) => (
            <button
              key={index}
              type="button"
              className="home-quick-action"
              onClick={() => navigate(action.path)}
            >
              <span>{action.icon}</span>
              <strong>{action.label}</strong>
            </button>
          ))}
        </div>

        <div className="home-agenda-card">
          <div className="home-agenda-card__header">
            <strong>Próximos compromissos</strong>

            <button type="button" onClick={() => navigate('/agenda')}>
              Ver agenda
              <IconChevronRight size={16} />
            </button>
          </div>

          {proximosCompromissos.length === 0 ? (
            <div className="home-empty-agenda">
              <div className="home-empty-agenda__icon">
                <IconCircleCheck size={28} />
              </div>

              <h3>Sua agenda está livre</h3>
              <p>Que tal agendar uma visita ou compromisso?</p>

              <button type="button" onClick={() => navigate('/agenda/novo')}>
                Agendar compromisso
                <IconArrowRight size={18} />
              </button>
            </div>
          ) : (
            <div className="home-appointments-list">
              {proximosCompromissos.map(apt => {
                const farm = farms.find(f => f.id === apt.farmId)
                const ehHoje = apt.appointmentDate === hoje()

                return (
                  <button
                    key={apt.id}
                    type="button"
                    className={ehHoje ? 'home-appointment home-appointment--today' : 'home-appointment'}
                    onClick={() => navigate('/agenda')}
                  >
                    <span className="home-appointment__icon">
                      <IconClock size={18} />
                    </span>

                    <span className="home-appointment__body">
                      <strong>
                        {farm?.name || apt.title || 'Compromisso'}
                      </strong>

                      <small>
                        {farm?.city || apt.city || '—'}
                        {apt.appointmentTime ? ` · ${apt.appointmentTime.slice(0, 5)}` : ''}
                        {!ehHoje ? ` · ${formatarData(apt.appointmentDate)}` : ''}
                      </small>
                    </span>

                    {ehHoje && (
                      <span className="home-appointment__badge">
                        Hoje
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <button
          type="button"
          className="home-dashboard-link"
          onClick={() => navigate('/dashboard-vendas')}
        >
          <span>
            <IconChartBar size={22} />
          </span>

          <strong>Ver dashboard completo</strong>

          <IconArrowRight size={20} />
        </button>

      </section>
    </main>
  )
}