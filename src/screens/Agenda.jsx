import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconPlus, IconCalendar, IconMapPin, IconClock,
  IconAlertTriangle, IconCheck, IconChevronLeft, IconChevronRight,
  IconCalendarEvent, IconBuildingWarehouse
} from '@tabler/icons-react'
import { useVisits } from '../lib/useVisits'
import { useAppointments } from '../lib/useAppointments'
import { useFarms } from '../lib/useFarms'

const FORGOTTEN_DAYS = 45

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

function daysBetween(isoA, isoB) {
  const a = new Date(isoA + 'T12:00:00')
  const b = new Date(isoB + 'T12:00:00')
  return Math.round((b - a) / 86400000)
}

function formatDateBR(iso) {
  if (!iso) return ''
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  })
}

function buildCalendarMonth(year, month) {
  // month 0-indexed
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startWeekday = firstDay.getDay() // 0=domingo
  const totalDays = lastDay.getDate()

  const cells = []
  // Empty cells before day 1
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  // Days of the month
  for (let d = 1; d <= totalDays; d++) {
    const iso =
      year + '-' +
      String(month + 1).padStart(2, '0') + '-' +
      String(d).padStart(2, '0')
    cells.push({ day: d, iso })
  }
  return cells
}

const MONTH_NAMES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
]
const WEEKDAY_SHORT = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

export default function Agenda() {
  const navigate = useNavigate()
  const visitsHook = useVisits()
  const visits = visitsHook.visits
  const apptsHook = useAppointments()
  const appointments = apptsHook.appointments
  const markAsDone = apptsHook.markAsDone
  const farmsHook = useFarms()
  const farms = farmsHook.farms
  const getFarm = farmsHook.getFarm

  const today = todayISO()
  const todayParts = today.split('-').map(Number)

  const [calYear, setCalYear] = useState(todayParts[0])
  const [calMonth, setCalMonth] = useState(todayParts[1] - 1) // 0-indexed
  const [selectedDate, setSelectedDate] = useState(null)

  // 1. Compromissos automáticos a partir das visitas
  const visitAppointments = visits
    .filter(v => v.nextVisitDate)
    .map(v => ({
      id: 'vapt_' + v.id,
      type: 'visita',
      date: v.nextVisitDate,
      time: null,
      farmId: v.farmId,
      title: 'Visita de retorno',
      notes: v.notes || '',
      status: 'agendado',
    }))

  // 2. Compromissos manuais
  const manualAppointments = appointments.map(a => ({
    ...a,
    type: 'manual',
    date: a.appointmentDate,
    time: a.appointmentTime,
  }))

  // 3. Fazendas esquecidas
  const forgottenFarms = farms.filter(f => {
    const farmVisits = visits.filter(v => v.farmId === f.id)
    if (farmVisits.length === 0) {
      if (!f.createdAt) return false
      const created = f.createdAt.split('T')[0]
      return daysBetween(created, today) >= FORGOTTEN_DAYS
    }
    const lastVisit = farmVisits.map(v => v.visitDate).sort().reverse()[0]
    return daysBetween(lastVisit, today) >= FORGOTTEN_DAYS
  })

  const allItems = [...visitAppointments, ...manualAppointments]

  // Datas que têm compromisso (set para lookup rápido)
  const datesWithItems = new Set(allItems.map(i => i.date))

  // Filtra para a lista
  let listItems = allItems
  if (selectedDate) {
    listItems = allItems.filter(i => i.date === selectedDate)
  } else {
    // Sem dia selecionado: mostra próximos compromissos (não passados)
    listItems = allItems.filter(i =>
      i.status === 'agendado' && daysBetween(today, i.date) >= 0
    )
  }

  listItems = listItems.sort((a, b) => (a.date || '').localeCompare(b.date || ''))

  // KPIs
  const atrasados = allItems.filter(i =>
    i.status === 'agendado' && daysBetween(today, i.date) < 0
  ).length

  const hoje = allItems.filter(i =>
    i.date === today && i.status === 'agendado'
  ).length

  // Calendário
  const cells = buildCalendarMonth(calYear, calMonth)
  const monthLabel = MONTH_NAMES[calMonth] + ' de ' + calYear

  const prevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11)
      setCalYear(calYear - 1)
    } else {
      setCalMonth(calMonth - 1)
    }
    setSelectedDate(null)
  }

  const nextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0)
      setCalYear(calYear + 1)
    } else {
      setCalMonth(calMonth + 1)
    }
    setSelectedDate(null)
  }

  const handleDayClick = (cell) => {
    if (!cell) return
    if (selectedDate === cell.iso) {
      setSelectedDate(null) // toggle off
    } else {
      setSelectedDate(cell.iso)
    }
  }

  const isEmpty = allItems.length === 0 && forgottenFarms.length === 0

  const renderItem = (item) => {
    const farm = item.farmId ? getFarm(item.farmId) : null
    const farmName = farm ? farm.name : ''
    const daysDiff = daysBetween(today, item.date)
    const isLate = daysDiff < 0 && item.status === 'agendado'

    return (
      <div
        key={item.id}
        className="row-item"
        onClick={() => {
          if (farm) navigate('/clientes/' + farm.id)
        }}
        style={{ cursor: farm ? 'pointer' : 'default' }}
      >
        <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
          <div style={{
            width: 44,
            minHeight: 44,
            borderRadius: 12,
            background: isLate
              ? 'var(--red-bg)'
              : item.type === 'visita'
                ? 'rgba(240,125,26,0.13)'
                : 'rgba(91,151,200,0.14)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isLate
              ? 'var(--red)'
              : item.type === 'visita'
                ? 'var(--orange)'
                : 'var(--blue)',
            flexShrink: 0,
            flexDirection: 'column',
            padding: '4px'
          }}>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: 16,
              lineHeight: 1
            }}>
              {formatDateBR(item.date).split(' ')[0]}
            </div>
            <div style={{ fontSize: 9, textTransform: 'uppercase', marginTop: 1 }}>
              {formatDateBR(item.date).split(' ')[1]}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>
              {farmName || item.title}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
              {item.title}{item.time ? ' · ' + item.time : ''}
            </div>
            <div style={{
              fontSize: 11,
              color: isLate ? 'var(--red)' : 'var(--text-faint)',
              marginTop: 4,
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}>
              {isLate ? (
                <>
                  <IconAlertTriangle size={11} />
                  Atrasado ha {Math.abs(daysDiff)} {Math.abs(daysDiff) === 1 ? 'dia' : 'dias'}
                </>
              ) : (
                <>
                  <IconClock size={11} />
                  {daysDiff === 0
                    ? 'Hoje'
                    : daysDiff === 1
                      ? 'Amanha'
                      : 'Em ' + daysDiff + ' dias'}
                </>
              )}
            </div>
            {farm ? (
              <div style={{
                fontSize: 11, color: 'var(--text-faint)', marginTop: 2,
                display: 'flex', alignItems: 'center', gap: 4
              }}>
                <IconMapPin size={11} /> {farm.city}, {farm.state}
              </div>
            ) : null}
          </div>
          {item.type === 'manual' && item.status === 'agendado' ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                markAsDone(item.id)
              }}
              style={{
                background: 'var(--green-bg)',
                border: 'none',
                color: 'var(--green)',
                width: 30, height: 30, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexShrink: 0
              }}
            >
              <IconCheck size={14} />
            </button>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className="content">
      <div className="page-head">
        <div className="eyebrow">Sua semana</div>
        <h2>Agenda</h2>
        <p>
          {isEmpty
            ? 'Adicione compromissos ou agende a partir das visitas'
            : hoje + ' compromissos hoje, ' + atrasados + ' atrasados'}
        </p>
      </div>

      {/* CALENDÁRIO */}
      <div className="card" style={{ padding: 14, marginBottom: 14 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 12
        }}>
          <button
            onClick={prevMonth}
            style={{
              background: 'var(--surface-2)', border: 'none', cursor: 'pointer',
              width: 30, height: 30, borderRadius: 9,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--silver)'
            }}
          >
            <IconChevronLeft size={16} />
          </button>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 600, fontSize: 16,
            textTransform: 'capitalize', letterSpacing: 0.3
          }}>
            {monthLabel}
          </div>
          <button
            onClick={nextMonth}
            style={{
              background: 'var(--surface-2)', border: 'none', cursor: 'pointer',
              width: 30, height: 30, borderRadius: 9,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--silver)'
            }}
          >
            <IconChevronRight size={16} />
          </button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 4,
          marginBottom: 6
        }}>
          {WEEKDAY_SHORT.map((w, i) => (
            <div
              key={i}
              style={{
                textAlign: 'center',
                fontSize: 10,
                fontWeight: 600,
                color: 'var(--text-faint)',
                letterSpacing: 0.5,
                padding: '4px 0'
              }}
            >
              {w}
            </div>
          ))}
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 4
        }}>
          {cells.map((cell, idx) => {
            if (!cell) {
              return <div key={'e' + idx} style={{ aspectRatio: '1' }}></div>
            }
            const isToday = cell.iso === today
            const isSelected = cell.iso === selectedDate
            const hasItems = datesWithItems.has(cell.iso)
            const isPast = daysBetween(today, cell.iso) < 0
            const hasLate = isPast && hasItems

            return (
              <button
                key={cell.iso}
                onClick={() => handleDayClick(cell)}
                style={{
                  aspectRatio: '1',
                  borderRadius: 9,
                  border: isToday ? '1.5px solid var(--orange)' : '1px solid transparent',
                  background: isSelected
                    ? 'var(--orange)'
                    : hasItems
                      ? 'var(--surface-2)'
                      : 'transparent',
                  color: isSelected
                    ? '#1a0d00'
                    : isPast
                      ? 'var(--text-faint)'
                      : 'var(--text)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: 13,
                  fontWeight: isToday || isSelected ? 700 : 500,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  padding: 0
                }}
              >
                <span>{cell.day}</span>
                {hasItems ? (
                  <span style={{
                    position: 'absolute',
                    bottom: 4,
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    background: isSelected
                      ? '#1a0d00'
                      : hasLate
                        ? 'var(--red)'
                        : 'var(--orange)'
                  }}></span>
                ) : null}
              </button>
            )
          })}
        </div>
      </div>

      {/* KPIs e alertas */}
      {!isEmpty ? (
        <>
          <div className="stat-grid">
            <div className="stat">
              <div className="label">Hoje</div>
              <div className="value orange">{hoje}</div>
              <div className="sub">compromissos</div>
            </div>
            <div className="stat">
              <div className="label">Atrasados</div>
              <div className="value" style={{ color: atrasados > 0 ? 'var(--red)' : undefined }}>
                {atrasados}
              </div>
              <div className="sub">pendentes</div>
            </div>
          </div>

          {forgottenFarms.length > 0 ? (
            <div style={{ marginTop: 14 }}>
              <div className="hint" style={{
                background: 'var(--amber-bg)',
                borderColor: 'rgba(224,165,46,0.3)',
                color: 'var(--amber)'
              }}>
                <IconAlertTriangle size={16} />
                <div>
                  <strong>
                    {forgottenFarms.length} {forgottenFarms.length === 1 ? 'fazenda esquecida' : 'fazendas esquecidas'}
                  </strong>
                  <div style={{ fontSize: 11, marginTop: 3 }}>
                    Sem visita ha mais de {FORGOTTEN_DAYS} dias.
                  </div>
                </div>
              </div>
              {forgottenFarms.map(f => {
                const farmVisits = visits.filter(v => v.farmId === f.id)
                const lastDate = farmVisits.length > 0
                  ? farmVisits.map(v => v.visitDate).sort().reverse()[0]
                  : f.createdAt ? f.createdAt.split('T')[0] : null
                const daysSince = lastDate ? daysBetween(lastDate, today) : 0
                return (
                  <div
                    key={f.id}
                    className="row-item"
                    onClick={() => navigate('/clientes/' + f.id)}
                    style={{ marginTop: 6 }}
                  >
                    <div style={{ display: 'flex', gap: 11, alignItems: 'center' }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: 'var(--amber-bg)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--amber)', flexShrink: 0
                      }}>
                        <IconBuildingWarehouse size={18} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{f.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 1 }}>
                          {farmVisits.length === 0
                            ? 'Nunca visitada'
                            : 'Ultima visita ha ' + daysSince + ' dias'}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : null}
        </>
      ) : null}

      {/* LISTA */}
      <div className="section-label" style={{ marginTop: 18 }}>
        {selectedDate
          ? 'Compromissos de ' + formatDateBR(selectedDate)
          : 'Proximos compromissos'}
        {selectedDate ? (
          <button
            onClick={() => setSelectedDate(null)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--orange)', fontSize: 11, fontWeight: 600,
              marginLeft: 'auto', fontFamily: 'inherit'
            }}
          >
            limpar filtro
          </button>
        ) : null}
      </div>

      {listItems.length === 0 ? (
        isEmpty ? (
          <div style={{
            background: 'var(--surface)',
            border: '2px dashed var(--line)',
            borderRadius: 16,
            padding: '40px 24px',
            textAlign: 'center'
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: 20,
              background: 'rgba(240,125,26,0.13)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--orange)', margin: '0 auto 16px'
            }}>
              <IconCalendarEvent size={36} />
            </div>
            <h3 style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 22, fontWeight: 600, marginBottom: 6
            }}>
              Sua agenda esta vazia
            </h3>
            <p style={{
              fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.5,
              marginBottom: 20, maxWidth: 280, margin: '0 auto 20px'
            }}>
              Quando registrar visita com data de retorno, ela aparece aqui.
              Voce tambem pode adicionar compromissos manualmente.
            </p>
            <button
              className="btn btn-primary"
              style={{ maxWidth: 240, margin: '0 auto' }}
              onClick={() => navigate('/agenda/novo')}
            >
              <IconPlus size={18} />
              Adicionar compromisso
            </button>
          </div>
        ) : (
          <div className="empty">
            <IconCalendar />
            <p>
              {selectedDate
                ? 'Nenhum compromisso neste dia'
                : 'Nenhum compromisso futuro'}
            </p>
          </div>
        )
      ) : (
        listItems.map(renderItem)
      )}

      {!isEmpty ? (
        <button
          className="fab"
          onClick={() => navigate('/agenda/novo')}
        >
          <IconPlus />
        </button>
      ) : null}
    </div>
  )
}
