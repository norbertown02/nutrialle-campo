import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconArrowLeft, IconUsersGroup, IconCalendarCheck, IconReceipt,
  IconFileText, IconCalendar, IconChevronRight, IconArrowUpRight,
  IconChartBar, IconRefresh, IconSearch, IconX,
} from '@tabler/icons-react'
import {
  ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis,
  Tooltip, BarChart, Bar,
} from 'recharts'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/useAuth.jsx'
import { visitPurposeLabel, visitReasonLabel } from '../data/visitReasons'
import '../styles/dashboard-vendas-v2.css'
import '../styles/minha-equipe.css'

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const INT = new Intl.NumberFormat('pt-BR')
const money = n => BRL.format(Number(n || 0))
const compact = n => {
  const v = Number(n || 0)
  return Math.abs(v) >= 1000000 ? `R$ ${(v / 1000000).toFixed(1).replace('.', ',')} mi`
    : Math.abs(v) >= 1000 ? `R$ ${(v / 1000).toFixed(1).replace('.', ',')} mil` : money(v)
}
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const dateLabel = s => s ? new Date(String(s).slice(0, 10) + 'T12:00:00').toLocaleDateString('pt-BR') : '—'
const empty = { members: [], visits: [], sales: [], quotes: [], appointments: [] }
const activityTabs = [
  { key: 'visits', label: 'Visitas', Icon: IconCalendarCheck },
  { key: 'quotes', label: 'Cotações', Icon: IconFileText },
  { key: 'sales', label: 'Pedidos', Icon: IconReceipt },
  { key: 'appointments', label: 'Agenda', Icon: IconCalendar },
]
const sum = (rows, field) => rows.reduce((acc, row) => acc + Number(row[field] || 0), 0)
const statusText = value => String(value || 'Registrado').replaceAll('_', ' ')

function chartSeries(sales, start, end) {
  const totals = new Map()
  sales.forEach(s => {
    const day = String(s.date || '').slice(0, 10)
    totals.set(day, (totals.get(day) || 0) + Number(s.total || 0))
  })
  const result = []
  const cursor = new Date(start + 'T12:00:00')
  const last = new Date(end + 'T12:00:00')
  if (Number.isNaN(cursor.valueOf()) || Number.isNaN(last.valueOf())) return []
  while (cursor <= last && result.length < 370) {
    const day = iso(cursor)
    result.push({ day, label: cursor.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }), valor: totals.get(day) || 0 })
    cursor.setDate(cursor.getDate() + 1)
  }
  if (result.length > 65) {
    const buckets = new Map()
    result.forEach(item => {
      const key = item.day.slice(0, 7)
      buckets.set(key, (buckets.get(key) || 0) + item.valor)
    })
    return [...buckets].map(([key, valor]) => ({ day: key, label: new Date(key + '-15T12:00:00').toLocaleDateString('pt-BR', { month: 'short' }), valor }))
  }
  return result
}

function Stat({ label, value, Icon, sub }) {
  return <article className="team-stat">
    <span className="team-stat-icon"><Icon size={22} stroke={1.7}/></span>
    <div className="team-stat-content">
      <span className="team-stat-label">{label}</span>
      <strong>{value}</strong>
      {sub && <small>{sub}</small>}
    </div>
  </article>
}

const visitOutcomeLabel = outcome => {
  const normalized = String(outcome || '').toLowerCase()
  return { positiva: 'Positiva', neutra: 'Neutra', negativa: 'Negativa' }[normalized] || statusText(outcome)
}

function Activity({ row, type, owner, onOpenVisit }) {
  const titles = { visits: 'Visita', sales: 'Pedido', quotes: 'Cotação', appointments: 'Compromisso' }
  const content = <>
    <div className="team-activity-top">
      <strong>{row.client || row.title || titles[type]}</strong>
      <span>{dateLabel(row.date)}</span>
    </div>
    <div className="team-activity-meta">
      <span>{owner}</span>
      <span className="team-separator">·</span>
      <span>{type === 'visits' ? visitOutcomeLabel(row.outcome) : statusText(row.outcome || row.status)}</span>
    </div>
    {(type === 'sales' || type === 'quotes') && <div className="team-activity-amount">{money(row.total)}{type === 'sales' && Number(row.quantity_kg) > 0 ? ` · ${INT.format(Number(row.quantity_kg))} kg` : ''}</div>}
    {type === 'visits' && row.notes && <p className="team-activity-notes">{row.notes}</p>}
    {type === 'visits' && <div className="team-activity-open-link">Ver detalhes da visita <IconChevronRight size={16}/></div>}
  </>

  return type === 'visits'
    ? <button type="button" className="team-activity team-activity-clickable" onClick={() => onOpenVisit(row)} aria-label={`Ver todos os detalhes da visita a ${row.client || 'cliente'} em ${dateLabel(row.date)}`}>{content}</button>
    : <article className="team-activity">{content}</article>
}

function VisitDetails({ visit, owner, onClose }) {
  const motivos = Array.isArray(visit.outcome_reasons) ? visit.outcome_reasons : []

  return <div className="team-visit-overlay" onClick={onClose}>
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="team-visit-title"
      aria-describedby="team-visit-subtitle"
      className="team-visit-modal"
      onClick={event => event.stopPropagation()}
    >
      <header className="team-visit-header">
        <div>
          <span className="team-visit-eyebrow"><IconCalendarCheck size={16}/> Registro de visita</span>
          <h2 id="team-visit-title">{visit.client || 'Cliente não identificado'}</h2>
          <p id="team-visit-subtitle">{dateLabel(visit.date)} · {owner}</p>
        </div>
        <button type="button" className="team-visit-close" onClick={onClose} aria-label="Fechar detalhes da visita" autoFocus><IconX size={20}/></button>
      </header>

      <div className="team-visit-content">
        <div className="team-visit-facts">
          <div><small>Resultado</small><strong>{visitOutcomeLabel(visit.outcome)}</strong></div>
          <div><small>Objetivo</small><strong>{visitPurposeLabel(visit.visit_purpose)}</strong></div>
          <div><small>Próxima visita</small><strong>{dateLabel(visit.next_visit_date)}</strong></div>
          <div><small>Produto relacionado</small><strong>{visit.related_product_id || 'Não informado'}</strong></div>
        </div>

        <section className="team-visit-section">
          <h3>Motivos registrados</h3>
          <p>{motivos.length > 0 ? motivos.map(visitReasonLabel).join('; ') : 'Nenhum motivo registrado.'}</p>
        </section>

        <section className="team-visit-section">
          <h3>Anotações do vendedor</h3>
          <p className="team-visit-notes-full">{String(visit.notes || '').trim() || 'Nenhuma anotação registrada nesta visita.'}</p>
        </section>
      </div>
    </section>
  </div>
}

export default function MinhaEquipe() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const now = new Date()
  const [mode, setMode] = useState('month')
  const [month, setMonth] = useState(iso(now).slice(0, 7))
  const [selectedId, setSelectedId] = useState(null)
  const [tab, setTab] = useState('visits')
  const [openVisit, setOpenVisit] = useState(null)
  const [search, setSearch] = useState('')
  const [payload, setPayload] = useState(empty)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!openVisit) return undefined
    const handleEscape = event => {
      if (event.key === 'Escape') setOpenVisit(null)
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [openVisit])

  const period = useMemo(() => {
    const [year, monthIndex] = month.split('-').map(Number)
    const first = mode === 'year' ? new Date(year, 0, 1) : new Date(year, monthIndex - 1, 1)
    const last = mode === 'year' ? new Date(year, 11, 31) : new Date(year, monthIndex, 0)
    return { start: iso(first), end: iso(last) }
  }, [mode, month])

  useEffect(() => {
    let active = true
    if (!user?.id) return
    const fetchTeam = async () => {
      setLoading(true)
      setError('')
      const { data, error: queryError } = await supabase.rpc('campo_my_team', { p_start: period.start, p_end: period.end })
      if (!active) return
      if (queryError) {
        setPayload(empty)
        setError('Não foi possível carregar os indicadores. Tente novamente.')
      } else {
        setPayload(data || empty)
      }
      setLoading(false)
    }
    fetchTeam()
    return () => { active = false }
  }, [period.start, period.end, user?.id])

  const members = payload.members || []
  const selected = members.find(person => person.id === selectedId)
  const rows = useMemo(() => {
    const result = {}
    activityTabs.forEach(({ key }) => {
      result[key] = (payload[key] || []).filter(record => !selectedId || record.seller_id === selectedId)
    })
    return result
  }, [payload, selectedId])
  const names = useMemo(() => new Map(members.map(person => [person.id, person.name])), [members])
  const total = sum(rows.sales, 'total')
  const quotesConverted = rows.quotes.filter(q => String(q.status || '').toLowerCase().includes('convert')).length
  const series = useMemo(() => chartSeries(rows.sales, period.start, period.end), [rows.sales, period])
  const ranking = useMemo(() => members.map(person => {
    const sales = (payload.sales || []).filter(s => s.seller_id === person.id)
    return {
      ...person,
      orders: sales.length,
      value: sum(sales, 'total'),
      visits: (payload.visits || []).filter(v => v.seller_id === person.id).length,
      quotes: (payload.quotes || []).filter(q => q.seller_id === person.id).length,
    }
  }).sort((a, b) => b.value - a.value), [members, payload])
  const filtered = ranking.filter(person => person.name.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')))
  const chartData = ranking.map(p => ({ name: p.name.split(' ')[0], value: p.value, fullName: p.name }))

  return <main className="dash-page team-page">
    <header className="dash-hero team-hero">
      <div className="team-hero-inner">
        <button type="button" className="team-back" onClick={() => selectedId ? setSelectedId(null) : navigate('/')}>
          <IconArrowLeft size={18}/> {selectedId ? 'Voltar à equipe' : 'Voltar'}
        </button>
        <span className="team-eyebrow"><IconUsersGroup size={17}/> SUPERVISÃO COMERCIAL</span>
        <h1>{selected ? selected.name : 'Minha Equipe'}</h1>
        <p>{selected ? 'Visão individual de visitas, cotações e pedidos.' : 'Resultados consolidados e desempenho dos profissionais da sua equipe.'}</p>
        <div className="team-filters">
          <div className="team-period-tabs" role="group" aria-label="Período">
            <button type="button" className={mode === 'month' ? 'active' : ''} onClick={() => setMode('month')}>Mês</button>
            <button type="button" className={mode === 'year' ? 'active' : ''} onClick={() => setMode('year')}>Ano</button>
          </div>
          <label className="team-month-label">Período
            <input aria-label="Mês de referência" type="month" value={month} onChange={e => { if (e.target.value) setMonth(e.target.value) }} />
          </label>
          {selected && <button className="team-filter-return" type="button" onClick={() => setSelectedId(null)}><IconUsersGroup size={16}/> Equipe completa</button>}
        </div>
      </div>
    </header>

    <div className="team-content">
      {error && <div className="team-feedback" role="alert">{error}</div>}
      {loading ? <div className="team-feedback">Carregando indicadores...</div> : members.length === 0
        ? <div className="team-feedback"><IconUsersGroup size={28}/> Nenhuma equipe vinculada. Peça à administração para cadastrar os vendedores do supervisor.</div>
        : <>
          <section className="team-stats" aria-label="Indicadores comerciais">
            <Stat label="Pedidos" value={compact(total)} Icon={IconReceipt} sub={`${INT.format(rows.sales.length)} pedidos no período`}/>
            <Stat label="Visitas realizadas" value={INT.format(rows.visits.length)} Icon={IconCalendarCheck}/>
            <Stat label="Cotações" value={INT.format(rows.quotes.length)} Icon={IconFileText} sub={`${quotesConverted} convertidas`}/>
            <Stat label="Volume em pedidos" value={`${INT.format(sum(rows.sales, 'quantity_kg'))} kg`} Icon={IconChartBar}/>
          </section>

          <div className="team-charts">
            <section className="team-card">
              <div className="team-card-heading"><div><span>RESULTADO COMERCIAL</span><h2>Evolução de pedidos</h2></div><IconArrowUpRight size={20}/></div>
              <div className="team-chart-holder">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={series} margin={{ top: 12, right: 8, left: -12, bottom: 0 }}>
                    <defs><linearGradient id="team-area-gradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#e87722" stopOpacity={0.22}/><stop offset="100%" stopColor="#e87722" stopOpacity={0.015}/></linearGradient></defs>
                    <CartesianGrid vertical={false} stroke="#eee8e2" strokeDasharray="3 4"/>
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#89837d' }} interval="preserveStartEnd" axisLine={false} tickLine={false} minTickGap={25}/>
                    <YAxis tickFormatter={compact} width={78} tick={{ fontSize: 10, fill: '#89837d' }} axisLine={false} tickLine={false}/>
                    <Tooltip formatter={v => [money(v), 'Pedidos']} labelStyle={{ color: '#151515' }} contentStyle={{ borderRadius: 12, border: '1px solid #eee' }}/>
                    <Area type="monotone" dataKey="valor" stroke="#e87722" strokeWidth={2.5} fill="url(#team-area-gradient)"/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>
            {!selected && <section className="team-card">
              <div className="team-card-heading"><div><span>COMPARATIVO DA EQUIPE</span><h2>Pedidos por vendedor</h2></div></div>
              <div className="team-chart-holder">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ top: 6, left: 0, right: 10, bottom: 0 }}>
                    <CartesianGrid horizontal={false} stroke="#eee8e2" strokeDasharray="3 4"/>
                    <XAxis type="number" tickFormatter={compact} tick={{ fontSize: 10, fill: '#89837d' }} axisLine={false} tickLine={false}/>
                    <YAxis dataKey="name" type="category" width={78} tick={{ fontSize: 11 }} axisLine={false} tickLine={false}/>
                    <Tooltip formatter={v => [money(v), 'Pedidos']} labelFormatter={(_, items) => items?.[0]?.payload?.fullName || ''} contentStyle={{ borderRadius: 12, border: '1px solid #eee' }}/>
                    <Bar dataKey="value" fill="#e87722" radius={[0, 7, 7, 0]} maxBarSize={29}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>}
          </div>

          {!selected && <section className="team-card team-members-section">
            <div className="team-card-heading"><div><span>ESTRUTURA COMERCIAL</span><h2>Profissionais da equipe <small>({ranking.length})</small></h2></div></div>
            <label className="team-search"><IconSearch size={18}/><input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar vendedor" aria-label="Buscar vendedor"/></label>
            <div className="team-members">
              {filtered.map(person => <button type="button" className="team-member" key={person.id} onClick={() => { setSelectedId(person.id); setTab('visits') }}>
                <span className="team-avatar">{person.name.trim().split(/\s+/).slice(0, 2).map(n => n[0]).join('').toUpperCase()}</span>
                <span className="team-member-info"><strong>{person.name}</strong><small>{person.visits} visitas · {person.quotes} cotações · {person.orders} pedidos</small></span>
                <span className="team-member-value">{compact(person.value)}</span><IconChevronRight size={19} className="team-member-arrow"/>
              </button>)}
              {filtered.length === 0 && <p className="team-empty">Nenhum profissional encontrado.</p>}
            </div>
          </section>}

          <section className="team-card team-activities">
            <div className="team-card-heading"><div><span>ATIVIDADE COMERCIAL</span><h2>{selected ? `Histórico de ${selected.name.split(' ')[0]}` : 'Histórico da equipe'}</h2></div></div>
            <div className="team-tabs" role="tablist" aria-label="Tipo de atividade">
              {activityTabs.map(({ key, label, Icon }) => <button type="button" role="tab" aria-selected={tab === key} className={tab === key ? 'active' : ''} key={key} onClick={() => setTab(key)}><Icon size={16}/>{label}<span>{rows[key].length}</span></button>)}
            </div>
            <div className="team-activity-list">
              {rows[tab].length === 0 ? <p className="team-empty">Nenhum registro encontrado para este período.</p> : rows[tab].map(row => <Activity key={row.id} row={row} type={tab} owner={names.get(row.seller_id) || 'Vendedor'} onOpenVisit={setOpenVisit}/>)}
            </div>
          </section>
        </>
      }
    </div>
    {openVisit && <VisitDetails visit={openVisit} owner={names.get(openVisit.seller_id) || 'Vendedor'} onClose={() => setOpenVisit(null)}/>}
  </main>
}
