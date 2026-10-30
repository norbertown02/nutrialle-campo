import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconAlertCircle, IconCalendarPlus, IconChevronDown,
  IconChevronRight, IconChevronUp, IconCircleCheck,
  IconClipboardCheck, IconClock, IconMapPin,
} from '@tabler/icons-react'
import '../styles/clientes-sem-visita.css'

// Calcula dias pelo calendário local do usuário, sem deslocar datas YYYY-MM-DD por fuso.
function diaCalendario(valor) {
  if (!valor || !/^\d{4}-\d{2}-\d{2}/.test(String(valor))) return null
  if (String(valor).includes('T')) {
    const data = new Date(valor)
    if (Number.isNaN(data.getTime())) return null
    return Date.UTC(data.getFullYear(), data.getMonth(), data.getDate()) / 86400000
  }
  const [ano, mes, dia] = String(valor).slice(0, 10).split('-').map(Number)
  const validacao = new Date(Date.UTC(ano, mes - 1, dia))
  if (validacao.getUTCFullYear() !== ano || validacao.getUTCMonth() !== mes - 1 || validacao.getUTCDate() !== dia) return null
  return validacao.getTime() / 86400000
}

function hojeCalendario() {
  const d = new Date()
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000
}

function dataCurta(valor) {
  if (!valor) return ''
  const partes = String(valor).slice(0, 10).split('-')
  if (partes.length !== 3) return ''
  return partes[2] + '/' + partes[1]
}

export function calcularClientesSemVisita(farms, visits, userId, hoje = hojeCalendario()) {
  if (!userId) return []
  const ultimasVisitas = new Map()
  for (const visita of visits) {
    if (!visita.farmId) continue
    const dia = diaCalendario(visita.visitDate)
    if (dia === null || dia > hoje) continue
    const anterior = ultimasVisitas.get(visita.farmId)
    if (!anterior || dia > anterior.dia) ultimasVisitas.set(visita.farmId, { dia, data: visita.visitDate })
  }
  return farms
    .filter(f => f.sellerId === userId && f.status === 'ativo' && !f.prospect)
    .map(farm => {
      const ultimaVisita = ultimasVisitas.get(farm.id)
      const dataBase = ultimaVisita?.dia ?? diaCalendario(farm.createdAt)
      if (dataBase === null) return null
      const dias = hoje - dataBase
      if (dias <= 30) return null
      return { farm, dias, ultimaVisita: ultimaVisita?.data || null }
    })
    .filter(Boolean)
    .sort((a, b) => b.dias - a.dias || a.farm.name.localeCompare(b.farm.name, 'pt-BR'))
}

export default function ClientesSemVisita({ farms, visits, appointments, userId, loading }) {
  const navigate = useNavigate()
  const [mostrarTodos, setMostrarTodos] = useState(false)
  const hoje = hojeCalendario()

  const pendentes = useMemo(
    () => calcularClientesSemVisita(farms, visits, userId, hoje),
    [farms, visits, userId, hoje]
  )
  const semHistorico = pendentes.filter(item => !item.ultimaVisita).length
  const itemsVisiveis = mostrarTodos ? pendentes : pendentes.slice(0, 3)
  const diasParaBadge = dias => String(dias) + ' dias'

  const agendamentos = useMemo(() => {
    const porCliente = new Map()
    for (const ag of appointments) {
      if (ag.status !== 'agendado' || ag.kind !== 'visita' || !ag.farmId) continue
      const dia = diaCalendario(ag.appointmentDate)
      if (dia === null || dia < hoje) continue
      const anterior = porCliente.get(ag.farmId)
      if (!anterior || ag.appointmentDate < anterior.appointmentDate) porCliente.set(ag.farmId, ag)
    }
    return porCliente
  }, [appointments, hoje])

  return (
    <section className="home-gap-card" aria-label="Clientes sem visita registrada há mais de trinta dias">
      <div className="home-gap-card__top">
        <div className="home-gap-card__kicker">
          <span className="home-gap-card__pulse" aria-hidden="true" />
          ACOMPANHAMENTO DA CARTEIRA
        </div>
        <div className="home-gap-card__heading">
          <div>
            <h3>Clientes sem visita <span>há 30+ dias</span></h3>
            <p>Priorize o relacionamento com sua carteira.</p>
          </div>
          <div className="home-gap-card__total" aria-label={String(pendentes.length) + ' clientes pendentes'}>
            {loading ? '—' : pendentes.length}
            <small>clientes</small>
          </div>
        </div>
        {!loading && pendentes.length > 0 && (
          <div className="home-gap-card__insight">
            <IconAlertCircle size={15} aria-hidden="true" />
            {semHistorico > 0
              ? String(semHistorico) + ' sem visita registrada no Campo'
              : 'Visitas vencidas há mais de 30 dias'}
          </div>
        )}
      </div>

      {loading ? (
        <div className="home-gap-card__empty">Atualizando histórico de clientes...</div>
      ) : pendentes.length === 0 ? (
        <div className="home-gap-card__empty home-gap-card__empty--ok">
          <IconCircleCheck size={27} aria-hidden="true" />
          <strong>Carteira em dia</strong>
          <p>Nenhum cliente da sua carteira está com mais de 30 dias sem visita registrada.</p>
        </div>
      ) : (
        <div className="home-gap-card__body">
          <div className="home-gap-card__list">
            {itemsVisiveis.map(({ farm, dias, ultimaVisita }) => {
              const agenda = agendamentos.get(farm.id)
              return (
                <article className="home-gap-client" key={farm.id}>
                  <div className="home-gap-client__main">
                    <button
                      className="home-gap-client__name"
                      type="button"
                      onClick={() => navigate('/clientes/' + encodeURIComponent(farm.id))}
                      aria-label={'Abrir cliente ' + farm.name}
                    >
                      <strong>{farm.name}</strong>
                      <IconChevronRight size={16} aria-hidden="true" />
                    </button>
                    <div className="home-gap-client__meta">
                      <span><IconMapPin size={13} aria-hidden="true" /> {farm.city || 'Cidade não informada'}{farm.state ? ' · ' + farm.state : ''}</span>
                    </div>
                    <div className="home-gap-client__details">
                      <span className="home-gap-client__age"><IconClock size={13} aria-hidden="true" /> {diasParaBadge(dias)}</span>
                      <span>{ultimaVisita ? 'Última visita: ' + dataCurta(ultimaVisita) : 'Sem visita registrada'}</span>
                    </div>
                    {agenda && (
                      <div className="home-gap-client__scheduled">
                        <IconCalendarPlus size={13} aria-hidden="true" />
                        Visita agendada para {dataCurta(agenda.appointmentDate)}
                      </div>
                    )}
                  </div>
                  <div className="home-gap-client__actions">
                    <button type="button" onClick={() => navigate('/visitas/nova?farm=' + encodeURIComponent(farm.id))}>
                      <IconClipboardCheck size={15} aria-hidden="true" /> Registrar
                    </button>
                    <button type="button" className="home-gap-client__schedule"
                      onClick={() => navigate('/agenda/novo?farm=' + encodeURIComponent(farm.id))}>
                      <IconCalendarPlus size={15} aria-hidden="true" /> Agendar
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
          {pendentes.length > 3 && (
            <button className="home-gap-card__expand" type="button" onClick={() => setMostrarTodos(v => !v)}
              aria-expanded={mostrarTodos}>
              {mostrarTodos
                ? 'Mostrar menos'
                : 'Ver todos os ' + pendentes.length + ' clientes'}
              {mostrarTodos ? <IconChevronUp size={17} /> : <IconChevronDown size={17} />}
            </button>
          )}
          <p className="home-gap-card__footnote">
            Contagem desde a última visita registrada; sem histórico, desde o cadastro. Agendamentos não substituem visitas realizadas.
          </p>
        </div>
      )}
    </section>
  )
}
