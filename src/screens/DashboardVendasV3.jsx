import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconArrowLeft,
  IconCalendar,
  IconChevronDown,
  IconFileText,
  IconTarget,
  IconReceipt2,
  IconTrendingUp,
  IconUsers,
} from '@tabler/icons-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/useAuth.jsx'
import '../styles/dashboard-vendas-v3.css'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const MESES_CURTOS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

const moeda = n => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const numero = n => Number(n || 0).toLocaleString('pt-BR')
const pct = n => `${Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`

function moedaCompacta(n) {
  const v = Number(n || 0)
  if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1).replace('.', ',')} mi`
  if (Math.abs(v) >= 1000) return `R$ ${Math.round(v / 1000)} mil`
  return moeda(v)
}

function isoLocal(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const fimMes = (ano, mes) => new Date(ano, mes + 1, 0)

function periodoConfig(tipo, ano, mes, trimestre) {
  if (tipo === 'year') return {
    inicio: new Date(ano, 0, 1), fim: new Date(ano, 11, 31),
    anteriorInicio: new Date(ano - 1, 0, 1), anteriorFim: new Date(ano - 1, 11, 31),
    titulo: String(ano), anteriorLabel: String(ano - 1), granularidade: 'Mensal',
  }
  if (tipo === 'quarter') {
    const m0 = (trimestre - 1) * 3
    const antFim = new Date(ano, m0, 0)
    return {
      inicio: new Date(ano, m0, 1), fim: fimMes(ano, m0 + 2),
      anteriorInicio: new Date(antFim.getFullYear(), antFim.getMonth() - 2, 1), anteriorFim: antFim,
      titulo: `${trimestre}º trimestre de ${ano}`, anteriorLabel: 'Trimestre anterior', granularidade: 'Mensal',
    }
  }
  const antFim = new Date(ano, mes, 0)
  return {
    inicio: new Date(ano, mes, 1), fim: fimMes(ano, mes),
    anteriorInicio: new Date(antFim.getFullYear(), antFim.getMonth(), 1), anteriorFim: antFim,
    titulo: `${MESES[mes]} de ${ano}`, anteriorLabel: 'Mês anterior', granularidade: 'Diário',
  }
}

function variacao(atual, anterior) {
  const a = Number(atual || 0), b = Number(anterior || 0)
  if (!a && !b) return 0
  if (!b) return 100
  return ((a - b) / b) * 100
}

const saleDate = s => s.sale_date || s.saleDate || s.created_at?.slice(0, 10)
const quoteDate = q => q.created_at?.slice(0, 10) || q.quote_date || q.date

function pertence(row, farmsById, user) {
  if (!user?.id) return true
  const u = Number(user?.profile?.ultra_salesman_id)
  const r = Number(row?.ultra_salesman_id)
  if (u > 0 && r > 0) return u === r
  if (row?.seller_id) return row.seller_id === user.id
  return !farmsById[row?.farm_id]?.seller_id || farmsById[row?.farm_id]?.seller_id === user.id
}

function seriePeriodo(sales, inicio, fim, tipo) {
  if (tipo === 'month') {
    const out = []
    const d = new Date(inicio)
    while (d <= fim) {
      const key = isoLocal(d)
      out.push({
        key,
        label: String(d.getDate()).padStart(2, '0'),
        tooltip: d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
        value: sales.filter(s => saleDate(s) === key).reduce((a, s) => a + Number(s.total || 0), 0),
      })
      d.setDate(d.getDate() + 1)
    }
    return out
  }
  const out = []
  const d = new Date(inicio.getFullYear(), inicio.getMonth(), 1)
  while (d <= fim) {
    const y = d.getFullYear(), m = d.getMonth()
    const ini = isoLocal(new Date(y, m, 1)), end = isoLocal(fimMes(y, m))
    out.push({
      key: `${y}-${String(m + 1).padStart(2, '0')}`,
      label: MESES_CURTOS[m], tooltip: `${MESES[m]} de ${y}`,
      value: sales.filter(s => { const x = saleDate(s); return x >= ini && x <= end }).reduce((a, s) => a + Number(s.total || 0), 0),
    })
    d.setMonth(d.getMonth() + 1)
  }
  return out
}

function SalesChart({ data, previous, previousLabel }) {
  const [hover, setHover] = useState(null)
  const W = 760, H = 270, L = 56, R = 18, T = 24, B = 42
  const cw = W - L - R, ch = H - T - B
  const max = Math.max(1, ...data.map(x => x.value), ...previous.map(x => x.value)) * 1.12
  const pts = list => list.map((d, i) => ({ ...d, x: L + (i / Math.max(1, list.length - 1)) * cw, y: T + ch - (d.value / max) * ch }))
  const atual = pts(data), ant = pts(previous)
  const path = list => list.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ')
  const labelStep = data.length > 15 ? Math.ceil(data.length / 7) : 1

  return <div className="dv3-chart-wrap" onMouseLeave={() => setHover(null)}>
    <svg viewBox={`0 0 ${W} ${H}`} className="dv3-chart">
      <defs>
        <linearGradient id="dv3Line" x1="0" x2="1"><stop offset="0%" stopColor="#c65300"/><stop offset="100%" stopColor="#ff8a3d"/></linearGradient>
        <linearGradient id="dv3Area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#e87722" stopOpacity=".18"/><stop offset="100%" stopColor="#e87722" stopOpacity="0"/></linearGradient>
      </defs>
      {[0, .25, .5, .75, 1].map((f, i) => {
        const y = T + ch * f, value = max * (1 - f)
        return <g key={i}><line x1={L} x2={W-R} y1={y} y2={y} className="dv3-grid"/><text x={L-9} y={y+4} textAnchor="end" className="dv3-axis">{moedaCompacta(value).replace('R$ ','')}</text></g>
      })}
      {atual.length > 1 && <path d={`${path(atual)} L ${atual[atual.length-1].x} ${T+ch} L ${atual[0].x} ${T+ch} Z`} fill="url(#dv3Area)"/>}
      {ant.length > 1 && <path d={path(ant)} className="dv3-prev" fill="none"/>}
      {atual.length > 1 && <path d={path(atual)} className="dv3-current" fill="none"/>}
      {atual.map((p,i)=><g key={p.key}>
        {(i % labelStep === 0 || i === atual.length-1) && <text x={p.x} y={H-13} textAnchor="middle" className="dv3-axis">{p.label}</text>}
        <circle cx={p.x} cy={p.y} r={hover===i?6:3.5} className="dv3-point"/>
        <rect x={Math.max(L,p.x-18)} y={T} width="36" height={ch} fill="transparent" onMouseEnter={()=>setHover(i)} onTouchStart={()=>setHover(i)}/>
      </g>)}
      {hover !== null && atual[hover] && <line x1={atual[hover].x} x2={atual[hover].x} y1={T} y2={T+ch} className="dv3-hover"/>}
    </svg>
    {hover !== null && atual[hover] && <div className="dv3-tooltip" style={{left:`${Math.min(86,Math.max(14,(atual[hover].x/W)*100))}%`}}>
      <small>{atual[hover].tooltip}</small><strong>{moeda(atual[hover].value)}</strong>
      {previous[hover] && <span>{previousLabel}: {moeda(previous[hover].value)}</span>}
    </div>}
  </div>
}

function Ranking({ items, quantityLabel }) {
  const max = Math.max(1, ...items.map(i => i.value))
  if (!items.length) return <div className="dv3-empty">Sem dados no período</div>
  return <div className="dv3-ranking">{items.map((item,i)=><div className="dv3-rank" key={item.label}>
    <span className="dv3-rank-num">{i+1}</span><div className="dv3-rank-body"><div className="dv3-rank-head"><strong>{item.label}</strong><span>{moeda(item.value)}</span></div>
    <div className="dv3-rank-track"><i style={{width:`${Math.max(4,item.value/max*100)}%`}}/></div>
    {quantityLabel && <small>{numero(item.quantity)} {quantityLabel}</small>}</div>
  </div>)}</div>
}

export default function DashboardVendasV3() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const hoje = new Date()
  const [loading,setLoading] = useState(true)
  const [sales,setSales] = useState([]), [quotes,setQuotes] = useState([]), [farms,setFarms] = useState([]), [goals,setGoals] = useState([]), [products,setProducts] = useState([])
  const [tipo,setTipo] = useState('month'), [ano,setAno] = useState(hoje.getFullYear()), [mes,setMes] = useState(hoje.getMonth()), [tri,setTri] = useState(Math.floor(hoje.getMonth()/3)+1)

  useEffect(()=>{(async()=>{
    setLoading(true)
    const [a,b,c,d,e] = await Promise.all([
      supabase.from('sales').select('*').order('sale_date',{ascending:true}),
      supabase.from('quotes').select('*').order('created_at',{ascending:true}),
      supabase.from('farms').select('id,name,segment,seller_id'),
      supabase.from('goals').select('ano,mes,meta_fat,seller_id,ultra_salesman_id'),
      supabase.from('products').select('id,name,ultra_codproduto,ultra_codproduto_clas'),
    ])
    setSales(a.data||[]);setQuotes(b.data||[]);setFarms(c.data||[]);setGoals(d.data||[]);setProducts(e.data||[]);setLoading(false)
  })()},[user?.id])

  const anos = useMemo(()=>[...new Set([hoje.getFullYear(),...sales.map(s=>Number((saleDate(s)||'').slice(0,4))),...goals.map(g=>Number(g.ano))])].filter(Number.isFinite).sort((a,b)=>b-a),[sales,goals])
  const periodo = useMemo(()=>periodoConfig(tipo,ano,mes,tri),[tipo,ano,mes,tri])

  const meta = useMemo(()=>{
    const uid = Number(user?.profile?.ultra_salesman_id)
    const meses = tipo==='year'?[1,2,3,4,5,6,7,8,9,10,11,12]:tipo==='quarter'?[((tri-1)*3)+1,((tri-1)*3)+2,((tri-1)*3)+3]:[mes+1]
    return goals.filter(g=>(uid>0?Number(g.ultra_salesman_id)===uid:g.seller_id===user?.id)&&Number(g.ano)===ano&&meses.includes(Number(g.mes))).reduce((a,g)=>a+Number(g.meta_fat||0),0)
  },[goals,user,ano,mes,tri,tipo])

  const dados = useMemo(()=>{
    const farmsById = Object.fromEntries(farms.map(f=>[f.id,f]))
    const productsById = Object.fromEntries(products.map(p=>[p.id,p]))
    const su = sales.filter(s=>pertence(s,farmsById,user)), qu = quotes.filter(q=>pertence(q,farmsById,user))
    const filtrar=(rows,get,ini,fim)=>{const a=isoLocal(ini),b=isoLocal(fim);return rows.filter(r=>{const d=get(r);return d&&d>=a&&d<=b})}
    const sa=filtrar(su,saleDate,periodo.inicio,periodo.fim), sp=filtrar(su,saleDate,periodo.anteriorInicio,periodo.anteriorFim)
    const qa=filtrar(qu,quoteDate,periodo.inicio,periodo.fim), qp=filtrar(qu,quoteDate,periodo.anteriorInicio,periodo.anteriorFim)
    const total=sa.reduce((a,s)=>a+Number(s.total||0),0), prev=sp.reduce((a,s)=>a+Number(s.total||0),0)
    const conv=qa.filter(q=>String(q.status||'').toLowerCase()==='convertida').length, convPrev=qp.filter(q=>String(q.status||'').toLowerCase()==='convertida').length
    const ticket=sa.length?total/sa.length:0, ticketPrev=sp.length?prev/sp.length:0
    const clientes=new Set(sa.map(s=>s.farm_id).filter(Boolean)).size
    const faz={}, prod={}, seg={}
    sa.forEach(s=>{
      const fn=farmsById[s.farm_id]?.name||'Sem cliente';faz[fn]=(faz[fn]||0)+Number(s.total||0)
      const sg=farmsById[s.farm_id]?.segment||'Outros';seg[sg]=(seg[sg]||0)+Number(s.total||0)
      ;(Array.isArray(s.items)?s.items:[]).forEach(item=>{
        const p=productsById[item.productId||item.product_id]
        const nome=item.productName||item.product_name||item.name||p?.name||'Produto não identificado'
        if(!prod[nome])prod[nome]={label:nome,value:0,quantity:0}
        prod[nome].value+=Number(item.subtotal||item.total||0)
        prod[nome].quantity+=Number(item.quantity||item.quantityKg||item.quantity_kg||0)
      })
    })
    const topFaz=Object.entries(faz).map(([label,value])=>({label,value})).sort((a,b)=>b.value-a.value).slice(0,5)
    const topProd=Object.values(prod).sort((a,b)=>b.value-a.value).slice(0,5)
    const segmentos=Object.entries(seg).map(([label,value])=>({label,value})).sort((a,b)=>b.value-a.value)
    return {
      total,prev,quotes:qa.length,quotesPrev:qp.length,conv,convPrev,ticket,ticketPrev,clientes,
      taxa:qa.length?conv/qa.length*100:0,taxaPrev:qp.length?convPrev/qp.length*100:0,
      serie:seriePeriodo(sa,periodo.inicio,periodo.fim,tipo),seriePrev:seriePeriodo(sp,periodo.anteriorInicio,periodo.anteriorFim,tipo),
      topFaz,topProd,segmentos,
    }
  },[sales,quotes,farms,products,user,periodo,tipo])

  if(loading)return <div className="dv3-loading">Carregando dashboard...</div>
  const progresso=meta>0?dados.total/meta*100:0
  const vV=variacao(dados.total,dados.prev), vQ=variacao(dados.quotes,dados.quotesPrev), vT=variacao(dados.ticket,dados.ticketPrev), vTaxa=dados.taxa-dados.taxaPrev

  return <main className="dv3-page">
    <section className="dv3-hero">
      <div className="dv3-title-row"><button onClick={()=>navigate(-1)}><IconArrowLeft size={18}/></button><div><h1>Dashboard de Vendas</h1><p>Acompanhe sua performance comercial</p></div></div>
      <div className="dv3-period-card">
        <div className="dv3-tabs">{[['month','Mês'],['quarter','Trimestre'],['year','Ano']].map(([v,l])=><button key={v} className={tipo===v?'active':''} onClick={()=>setTipo(v)}>{l}</button>)}</div>
        <div className="dv3-selects">
          {tipo==='month'&&<Select label="Mês" value={mes} onChange={e=>setMes(Number(e.target.value))}>{MESES.map((m,i)=><option value={i} key={m}>{m}</option>)}</Select>}
          {tipo==='quarter'&&<Select label="Trimestre" value={tri} onChange={e=>setTri(Number(e.target.value))}>{[1,2,3,4].map(t=><option value={t} key={t}>{t}º trimestre</option>)}</Select>}
          <Select label="Ano" value={ano} onChange={e=>setAno(Number(e.target.value))}>{anos.map(a=><option value={a} key={a}>{a}</option>)}</Select>
        </div>
        <div className="dv3-period-summary"><IconCalendar size={16}/><span>{periodo.titulo}</span></div>
      </div>
    </section>

    <section className="dv3-content">
      <div className="dv3-kpis">
        <Kpi icon={<IconTrendingUp/>} label="Vendas totais" value={moeda(dados.total)} variation={vV}/>
        <Kpi icon={<IconFileText/>} label="Cotações emitidas" value={numero(dados.quotes)} variation={vQ}/>
        <Kpi icon={<IconTarget/>} label="Taxa de conversão" value={pct(dados.taxa)} variation={vTaxa} pp/>
        <Kpi icon={<IconReceipt2/>} label="Ticket médio" value={moeda(dados.ticket)} variation={vT}/>
      </div>

      <article className="dv3-card dv3-chart-card"><div className="dv3-card-head"><div><h2>Evolução de vendas</h2><p>{tipo==='month'?'Vendas por dia':tipo==='year'?'Vendas mês a mês':'Vendas por mês no trimestre'}</p></div><span>{periodo.granularidade}</span></div>
        <SalesChart data={dados.serie} previous={dados.seriePrev} previousLabel={periodo.anteriorLabel}/>
        <div className="dv3-chart-legend"><span><i className="current"/>Período atual</span><span><i className="prev"/>{periodo.anteriorLabel}</span></div>
      </article>

      <div className="dv3-grid">
        <article className="dv3-card"><div className="dv3-card-head"><div><h2>Top produtos</h2><p>Produtos com maior faturamento</p></div></div><Ranking items={dados.topProd} quantityLabel="un."/></article>
        <article className="dv3-card"><div className="dv3-card-head"><div><h2>Top clientes</h2><p>Clientes com maior faturamento</p></div></div><Ranking items={dados.topFaz}/></article>
      </div>

      <div className="dv3-grid">
        <article className="dv3-card"><div className="dv3-card-head"><div><h2>Meta do período</h2><p>{periodo.titulo}</p></div></div>
          <div className="dv3-goal-values"><div><span>Meta</span><strong>{meta?moeda(meta):'Não cadastrada'}</strong></div><div><span>Realizado</span><strong>{moeda(dados.total)}</strong></div></div>
          <div className="dv3-goal-percent">{meta?pct(progresso):'—'}</div><div className="dv3-goal-track"><i style={{width:`${Math.min(100,progresso)}%`}}/></div>
        </article>
        <article className="dv3-card"><div className="dv3-card-head"><div><h2>Visão comercial</h2><p>Resumo do período</p></div></div>
          <div className="dv3-summary-list"><div><IconUsers size={18}/><span>Clientes atendidos</span><strong>{numero(dados.clientes)}</strong></div><div><IconFileText size={18}/><span>Cotações convertidas</span><strong>{numero(dados.conv)}</strong></div><div><IconTarget size={18}/><span>Conversão</span><strong>{pct(dados.taxa)}</strong></div></div>
        </article>
      </div>
    </section>
  </main>
}

function Select({label,children,...props}){return <label className="dv3-select"><span>{label}</span><div><select {...props}>{children}</select><IconChevronDown size={15}/></div></label>}
function Kpi({icon,label,value,variation,pp}){const up=variation>=0;return <article className="dv3-kpi"><span className="dv3-kpi-icon">{icon}</span><div><small>{label}</small><strong>{value}</strong><em className={up?'up':'down'}>{up?'↑':'↓'} {pp?`${Math.abs(variation).toFixed(1).replace('.',',')} p.p.`:pct(Math.abs(variation))} vs período anterior</em></div></article>}
