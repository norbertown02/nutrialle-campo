import { useEffect, useMemo, useState } from 'react'
import { IconUsers, IconCalendarCheck, IconReceipt, IconFileText, IconCalendar, IconArrowLeft } from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/useAuth.jsx'

const money = n => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const dateLabel = s => s ? new Date(String(s).slice(0, 10) + 'T12:00:00').toLocaleDateString('pt-BR') : '—'
const today = () => new Date().toLocaleDateString('en-CA')
const monthStart = () => today().slice(0, 7) + '-01'
const empty = { members: [], visits: [], sales: [], quotes: [], appointments: [] }

export default function MinhaEquipe() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [start, setStart] = useState(monthStart)
  const [end, setEnd] = useState(today)
  const [seller, setSeller] = useState('todos')
  const [tab, setTab] = useState('visits')
  const [data, setData] = useState(empty)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    if (!user?.id) return
    async function load() {
      setLoading(true)
      setError('')
      const { data: response, error: err } = await supabase.rpc('campo_my_team', { p_start: start, p_end: end })
      if (!mounted) return
      if (err) {
        setData(empty)
        setError('Não foi possível consultar a equipe. Tente novamente.')
      } else {
        setData(response || empty)
      }
      setLoading(false)
    }
    load()
    return () => { mounted = false }
  }, [start, end, user?.id])

  const members = data.members || []
  const visible = useMemo(() => {
    const result = {}
    for (const type of ['visits', 'sales', 'quotes', 'appointments']) {
      result[type] = (data[type] || []).filter(item => seller === 'todos' || item.seller_id === seller)
    }
    return result
  }, [data, seller])
  const memberName = id => members.find(m => m.id === id)?.name || 'Vendedor'
  const cards = [
    { label: 'Visitas', value: visible.visits.length, Icon: IconCalendarCheck },
    { label: 'Pedidos', value: visible.sales.length, Icon: IconReceipt },
    { label: 'Valor em pedidos', value: money(visible.sales.reduce((sum, item) => sum + Number(item.total || 0), 0)), Icon: IconReceipt },
    { label: 'Cotações', value: visible.quotes.length, Icon: IconFileText },
    { label: 'Agenda', value: visible.appointments.length, Icon: IconCalendar },
  ]
  const tabs = [{ key: 'visits', label: 'Visitas' }, { key: 'sales', label: 'Pedidos' }, { key: 'quotes', label: 'Cotações' }, { key: 'appointments', label: 'Agenda' }]

  return <main className="home-pro" style={{ paddingBottom: 36 }}>
    <section className="home-hero">
      <div className="home-hero__content">
        <button onClick={() => navigate('/')} style={{ background: 'transparent', border: 0, color: 'inherit', display: 'flex', alignItems: 'center', gap: 6, padding: '0 0 18px', cursor: 'pointer' }}><IconArrowLeft size={18} /> Voltar</button>
        <div className="home-eyebrow">GESTÃO COMERCIAL</div>
        <h2>Minha <span>Equipe</span></h2>
        <p className="home-hero__subtitle">Resultados consolidados dos profissionais sob sua supervisão.</p>
      </div>
    </section>
    <section className="home-panel">
      <div className="home-kpi-card" style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontWeight: 700, marginBottom: 8 }}>Período e profissional</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <label style={{ flex: '1 1 130px' }}>De <input aria-label="Início" type="date" value={start} max={end} onChange={e => setStart(e.target.value)} style={{ display: 'block', width: '100%', padding: 9, borderRadius: 8 }} /></label>
          <label style={{ flex: '1 1 130px' }}>Até <input aria-label="Fim" type="date" value={end} min={start} onChange={e => setEnd(e.target.value)} style={{ display: 'block', width: '100%', padding: 9, borderRadius: 8 }} /></label>
          <label style={{ flex: '1 1 200px' }}>Profissional <select value={seller} onChange={e => setSeller(e.target.value)} style={{ display: 'block', width: '100%', padding: 9, borderRadius: 8 }}><option value="todos">Toda a equipe</option>{members.map(m => <option value={m.id} key={m.id}>{m.name}</option>)}</select></label>
        </div>
      </div>
      {error && <p role="alert" style={{ color: '#a33' }}>{error}</p>}
      {loading ? <p>Carregando informações da equipe...</p> : members.length === 0 ? <div className="home-kpi-card"><IconUsers size={24}/><h3>Nenhum promotor vinculado</h3><p>Os vínculos de supervisão são configurados pela administração.</p></div> : <>
        <div className="home-kpi-grid">
          {cards.map(card => <article className="home-kpi-card" key={card.label}><div className="home-kpi-card__icon"><card.Icon size={21}/></div><div className="home-kpi-card__label">{card.label}</div><div className="home-kpi-card__value home-kpi-card__value--small">{card.value}</div></article>)}
        </div>
        <div className="home-section-title" style={{ marginTop: 20 }}>Atividade comercial</div>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '10px 0' }}>{tabs.map(t => <button type="button" key={t.key} onClick={() => setTab(t.key)} style={{ border: tab === t.key ? '1px solid #e9772b' : '1px solid #ddd', borderRadius: 10, background: tab === t.key ? 'rgba(233,119,43,.12)' : 'transparent', color: 'inherit', padding: '9px 13px', fontWeight: 650 }}>{t.label}</button>)}</div>
        {visible[tab].length === 0 ? <div className="home-kpi-card">Nenhum registro no período selecionado.</div> : visible[tab].map(item => <article key={item.id} className="home-kpi-card" style={{ marginBottom: 9 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start' }}>
            <strong>{item.client || item.title || 'Registro comercial'}</strong>
            <small>{dateLabel(item.date)}</small>
          </div>
          <div style={{ fontSize: 13, opacity: .75, marginTop: 5 }}>{memberName(item.seller_id)} · {item.outcome || item.status || 'Registrado'}</div>
          {tab === 'sales' && <strong style={{ display: 'block', marginTop: 8 }}>{money(item.total)}{Number(item.quantity_kg) > 0 ? ' · ' + Number(item.quantity_kg).toLocaleString('pt-BR') + ' kg' : ''}</strong>}
          {tab === 'quotes' && <strong style={{ display: 'block', marginTop: 8 }}>{money(item.total)}</strong>}
          {tab === 'visits' && item.notes && <p style={{ marginTop: 8, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{item.notes}</p>}
        </article>)}
      </>}
    </section>
  </main>
}
