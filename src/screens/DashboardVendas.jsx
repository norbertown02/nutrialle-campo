import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconArrowLeft,
  IconCalendar,
  IconTrendingUp,
  IconFileText,
  IconChecklist,
  IconTarget,
  IconReceipt2,
  IconUsers,
  IconBulb,
  IconChevronDown,
} from '@tabler/icons-react'

import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/useAuth.jsx'
import '../styles/dashboard-vendas-v2.css'

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const MESES_CURTOS = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
]

function moeda(n) {
  return Number(n || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function moedaCompacta(n) {
  const valor = Number(n || 0)
  if (Math.abs(valor) >= 1000000) return `R$ ${(valor / 1000000).toFixed(1).replace('.', ',')} mi`
  if (Math.abs(valor) >= 1000) return `R$ ${(valor / 1000).toFixed(0)} mil`
  return moeda(valor)
}

function numero(n) {
  return Number(n || 0).toLocaleString('pt-BR')
}

function pct(n) {
  return `${Number(n || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`
}

function localISO(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function fimDoMes(ano, mesIndex) {
  return new Date(ano, mesIndex + 1, 0)
}

function periodoConfig(tipo, ano, mesIndex, trimestre) {
  if (tipo === 'year') {
    return {
      inicio: new Date(ano, 0, 1),
      fim: new Date(ano, 11, 31),
      anteriorInicio: new Date(ano - 1, 0, 1),
      anteriorFim: new Date(ano - 1, 11, 31),
      titulo: `${ano}`,
      comparacao: `${ano - 1}`,
      granularidade: 'Mensal',
    }
  }

  if (tipo === 'quarter') {
    const inicioMes = (trimestre - 1) * 3
    const anteriorFim = new Date(ano, inicioMes, 0)
    const anteriorInicio = new Date(anteriorFim.getFullYear(), anteriorFim.getMonth() - 2, 1)
    return {
      inicio: new Date(ano, inicioMes, 1),
      fim: fimDoMes(ano, inicioMes + 2),
      anteriorInicio,
      anteriorFim,
      titulo: `${trimestre}º trimestre de ${ano}`,
      comparacao: 'trimestre anterior',
      granularidade: 'Mensal',
    }
  }

  const anteriorFim = new Date(ano, mesIndex, 0)
  return {
    inicio: new Date(ano, mesIndex, 1),
    fim: fimDoMes(ano, mesIndex),
    anteriorInicio: new Date(anteriorFim.getFullYear(), anteriorFim.getMonth(), 1),
    anteriorFim,
    titulo: `${MESES[mesIndex]} de ${ano}`,
    comparacao: 'mês anterior',
    granularidade: 'Diário',
  }
}

function diferencaPercentual(atual, anterior) {
  const a = Number(atual || 0)
  const b = Number(anterior || 0)
  if (b === 0 && a === 0) return 0
  if (b === 0) return 100
  return ((a - b) / b) * 100
}

function statusQuote(status) {
  return String(status || '').toLowerCase()
}

function getSaleDate(sale) {
  return sale.sale_date || sale.saleDate || sale.created_at?.slice(0, 10)
}

function getQuoteDate(quote) {
  return quote.created_at?.slice(0, 10) || quote.quote_date || quote.date
}

function getFarmName(farmsById, farmId) {
  return farmsById[farmId]?.name || 'Sem cliente'
}

function getFarmSegment(farmsById, farmId) {
  const segment = farmsById[farmId]?.segment || 'outros'
  const mapa = {
    leite: 'Leite',
    corte: 'Corte',
    loja: 'Loja',
    suinos: 'Suínos',
    aves: 'Aves',
    outros: 'Outros',
  }
  return mapa[segment] || String(segment).charAt(0).toUpperCase() + String(segment).slice(1)
}

function pertenceAoVendedor(row, farmsById, user) {
  if (!user?.id) return true

  const ultraId = Number(user?.profile?.ultra_salesman_id)
  const rowUltra = Number(row?.ultra_salesman_id)

  if (Number.isFinite(ultraId) && ultraId > 0 && Number.isFinite(rowUltra) && rowUltra > 0) {
    return rowUltra === ultraId
  }

  if (row?.seller_id) return row.seller_id === user.id

  const farm = farmsById[row?.farm_id]
  if (farm?.seller_id) return farm.seller_id === user.id

  return true
}

function diasEntre(inicio, fim) {
  const dias = []
  const atual = new Date(inicio)
  while (atual <= fim) {
    dias.push(new Date(atual))
    atual.setDate(atual.getDate() + 1)
  }
  return dias
}

function montarSerie(sales, inicio, fim, tipo) {
  if (tipo === 'month') {
    return diasEntre(inicio, fim).map(date => {
      const iso = localISO(date)
      const value = sales
        .filter(s => getSaleDate(s) === iso)
        .reduce((acc, s) => acc + Number(s.total || 0), 0)

      return {
        key: iso,
        label: String(date.getDate()).padStart(2, '0'),
        tooltipLabel: date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
        value,
      }
    })
  }

  const itens = []
  const cursor = new Date(inicio.getFullYear(), inicio.getMonth(), 1)

  while (cursor <= fim) {
    const y = cursor.getFullYear()
    const m = cursor.getMonth()
    const primeiro = new Date(y, m, 1)
    const ultimo = fimDoMes(y, m)
    const iniIso = localISO(primeiro)
    const fimIso = localISO(ultimo)

    const value = sales
      .filter(s => {
        const d = getSaleDate(s)
        return d >= iniIso && d <= fimIso
      })
      .reduce((acc, s) => acc + Number(s.total || 0), 0)

    itens.push({
      key: `${y}-${String(m + 1).padStart(2, '0')}`,
      label: MESES_CURTOS[m],
      tooltipLabel: `${MESES[m]} de ${y}`,
      value,
    })

    cursor.setMonth(cursor.getMonth() + 1)
  }

  return itens
}

function InteractiveSalesChart({ data, previousData, currentLabel, previousLabel }) {
  const [hovered, setHovered] = useState(null)
  const width = 760
  const height = 270
  const left = 54
  const right = 18
  const top = 24
  const bottom = 42
  const chartW = width - left - right
  const chartH = height - top - bottom

  const valores = [...data.map(d => d.value), ...previousData.map(d => d.value)]
  const maxRaw = Math.max(...valores, 1)
  const max = maxRaw * 1.12

  const pontos = lista => lista.map((d, i) => {
    const denom = Math.max(lista.length - 1, 1)
    return {
      ...d,
      x: left + (i / denom) * chartW,
      y: top + chartH - (d.value / max) * chartH,
    }
  })

  const atual = pontos(data)
  const anterior = pontos(previousData)
  const path = pts => pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const area = atual.length
    ? `${path(atual)} L ${atual[atual.length - 1].x} ${top + chartH} L ${atual[0].x} ${top + chartH} Z`
    : ''

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => ({
    value: max * (1 - f),
    y: top + chartH * f,
  }))

  const labelStep = data.length > 15 ? Math.ceil(data.length / 7) : 1

  return (
    <div className="dashv2-chart-wrap" onMouseLeave={() => setHovered(null)}>
      <svg className="dashv2-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Evolução de vendas">
        <defs>
          <linearGradient id="dashv2Area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E87722" stopOpacity="0.24" />
            <stop offset="100%" stopColor="#E87722" stopOpacity="0.01" />
          </linearGradient>
          <linearGradient id="dashv2Line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#C65300" />
            <stop offset="100%" stopColor="#FF8A3D" />
          </linearGradient>
        </defs>

        {yTicks.map((tick, i) => (
          <g key={i}>
            <line x1={left} x2={width - right} y1={tick.y} y2={tick.y} className="dashv2-chart-grid" />
            <text x={left - 9} y={tick.y + 4} textAnchor="end" className="dashv2-axis-label">
              {moedaCompacta(tick.value).replace('R$ ', '')}
            </text>
          </g>
        ))}

        {area && <path d={area} fill="url(#dashv2Area)" />}
        {anterior.length > 1 && <path d={path(anterior)} className="dashv2-line-previous" fill="none" />}
        {atual.length > 1 && <path d={path(atual)} className="dashv2-line-current" fill="none" />}

        {atual.map((p, i) => (
          <g key={p.key}>
            {(i % labelStep === 0 || i === atual.length - 1) && (
              <text x={p.x} y={height - 13} textAnchor="middle" className="dashv2-x-label">
                {p.label}
              </text>
            )}
            <circle
              cx={p.x}
              cy={p.y}
              r={hovered === i ? 6 : 3.5}
              className="dashv2-point"
              onMouseEnter={() => setHovered(i)}
              onTouchStart={() => setHovered(i)}
            />
            <rect
              x={Math.max(left, p.x - chartW / Math.max(data.length, 1) / 2)}
              y={top}
              width={Math.max(12, chartW / Math.max(data.length - 1, 1))}
              height={chartH}
              fill="transparent"
              onMouseEnter={() => setHovered(i)}
              onTouchStart={() => setHovered(i)}
            />
          </g>
        ))}

        {hovered !== null && atual[hovered] && (
          <line
            x1={atual[hovered].x}
            x2={atual[hovered].x}
            y1={top}
            y2={top + chartH}
            className="dashv2-hover-line"
          />
        )}
      </svg>

      {hovered !== null && atual[hovered] && (
        <div
          className="dashv2-tooltip"
          style={{ left: `${Math.min(86, Math.max(14, (atual[hovered].x / width) * 100))}%` }}
        >
          <small>{atual[hovered].tooltipLabel}</small>
          <strong>{moeda(atual[hovered].value)}</strong>
          {previousData[hovered] && (
            <span>{previousLabel}: {moeda(previousData[hovered].value)}</span>
          )}
        </div>
      )}

      <div className="dashv2-chart-legend">
        <span><i className="dashv2-legend-current" />{currentLabel}</span>
        <span><i className="dashv2-legend-prev" />{previousLabel}</span>
      </div>
    </div>
  )
}

const DONUT_COLORS = ['#E87722', '#F3922E', '#C65300', '#141414', '#A9A29A']

function conicGradientReal(items, soma) {
  if (soma <= 0) return `conic-gradient(${DONUT_COLORS[0]} 0 100%)`

  let acumulado = 0
  const stops = items.map((item, index) => {
    const inicio = acumulado
    acumulado += (Number(item.value || 0) / soma) * 100
    return `${DONUT_COLORS[index % DONUT_COLORS.length]} ${inicio}% ${acumulado}%`
  })

  return `conic-gradient(${stops.join(', ')})`
}

function DonutSimples({ items, total }) {
  const soma = items.reduce((acc, item) => acc + Number(item.value || 0), 0)

  if (!items.length) return <div className="dash-empty-small">Sem dados no período</div>

  return (
    <div className="dash-donut-wrap">
      <div className="dash-donut" style={{ background: conicGradientReal(items, soma) }}>
        <div className="dash-donut-center">
          <strong>{moedaCompacta(total)}</strong>
          <span>Total</span>
        </div>
      </div>
      <div className="dash-donut-legend">
        {items.map((item, index) => (
          <div className="dash-legend-row" key={item.label}>
            <span className={`dash-dot dash-dot-${index + 1}`} />
            <strong>{item.label}</strong>
            <em>{pct(soma > 0 ? (item.value / soma) * 100 : 0)}</em>
          </div>
        ))}
      </div>
    </div>
  )
}

function FunilConversao({ emitidas, enviadas, negociacao, convertidas }) {
  const base = Math.max(emitidas, 1)
  const largura = n => Math.max(4, Math.min(100, (n / base) * 100))

  return (
    <div className="dash-funnel">
      <div className="dash-funnel-info">
        <span>Cotações emitidas<strong>{numero(emitidas)}</strong></span>
        <span>Cotações enviadas<strong>{numero(enviadas)}</strong></span>
        <span>Em negociação<strong>{numero(negociacao)}</strong></span>
        <span>Convertidas em venda<strong>{numero(convertidas)}</strong></span>
      </div>
      <div className="dash-funnel-bars">
        <div className="dash-funnel-bar dash-funnel-1" style={{ width: '100%' }} />
        <div className="dash-funnel-bar dash-funnel-2" style={{ width: `${largura(enviadas)}%` }} />
        <div className="dash-funnel-bar dash-funnel-3" style={{ width: `${largura(negociacao)}%` }} />
        <div className="dash-funnel-bar dash-funnel-4" style={{ width: `${largura(convertidas)}%` }} />
      </div>
    </div>
  )
}

function BarRanking({ items, quantity = false }) {
  const max = Math.max(...items.map(i => i.value), 1)

  if (!items.length) return <div className="dash-empty-small">Sem vendas no período</div>

  return (
    <div className="dash-ranking">
      {items.map((item, index) => (
        <div className="dash-ranking-row" key={item.label}>
          <span className="dash-rank-number">{index + 1}</span>
          <div className="dash-rank-body">
            <div className="dash-rank-title">
              <strong>{item.label}</strong>
              <span>{moeda(item.value)}</span>
            </div>
            <div className="dash-rank-track">
              <div className="dash-rank-fill" style={{ width: `${Math.max(4, (item.value / max) * 100)}%` }} />
            </div>
            {quantity && <div className="dashv2-ranking-sub">{numero(item.quantity)} un.</div>}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function DashboardVendas() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const hoje = new Date()
  const [loading, setLoading] = useState(true)
  const [sales, setSales] = useState([])
  const [quotes, setQuotes] = useState([])
  const [farms, setFarms] = useState([])
  const [goals, setGoals] = useState([])

  const [tipoPeriodo, setTipoPeriodo] = useState('month')
  const [ano, setAno] = useState(hoje.getFullYear())
  const [mes, setMes] = useState(hoje.getMonth())
  const [trimestre, setTrimestre] = useState(Math.floor(hoje.getMonth() / 3) + 1)

  useEffect(() => {
    carregar()
  }, [user?.id])

  async function carregar() {
    setLoading(true)

    const [rSales, rQuotes, rFarms, rGoals] = await Promise.all([
      supabase.from('sales').select('*').order('sale_date', { ascending: true }),
      supabase.from('quotes').select('*').order('created_at', { ascending: true }),
      supabase.from('farms').select('id,name,segment,city,state,region,seller_id,prospect,status'),
      supabase.from('goals').select('ano,mes,meta_fat,seller_id,ultra_salesman_id'),
    ])

    setSales(rSales.data || [])
    setQuotes(rQuotes.data || [])
    setFarms(rFarms.data || [])
    setGoals(rGoals.data || [])
    setLoading(false)
  }

  const anosDisponiveis = useMemo(() => {
    const anos = new Set([hoje.getFullYear()])
    sales.forEach(s => {
      const d = getSaleDate(s)
      if (d) anos.add(Number(d.slice(0, 4)))
    })
    goals.forEach(g => {
      if (g.ano) anos.add(Number(g.ano))
    })
    return [...anos].filter(Number.isFinite).sort((a, b) => b - a)
  }, [sales, goals])

  const periodo = useMemo(
    () => periodoConfig(tipoPeriodo, ano, mes, trimestre),
    [tipoPeriodo, ano, mes, trimestre]
  )

  const metaPeriodo = useMemo(() => {
    const ultraId = Number(user?.profile?.ultra_salesman_id)

    const metasUsuario = goals.filter(g => {
      if (Number.isFinite(ultraId) && ultraId > 0) {
        return Number(g.ultra_salesman_id) === ultraId
      }
      return g.seller_id === user?.id
    })

    const mesesAlvo = tipoPeriodo === 'year'
      ? Array.from({ length: 12 }, (_, i) => i + 1)
      : tipoPeriodo === 'quarter'
        ? Array.from({ length: 3 }, (_, i) => ((trimestre - 1) * 3) + i + 1)
        : [mes + 1]

    return metasUsuario
      .filter(g => Number(g.ano) === Number(ano) && mesesAlvo.includes(Number(g.mes)))
      .reduce((acc, g) => acc + Number(g.meta_fat || 0), 0)
  }, [goals, user?.id, user?.profile?.ultra_salesman_id, tipoPeriodo, ano, mes, trimestre])

  const dados = useMemo(() => {
    const farmsById = Object.fromEntries(farms.map(f => [f.id, f]))
    const salesUsuario = sales.filter(s => pertenceAoVendedor(s, farmsById, user))
    const quotesUsuario = quotes.filter(q => pertenceAoVendedor(q, farmsById, user))

    const filtrar = (rows, getter, inicio, fim) => {
      const ini = localISO(inicio)
      const end = localISO(fim)
      return rows.filter(row => {
        const d = getter(row)
        return d && d >= ini && d <= end
      })
    }

    const salesAtual = filtrar(salesUsuario, getSaleDate, periodo.inicio, periodo.fim)
    const salesAnterior = filtrar(salesUsuario, getSaleDate, periodo.anteriorInicio, periodo.anteriorFim)
    const quotesAtual = filtrar(quotesUsuario, getQuoteDate, periodo.inicio, periodo.fim)
    const quotesAnterior = filtrar(quotesUsuario, getQuoteDate, periodo.anteriorInicio, periodo.anteriorFim)

    const vendasTotal = salesAtual.reduce((acc, s) => acc + Number(s.total || 0), 0)
    const vendasAnterior = salesAnterior.reduce((acc, s) => acc + Number(s.total || 0), 0)

    const cotacoesEmitidas = quotesAtual.length
    const cotacoesEmitidasAnterior = quotesAnterior.length
    const cotacoesConvertidas = quotesAtual.filter(q => statusQuote(q.status) === 'convertida').length
    const cotacoesConvertidasAnterior = quotesAnterior.filter(q => statusQuote(q.status) === 'convertida').length
    const cotacoesEnviadas = quotesAtual.filter(q => ['enviada', 'convertida'].includes(statusQuote(q.status))).length
    const cotacoesNegociacao = quotesAtual.filter(q => statusQuote(q.status) === 'enviada').length

    const taxaConversao = cotacoesEmitidas ? (cotacoesConvertidas / cotacoesEmitidas) * 100 : 0
    const taxaConversaoAnterior = cotacoesEmitidasAnterior ? (cotacoesConvertidasAnterior / cotacoesEmitidasAnterior) * 100 : 0
    const ticketMedio = salesAtual.length ? vendasTotal / salesAtual.length : 0
    const ticketMedioAnterior = salesAnterior.length ? vendasAnterior / salesAnterior.length : 0
    const clientesAtendidos = new Set(salesAtual.map(s => s.farm_id).filter(Boolean)).size
    const clientesAtendidosAnterior = new Set(salesAnterior.map(s => s.farm_id).filter(Boolean)).size

    const evolucaoAtual = montarSerie(salesAtual, periodo.inicio, periodo.fim, tipoPeriodo)
    const evolucaoAnterior = montarSerie(salesAnterior, periodo.anteriorInicio, periodo.anteriorFim, tipoPeriodo)

    const porFazendaMap = {}
    const porProdutoMap = {}
    const porSegmentoMap = {}
    const porPagamentoMap = {}

    salesAtual.forEach(s => {
      const fazenda = getFarmName(farmsById, s.farm_id)
      porFazendaMap[fazenda] = (porFazendaMap[fazenda] || 0) + Number(s.total || 0)

      const segmento = getFarmSegment(farmsById, s.farm_id)
      porSegmentoMap[segmento] = (porSegmentoMap[segmento] || 0) + Number(s.total || 0)

      const pagamento = s.payment_term_label || s.payment_term || 'Não informado'
      porPagamentoMap[pagamento] = (porPagamentoMap[pagamento] || 0) + Number(s.total || 0)

      const items = Array.isArray(s.items) ? s.items : []
      items.forEach(item => {
        const nome = item.product_name || item.name || 'Produto sem nome'
        if (!porProdutoMap[nome]) porProdutoMap[nome] = { label: nome, value: 0, quantity: 0 }
        porProdutoMap[nome].value += Number(item.subtotal || 0)
        porProdutoMap[nome].quantity += Number(item.quantity || 0)
      })
    })

    const topFazendas = Object.entries(porFazendaMap)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)

    const topProdutos = Object.values(porProdutoMap)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)

    const porSegmento = Object.entries(porSegmentoMap)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)

    const porPagamento = Object.entries(porPagamentoMap)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)

    const progressoMeta = metaPeriodo > 0 ? (vendasTotal / metaPeriodo) * 100 : 0
    const varVendas = diferencaPercentual(vendasTotal, vendasAnterior)
    const varCotacoes = diferencaPercentual(cotacoesEmitidas, cotacoesEmitidasAnterior)
    const varConvertidas = diferencaPercentual(cotacoesConvertidas, cotacoesConvertidasAnterior)
    const varTaxa = taxaConversao - taxaConversaoAnterior
    const varTicket = diferencaPercentual(ticketMedio, ticketMedioAnterior)
    const varClientes = diferencaPercentual(clientesAtendidos, clientesAtendidosAnterior)

    const insights = []
    if (varVendas > 0) insights.push(`As vendas cresceram ${pct(varVendas)} contra o período anterior.`)
    else if (varVendas < 0) insights.push(`As vendas estão ${pct(Math.abs(varVendas))} abaixo do período anterior.`)
    else insights.push('As vendas estão estáveis contra o período anterior.')

    if (metaPeriodo > 0) {
      if (progressoMeta >= 100) insights.push('Meta do período atingida.')
      else if (progressoMeta >= 75) insights.push('A meta está próxima: mais de 75% já foi realizado.')
      else insights.push(`Foram realizados ${pct(progressoMeta)} da meta do período.`)
    } else {
      insights.push('Não há meta cadastrada para este recorte.')
    }

    if (topProdutos[0]) insights.push(`${topProdutos[0].label} lidera o faturamento no período.`)

    return {
      vendasTotal,
      vendasAnterior,
      cotacoesEmitidas,
      cotacoesEmitidasAnterior,
      cotacoesConvertidas,
      cotacoesConvertidasAnterior,
      cotacoesEnviadas,
      cotacoesNegociacao,
      taxaConversao,
      taxaConversaoAnterior,
      ticketMedio,
      ticketMedioAnterior,
      clientesAtendidos,
      clientesAtendidosAnterior,
      evolucaoAtual,
      evolucaoAnterior,
      topFazendas,
      topProdutos,
      porSegmento,
      porPagamento,
      progressoMeta,
      insights,
      varVendas,
      varCotacoes,
      varConvertidas,
      varTaxa,
      varTicket,
      varClientes,
    }
  }, [sales, quotes, farms, user, periodo, tipoPeriodo, metaPeriodo])

  const labelAtual = tipoPeriodo === 'year'
    ? `${ano}`
    : tipoPeriodo === 'quarter'
      ? `${trimestre}º tri`
      : MESES_CURTOS[mes]

  const labelAnterior = tipoPeriodo === 'year' ? `${ano - 1}` : periodo.comparacao

  if (loading) {
    return (
      <div className="dash-page">
        <div className="dash-loading">Carregando dashboard...</div>
      </div>
    )
  }

  return (
    <main className="dash-page dashv2-page">
      <section className="dash-hero dashv2-hero">
        <div className="dash-hero__glow" />
        <div className="dash-hero__brand-shape" aria-hidden="true">
          <svg viewBox="0 0 260 220" fill="none">
            <path d="M79 181C47 139 39 96 61 47C91 76 108 110 105 157C104 170 96 178 79 181Z" stroke="currentColor" strokeWidth="2" />
            <path d="M77 175C78 132 75 99 66 68" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="184" cy="60" r="36" stroke="currentColor" strokeWidth="2" />
            <circle cx="202" cy="151" r="35" stroke="currentColor" strokeWidth="2" />
            <circle cx="118" cy="160" r="34" stroke="currentColor" strokeWidth="2" />
            <path d="M151 86L132 132" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <path d="M176 96L191 119" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>

        <div className="dash-hero__top">
          <button type="button" onClick={() => navigate(-1)} className="dash-back">
            <IconArrowLeft size={18} />
          </button>
          <div>
            <h1>Dashboard de Vendas</h1>
            <p>Performance comercial com leitura por mês, trimestre e ano</p>
          </div>
        </div>

        <div className="dashv2-period-card">
          <div className="dashv2-period-tabs">
            {[
              ['month', 'Mês'],
              ['quarter', 'Trimestre'],
              ['year', 'Ano'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={tipoPeriodo === value ? 'active' : ''}
                onClick={() => setTipoPeriodo(value)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="dashv2-selects">
            <label>
              <span>Ano</span>
              <div>
                <select value={ano} onChange={e => setAno(Number(e.target.value))}>
                  {anosDisponiveis.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <IconChevronDown size={15} />
              </div>
            </label>

            {tipoPeriodo === 'month' && (
              <label>
                <span>Mês</span>
                <div>
                  <select value={mes} onChange={e => setMes(Number(e.target.value))}>
                    {MESES.map((m, index) => <option key={m} value={index}>{m}</option>)}
                  </select>
                  <IconChevronDown size={15} />
                </div>
              </label>
            )}

            {tipoPeriodo === 'quarter' && (
              <label>
                <span>Trimestre</span>
                <div>
                  <select value={trimestre} onChange={e => setTrimestre(Number(e.target.value))}>
                    {[1, 2, 3, 4].map(t => <option key={t} value={t}>{t}º trimestre</option>)}
                  </select>
                  <IconChevronDown size={15} />
                </div>
              </label>
            )}
          </div>

          <div className="dashv2-period-summary">
            <IconCalendar size={17} />
            <span>{periodo.titulo}</span>
          </div>
        </div>
      </section>

      <section className="dash-panel dashv2-panel">
        <div className="dash-kpi-grid">
          <article className="dash-kpi">
            <span className="dash-kpi__icon dash-green"><IconTrendingUp size={24} /></span>
            <div>
              <small>Vendas totais</small>
              <strong>{moeda(dados.vendasTotal)}</strong>
              <em className={dados.varVendas >= 0 ? 'dash-up' : 'dash-down'}>
                {dados.varVendas >= 0 ? '↑' : '↓'} {pct(Math.abs(dados.varVendas))} vs período anterior
              </em>
            </div>
          </article>

          <article className="dash-kpi">
            <span className="dash-kpi__icon dash-orange"><IconFileText size={24} /></span>
            <div>
              <small>Cotações emitidas</small>
              <strong>{numero(dados.cotacoesEmitidas)}</strong>
              <em className={dados.varCotacoes >= 0 ? 'dash-up' : 'dash-down'}>
                {dados.varCotacoes >= 0 ? '↑' : '↓'} {pct(Math.abs(dados.varCotacoes))} vs período anterior
              </em>
            </div>
          </article>

          <article className="dash-kpi">
            <span className="dash-kpi__icon dash-purple"><IconChecklist size={24} /></span>
            <div>
              <small>Cotações convertidas</small>
              <strong>{numero(dados.cotacoesConvertidas)}</strong>
              <em className={dados.varConvertidas >= 0 ? 'dash-up' : 'dash-down'}>
                {dados.varConvertidas >= 0 ? '↑' : '↓'} {pct(Math.abs(dados.varConvertidas))} vs período anterior
              </em>
            </div>
          </article>

          <article className="dash-kpi">
            <span className="dash-kpi__icon dash-green"><IconTarget size={24} /></span>
            <div>
              <small>Taxa de conversão</small>
              <strong>{pct(dados.taxaConversao)}</strong>
              <em className={dados.varTaxa >= 0 ? 'dash-up' : 'dash-down'}>
                {dados.varTaxa >= 0 ? '↑' : '↓'} {Math.abs(dados.varTaxa).toFixed(1).replace('.', ',')} p.p.
              </em>
            </div>
          </article>

          <article className="dash-kpi dash-kpi-wide">
            <span className="dash-kpi__icon dash-yellow"><IconReceipt2 size={24} /></span>
            <div>
              <small>Ticket médio</small>
              <strong>{moeda(dados.ticketMedio)}</strong>
              <em className={dados.varTicket >= 0 ? 'dash-up' : 'dash-down'}>
                {dados.varTicket >= 0 ? '↑' : '↓'} {pct(Math.abs(dados.varTicket))} vs período anterior
              </em>
            </div>
          </article>
        </div>

        <div className="dash-card dash-chart-card dashv2-chart-card">
          <div className="dash-card-head">
            <div>
              <h2>Evolução de Vendas</h2>
              <p>
                {tipoPeriodo === 'month'
                  ? 'Vendas por dia no mês selecionado'
                  : tipoPeriodo === 'quarter'
                    ? 'Vendas por mês no trimestre selecionado'
                    : 'Vendas por mês no ano selecionado'}
              </p>
            </div>
            <span>{periodo.granularidade}</span>
          </div>

          <InteractiveSalesChart
            data={dados.evolucaoAtual}
            previousData={dados.evolucaoAnterior}
            currentLabel={labelAtual}
            previousLabel={labelAnterior}
          />
        </div>

        <div className="dash-grid-2 dashv2-grid">
          <div className="dash-card">
            <div className="dash-card-head"><h2>Meta do período</h2></div>
            <div className="dash-goal">
              <div className="dashv2-goal-values">
                <div><span>Meta</span><strong>{metaPeriodo > 0 ? moeda(metaPeriodo) : 'Não cadastrada'}</strong></div>
                <div><span>Realizado</span><strong>{moeda(dados.vendasTotal)}</strong></div>
              </div>
              <em>{metaPeriodo > 0 ? pct(dados.progressoMeta) : '—'}</em>
              <div className="dash-goal-track">
                <div className="dash-goal-fill" style={{ width: `${Math.min(100, dados.progressoMeta)}%` }} />
              </div>
              <div className="dash-goal-scale"><span>0%</span><span>50%</span><span>100%</span></div>
            </div>
          </div>

          <div className="dash-card">
            <div className="dash-card-head"><h2>Vendas por Segmento</h2></div>
            <DonutSimples items={dados.porSegmento} total={dados.vendasTotal} />
          </div>
        </div>

        <div className="dash-grid-2 dashv2-grid">
          <div className="dash-card">
            <div className="dash-card-head"><h2>Funil de Conversão</h2></div>
            <FunilConversao
              emitidas={dados.cotacoesEmitidas}
              enviadas={dados.cotacoesEnviadas}
              negociacao={dados.cotacoesNegociacao}
              convertidas={dados.cotacoesConvertidas}
            />
          </div>

          <div className="dash-card">
            <div className="dash-card-head"><h2>Forma de Pagamento</h2></div>
            <DonutSimples items={dados.porPagamento} total={dados.vendasTotal} />
          </div>
        </div>

        <div className="dash-card dash-compare">
          <div className="dash-card-head">
            <div>
              <h2>Comparativo do período</h2>
              <p>{periodo.titulo} versus {periodo.comparacao}</p>
            </div>
          </div>

          <div className="dash-compare-table">
            <div className="dash-compare-head">
              <span />
              <span>Anterior</span>
              <span>Atual</span>
              <span>Variação</span>
            </div>

            {[
              { icon: <IconTrendingUp size={16} />, label: 'Vendas', anterior: moeda(dados.vendasAnterior), atual: moeda(dados.vendasTotal), variacao: dados.varVendas },
              { icon: <IconFileText size={16} />, label: 'Cotações', anterior: numero(dados.cotacoesEmitidasAnterior), atual: numero(dados.cotacoesEmitidas), variacao: dados.varCotacoes },
              { icon: <IconUsers size={16} />, label: 'Clientes', anterior: numero(dados.clientesAtendidosAnterior), atual: numero(dados.clientesAtendidos), variacao: dados.varClientes },
              { icon: <IconReceipt2 size={16} />, label: 'Ticket médio', anterior: moeda(dados.ticketMedioAnterior), atual: moeda(dados.ticketMedio), variacao: dados.varTicket },
            ].map(row => (
              <div className="dash-compare-row" key={row.label}>
                <strong><i>{row.icon}</i>{row.label}</strong>
                <span>{row.anterior}</span>
                <span>{row.atual}</span>
                <em className={row.variacao >= 0 ? 'dash-up' : 'dash-down'}>
                  {row.variacao >= 0 ? '↑' : '↓'} {pct(Math.abs(row.variacao))}
                </em>
              </div>
            ))}
          </div>
        </div>

        <div className="dash-grid-2 dashv2-grid">
          <div className="dash-card">
            <div className="dash-card-head">
              <div><h2>Top Fazendas</h2><p>Maior faturamento no período</p></div>
            </div>
            <BarRanking items={dados.topFazendas} />
          </div>

          <div className="dash-card">
            <div className="dash-card-head">
              <div><h2>Top Produtos</h2><p>Maior faturamento no período</p></div>
            </div>
            <BarRanking items={dados.topProdutos} quantity />
          </div>
        </div>

        <div className="dash-card dash-insights">
          <div className="dash-card-head">
            <h2><IconBulb size={19} />Insights</h2>
          </div>
          {dados.insights.map((insight, index) => (
            <div className="dash-insight" key={index}>
              <span>{index + 1}</span>
              <p>{insight}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
