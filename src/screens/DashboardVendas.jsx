import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconArrowLeft,
  IconCalendar,
  IconFilter,
  IconTrendingUp,
  IconFileText,
  IconChecklist,
  IconTarget,
  IconReceipt2,
  IconUsers,
  IconBulb,
  IconChartBar,
} from '@tabler/icons-react'

import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/useAuth.jsx'

function moeda(n) {
  return Number(n || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
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

function dataISO(date) {
  return date.toISOString().slice(0, 10)
}

function inicioMes(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function fimMes(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

function inicioMesAnterior(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth() - 1, 1)
}

function fimMesAnterior(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 0)
}

function diasDoPeriodo(inicio, fim) {
  const dias = []
  const atual = new Date(inicio)

  while (atual <= fim) {
    dias.push(dataISO(atual))
    atual.setDate(atual.getDate() + 1)
  }

  return dias
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

function pertenceAoVendedor(row, farmsById, userId) {
  if (!userId) return true

  if (row?.seller_id) {
    return row.seller_id === userId
  }

  const farm = farmsById[row?.farm_id]

  if (farm?.seller_id) {
    return farm.seller_id === userId
  }

  return true
}

function smoothPath(points) {
  if (!points.length) return ''
  if (points.length === 1) return `M ${points[0][0]} ${points[0][1]}`

  let d = `M ${points[0][0]} ${points[0][1]}`

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? i : i - 1]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1]

    const cp1x = p1[0] + (p2[0] - p0[0]) / 6
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6

    d += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2[0]} ${p2[1]}`
  }

  return d
}

function MiniLineChart({ data, dataPrev }) {
  const width = 620
  const height = 180
  const padding = 18

  const valores = [
    ...data.map(d => d.value),
    ...dataPrev.map(d => d.value),
  ]

  const max = Math.max(...valores, 1)

  function pontos(lista) {
    if (lista.length <= 1) return []

    return lista.map((d, i) => {
      const x = padding + (i / (lista.length - 1)) * (width - padding * 2)
      const y = height - padding - (d.value / max) * (height - padding * 2)
      return [x, y]
    })
  }

  const pontosAtual = pontos(data)
  const pontosPrev = pontos(dataPrev)
  const ultimo = pontosAtual[pontosAtual.length - 1]

  return (
    <svg className="dash-line-chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="dashStrokeGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#C8500F" />
          <stop offset="100%" stopColor="#FF8A3D" />
        </linearGradient>
      </defs>

      {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
        const y = padding + p * (height - padding * 2)

        return (
          <line
            key={i}
            x1={padding}
            x2={width - padding}
            y1={y}
            y2={y}
            className="dash-chart-grid"
          />
        )
      })}

      <path
        d={smoothPath(pontosPrev)}
        fill="none"
        className="dash-line-prev"
      />

      <path
        d={smoothPath(pontosAtual)}
        fill="none"
        className="dash-line-current"
      />

      {ultimo && (
        <circle
          cx={ultimo[0]}
          cy={ultimo[1]}
          r={5}
          className="dash-line-current-dot"
        />
      )}
    </svg>
  )
}

const DONUT_COLORS = ['#E87722', '#F3922E', '#C65300', '#141414', '#A9A29A']

function conicGradientReal(items, soma) {
  if (soma <= 0) {
    return `conic-gradient(${DONUT_COLORS[0]} 0 100%)`
  }

  let acumulado = 0

  const stops = items.map((item, index) => {
    const inicio = acumulado
    const valor = Number(item.value || 0)
    acumulado += (valor / soma) * 100

    const color = DONUT_COLORS[index % DONUT_COLORS.length]
    return `${color} ${inicio}% ${acumulado}%`
  })

  return `conic-gradient(${stops.join(', ')})`
}

function DonutSimples({ items, total }) {
  const soma = items.reduce((acc, item) => acc + Number(item.value || 0), 0)

  if (!items.length) {
    return (
      <div className="dash-empty-small">
        Sem dados no período
      </div>
    )
  }

  return (
    <div className="dash-donut-wrap">
      <div className="dash-donut" style={{ background: conicGradientReal(items, soma) }}>
        <div className="dash-donut-center">
          <strong>{moeda(total)}</strong>
          <span>Total</span>
        </div>
      </div>

      <div className="dash-donut-legend">
        {items.map((item, index) => {
          const percentual = soma > 0 ? (item.value / soma) * 100 : 0

          return (
            <div className="dash-legend-row" key={index}>
              <span className={`dash-dot dash-dot-${index + 1}`} />
              <strong>{item.label}</strong>
              <em>{pct(percentual)}</em>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function FunilConversao({ emitidas, enviadas, negociacao, convertidas }) {
  const base = Math.max(emitidas, 1)
  const larguraEmitidas = 100
  const larguraEnviadas = Math.max(4, Math.min(100, (enviadas / base) * 100))
  const larguraNegociacao = Math.max(4, Math.min(100, (negociacao / base) * 100))
  const larguraConvertidas = Math.max(4, Math.min(100, (convertidas / base) * 100))

  return (
    <div className="dash-funnel">
      <div className="dash-funnel-info">
        <span>
          Cotações emitidas
          <strong>{numero(emitidas)}</strong>
        </span>

        <span>
          Cotações enviadas
          <strong>{numero(enviadas)}</strong>
        </span>

        <span>
          Em negociação
          <strong>{numero(negociacao)}</strong>
        </span>

        <span>
          Convertidas em venda
          <strong>{numero(convertidas)}</strong>
        </span>
      </div>

      <div className="dash-funnel-bars">
        <div className="dash-funnel-bar dash-funnel-1" style={{ width: `${larguraEmitidas}%` }} />
        <div className="dash-funnel-bar dash-funnel-2" style={{ width: `${larguraEnviadas}%` }} />
        <div className="dash-funnel-bar dash-funnel-3" style={{ width: `${larguraNegociacao}%` }} />
        <div className="dash-funnel-bar dash-funnel-4" style={{ width: `${larguraConvertidas}%` }} />
      </div>
    </div>
  )
}

function BarRanking({ items }) {
  const max = Math.max(...items.map(i => i.value), 1)

  return (
    <div className="dash-ranking">
      {items.length === 0 ? (
        <div className="dash-empty-small">
          Sem vendas no período
        </div>
      ) : (
        items.map((item, index) => (
          <div className="dash-ranking-row" key={index}>
            <span className="dash-rank-number">{index + 1}</span>

            <div className="dash-rank-body">
              <div className="dash-rank-title">
                <strong>{item.label}</strong>
                <span>{moeda(item.value)}</span>
              </div>

              <div className="dash-rank-track">
                <div
                  className="dash-rank-fill"
                  style={{ width: `${Math.max(4, (item.value / max) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

function RankingProdutos({ items }) {
  const max = Math.max(...items.map(i => i.value), 1)

  return (
    <div className="dash-ranking">
      {items.length === 0 ? (
        <div className="dash-empty-small">
          Sem produtos vendidos no período
        </div>
      ) : (
        items.map((item, index) => (
          <div className="dash-ranking-row" key={index}>
            <span className="dash-rank-number">{index + 1}</span>

            <div className="dash-rank-body">
              <div className="dash-rank-title">
                <strong>{item.label}</strong>
                <span>{moeda(item.value)}</span>
              </div>

              <div className="dash-rank-track">
                <div
                  className="dash-rank-fill"
                  style={{ width: `${Math.max(4, (item.value / max) * 100)}%` }}
                />
              </div>

              <div style={{ marginTop: 4, fontSize: 11, color: '#8D867E', fontWeight: 700 }}>
                {numero(item.quantity)} sacos
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

export default function DashboardVendas() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [sales, setSales] = useState([])
  const [quotes, setQuotes] = useState([])
  const [farms, setFarms] = useState([])

  const hoje = new Date()
  const iniAtual = inicioMes(hoje)
  const fimAtual = fimMes(hoje)
  const iniAnterior = inicioMesAnterior(hoje)
  const fimAnterior = fimMesAnterior(hoje)

  const metaMensal = 350000

  useEffect(() => {
    carregar()
  }, [user?.id])

  async function carregar() {
    setLoading(true)

    const [rSales, rQuotes, rFarms] = await Promise.all([
      supabase
        .from('sales')
        .select('*')
        .order('sale_date', { ascending: true }),

      supabase
        .from('quotes')
        .select('*')
        .order('created_at', { ascending: true }),

      supabase
        .from('farms')
        .select('id,name,segment,city,state,region,seller_id,prospect,status'),
    ])

    setSales(rSales.data || [])
    setQuotes(rQuotes.data || [])
    setFarms(rFarms.data || [])
    setLoading(false)
  }

  const dados = useMemo(() => {
    const farmsById = Object.fromEntries(farms.map(f => [f.id, f]))

    const salesUsuario = sales.filter(s => pertenceAoVendedor(s, farmsById, user?.id))
    const quotesUsuario = quotes.filter(q => pertenceAoVendedor(q, farmsById, user?.id))

    const vendaNoPeriodo = (s, ini, fim) => {
      const d = getSaleDate(s)
      return d >= dataISO(ini) && d <= dataISO(fim)
    }

    const quoteNoPeriodo = (q, ini, fim) => {
      const d = getQuoteDate(q)
      return d >= dataISO(ini) && d <= dataISO(fim)
    }

    const salesAtual = salesUsuario.filter(s => vendaNoPeriodo(s, iniAtual, fimAtual))
    const salesAnterior = salesUsuario.filter(s => vendaNoPeriodo(s, iniAnterior, fimAnterior))

    const quotesAtual = quotesUsuario.filter(q => quoteNoPeriodo(q, iniAtual, fimAtual))
    const quotesAnterior = quotesUsuario.filter(q => quoteNoPeriodo(q, iniAnterior, fimAnterior))

    const vendasTotal = salesAtual.reduce((acc, s) => acc + Number(s.total || 0), 0)
    const vendasAnterior = salesAnterior.reduce((acc, s) => acc + Number(s.total || 0), 0)

    const cotacoesEmitidas = quotesAtual.length
    const cotacoesEmitidasAnterior = quotesAnterior.length

    const cotacoesConvertidas = quotesAtual.filter(q => statusQuote(q.status) === 'convertida').length
    const cotacoesConvertidasAnterior = quotesAnterior.filter(q => statusQuote(q.status) === 'convertida').length

    const cotacoesEnviadas = quotesAtual.filter(q =>
      ['enviada', 'convertida'].includes(statusQuote(q.status))
    ).length

    const cotacoesNegociacao = quotesAtual.filter(q =>
      statusQuote(q.status) === 'enviada'
    ).length

    const taxaConversao = cotacoesEmitidas > 0
      ? (cotacoesConvertidas / cotacoesEmitidas) * 100
      : 0

    const taxaConversaoAnterior = cotacoesEmitidasAnterior > 0
      ? (cotacoesConvertidasAnterior / cotacoesEmitidasAnterior) * 100
      : 0

    const ticketMedio = salesAtual.length > 0
      ? vendasTotal / salesAtual.length
      : 0

    const ticketMedioAnterior = salesAnterior.length > 0
      ? vendasAnterior / salesAnterior.length
      : 0

    const clientesAtendidos = new Set(salesAtual.map(s => s.farm_id).filter(Boolean)).size
    const clientesAtendidosAnterior = new Set(salesAnterior.map(s => s.farm_id).filter(Boolean)).size

    const diasAtual = diasDoPeriodo(iniAtual, fimAtual)
    const diasAnterior = diasDoPeriodo(iniAnterior, fimAnterior)

    const evolucaoAtual = diasAtual.map(dia => ({
      label: dia.slice(8, 10),
      value: salesAtual
        .filter(s => getSaleDate(s) === dia)
        .reduce((acc, s) => acc + Number(s.total || 0), 0),
    }))

    const evolucaoAnterior = diasAnterior.map(dia => ({
      label: dia.slice(8, 10),
      value: salesAnterior
        .filter(s => getSaleDate(s) === dia)
        .reduce((acc, s) => acc + Number(s.total || 0), 0),
    }))

    let acumulado = 0
    const evolucaoAcumuladaAtual = evolucaoAtual.map(d => {
      acumulado += d.value
      return { ...d, value: acumulado }
    })

    let acumuladoAnt = 0
    const evolucaoAcumuladaAnterior = evolucaoAnterior.map(d => {
      acumuladoAnt += d.value
      return { ...d, value: acumuladoAnt }
    })

    const porFazendaMap = {}

    salesAtual.forEach(s => {
      const nome = getFarmName(farmsById, s.farm_id)
      porFazendaMap[nome] = (porFazendaMap[nome] || 0) + Number(s.total || 0)
    })

    const topFazendas = Object.entries(porFazendaMap)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)

    const porProdutoMap = {}

    salesAtual.forEach(s => {
      const items = Array.isArray(s.items) ? s.items : []

      items.forEach(item => {
        const nome = item.product_name || item.name || 'Produto sem nome'
        const subtotal = Number(item.subtotal || 0)
        const quantity = Number(item.quantity || 0)

        if (!porProdutoMap[nome]) {
          porProdutoMap[nome] = {
            label: nome,
            value: 0,
            quantity: 0,
          }
        }

        porProdutoMap[nome].value += subtotal
        porProdutoMap[nome].quantity += quantity
      })
    })

    const topProdutos = Object.values(porProdutoMap)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)

    const porSegmentoMap = {}

    salesAtual.forEach(s => {
      const segmento = getFarmSegment(farmsById, s.farm_id)
      porSegmentoMap[segmento] = (porSegmentoMap[segmento] || 0) + Number(s.total || 0)
    })

    const porSegmento = Object.entries(porSegmentoMap)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)

    const porPagamentoMap = {}

    salesAtual.forEach(s => {
      const label = s.payment_term_label || s.payment_term || 'Não informado'
      porPagamentoMap[label] = (porPagamentoMap[label] || 0) + Number(s.total || 0)
    })

    const porPagamento = Object.entries(porPagamentoMap)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)

    const progressoMeta = metaMensal > 0 ? (vendasTotal / metaMensal) * 100 : 0

    const varVendas = diferencaPercentual(vendasTotal, vendasAnterior)
    const varCotacoes = diferencaPercentual(cotacoesEmitidas, cotacoesEmitidasAnterior)
    const varConvertidas = diferencaPercentual(cotacoesConvertidas, cotacoesConvertidasAnterior)
    const varTaxa = taxaConversao - taxaConversaoAnterior
    const varTicket = diferencaPercentual(ticketMedio, ticketMedioAnterior)
    const varClientes = diferencaPercentual(clientesAtendidos, clientesAtendidosAnterior)

    const insights = []

    if (varVendas > 0) {
      insights.push(`Suas vendas cresceram ${pct(varVendas)} em relação ao mês anterior.`)
    } else if (varVendas < 0) {
      insights.push(`Suas vendas estão ${pct(Math.abs(varVendas))} abaixo do mês anterior.`)
    } else {
      insights.push('Suas vendas estão estáveis em relação ao mês anterior.')
    }

    if (varTaxa > 0) {
      insights.push(`A taxa de conversão melhorou ${varTaxa.toFixed(1).replace('.', ',')} p.p.`)
    } else if (varTaxa < 0) {
      insights.push(`A taxa de conversão caiu ${Math.abs(varTaxa).toFixed(1).replace('.', ',')} p.p.`)
    } else {
      insights.push('A taxa de conversão ficou estável no período.')
    }

    if (varTicket > 0) {
      insights.push(`O ticket médio está ${pct(varTicket)} maior que no mês anterior.`)
    } else if (varTicket < 0) {
      insights.push(`O ticket médio está ${pct(Math.abs(varTicket))} menor que no mês anterior.`)
    }

    if (progressoMeta >= 100) {
      insights.push('Meta mensal batida. Excelente desempenho comercial.')
    } else if (progressoMeta >= 75) {
      insights.push('Você está próximo de bater a meta mensal.')
    } else {
      insights.push('Há espaço para acelerar as vendas até o fim do mês.')
    }

    if (topProdutos[0]) {
      insights.push(`${topProdutos[0].label} é o produto com maior faturamento no mês.`)
    }

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

      evolucaoAcumuladaAtual,
      evolucaoAcumuladaAnterior,

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
  }, [sales, quotes, farms, user?.id])

  const periodoTexto = `${dataISO(iniAtual).split('-').reverse().join('/')} – ${dataISO(fimAtual).split('-').reverse().join('/')}`

  if (loading) {
    return (
      <div className="dash-page">
        <div className="dash-loading">
          Carregando dashboard...
        </div>
      </div>
    )
  }

  return (
    <main className="dash-page">
      <section className="dash-hero">
        <div className="dash-hero__glow" />

        <div className="dash-hero__brand-shape" aria-hidden="true">
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
            <p>Acompanhe sua performance comercial</p>
          </div>
        </div>

        <div className="dash-filters">
          <button type="button">
            <IconCalendar size={18} />
            {periodoTexto}
          </button>

          <button type="button">
            <IconFilter size={18} />
            Filtros
          </button>
        </div>
      </section>

      <section className="dash-panel">
        <div className="dash-kpi-grid">
          <article className="dash-kpi">
            <span className="dash-kpi__icon dash-green">
              <IconTrendingUp size={24} />
            </span>

            <div>
              <small>Vendas totais</small>
              <strong>{moeda(dados.vendasTotal)}</strong>
              <em className={dados.varVendas >= 0 ? 'dash-up' : 'dash-down'}>
                {dados.varVendas >= 0 ? '↑' : '↓'} {pct(Math.abs(dados.varVendas))} vs mês anterior
              </em>
            </div>
          </article>

          <article className="dash-kpi">
            <span className="dash-kpi__icon dash-orange">
              <IconFileText size={24} />
            </span>

            <div>
              <small>Cotações emitidas</small>
              <strong>{numero(dados.cotacoesEmitidas)}</strong>
              <em className={dados.varCotacoes >= 0 ? 'dash-up' : 'dash-down'}>
                {dados.varCotacoes >= 0 ? '↑' : '↓'} {pct(Math.abs(dados.varCotacoes))} vs mês anterior
              </em>
            </div>
          </article>

          <article className="dash-kpi">
            <span className="dash-kpi__icon dash-purple">
              <IconChecklist size={24} />
            </span>

            <div>
              <small>Cotações convertidas</small>
              <strong>{numero(dados.cotacoesConvertidas)}</strong>
              <em className={dados.varConvertidas >= 0 ? 'dash-up' : 'dash-down'}>
                {dados.varConvertidas >= 0 ? '↑' : '↓'} {pct(Math.abs(dados.varConvertidas))} vs mês anterior
              </em>
            </div>
          </article>

          <article className="dash-kpi">
            <span className="dash-kpi__icon dash-green">
              <IconTarget size={24} />
            </span>

            <div>
              <small>Taxa de conversão</small>
              <strong>{pct(dados.taxaConversao)}</strong>
              <em className={dados.varTaxa >= 0 ? 'dash-up' : 'dash-down'}>
                {dados.varTaxa >= 0 ? '↑' : '↓'} {Math.abs(dados.varTaxa).toFixed(1).replace('.', ',')} p.p.
              </em>
            </div>
          </article>

          <article className="dash-kpi dash-kpi-wide">
            <span className="dash-kpi__icon dash-yellow">
              <IconReceipt2 size={24} />
            </span>

            <div>
              <small>Ticket médio</small>
              <strong>{moeda(dados.ticketMedio)}</strong>
              <em className={dados.varTicket >= 0 ? 'dash-up' : 'dash-down'}>
                {dados.varTicket >= 0 ? '↑' : '↓'} {pct(Math.abs(dados.varTicket))} vs mês anterior
              </em>
            </div>
          </article>
        </div>

        <div className="dash-card dash-chart-card">
          <div className="dash-card-head">
            <div>
              <h2>Evolução de Vendas</h2>
              <p>Realizado acumulado no mês</p>
            </div>

            <span>Diário</span>
          </div>

          <MiniLineChart
            data={dados.evolucaoAcumuladaAtual}
            dataPrev={dados.evolucaoAcumuladaAnterior}
          />

          <div className="dash-chart-legend">
            <span>
              <i className="legend-current" />
              Este mês
            </span>

            <span>
              <i className="legend-prev" />
              Mês anterior
            </span>
          </div>
        </div>

        <div className="dash-grid-2">
          <div className="dash-card">
            <div className="dash-card-head">
              <h2>Vendas por Segmento</h2>
            </div>

            <DonutSimples items={dados.porSegmento} total={dados.vendasTotal} />
          </div>

          <div className="dash-card">
            <div className="dash-card-head">
              <h2>Funil de Conversão</h2>
            </div>

            <FunilConversao
              emitidas={dados.cotacoesEmitidas}
              enviadas={dados.cotacoesEnviadas}
              negociacao={dados.cotacoesNegociacao}
              convertidas={dados.cotacoesConvertidas}
            />
          </div>
        </div>

        <div className="dash-card dash-compare">
          <div className="dash-card-head">
            <h2>Comparativo Mensal</h2>
          </div>

          <div className="dash-compare-table">
            <div className="dash-compare-head">
              <span />
              <span>Mês anterior</span>
              <span>Este mês</span>
              <span>Variação</span>
            </div>

            {[
              {
                icon: <IconTrendingUp size={16} />,
                label: 'Vendas',
                anterior: moeda(dados.vendasAnterior),
                atual: moeda(dados.vendasTotal),
                variacao: dados.varVendas,
              },
              {
                icon: <IconFileText size={16} />,
                label: 'Cotações',
                anterior: numero(dados.cotacoesEmitidasAnterior),
                atual: numero(dados.cotacoesEmitidas),
                variacao: dados.varCotacoes,
              },
              {
                icon: <IconUsers size={16} />,
                label: 'Clientes atendidos',
                anterior: numero(dados.clientesAtendidosAnterior),
                atual: numero(dados.clientesAtendidos),
                variacao: dados.varClientes,
              },
              {
                icon: <IconReceipt2 size={16} />,
                label: 'Ticket médio',
                anterior: moeda(dados.ticketMedioAnterior),
                atual: moeda(dados.ticketMedio),
                variacao: dados.varTicket,
              },
            ].map((row, index) => (
              <div className="dash-compare-row" key={index}>
                <strong>
                  <i>{row.icon}</i>
                  {row.label}
                </strong>

                <span>{row.anterior}</span>
                <span>{row.atual}</span>

                <em className={row.variacao >= 0 ? 'dash-up' : 'dash-down'}>
                  {row.variacao >= 0 ? '↑' : '↓'} {pct(Math.abs(row.variacao))}
                </em>
              </div>
            ))}
          </div>
        </div>

        <div className="dash-grid-2">
          <div className="dash-card">
            <div className="dash-card-head">
              <div>
                <h2>Top Fazendas</h2>
                <p>Clientes com maior faturamento no mês</p>
              </div>
            </div>

            <BarRanking items={dados.topFazendas} />
          </div>

          <div className="dash-card">
            <div className="dash-card-head">
              <div>
                <h2>Top Produtos</h2>
                <p>Produtos com maior faturamento no mês</p>
              </div>
            </div>

            <RankingProdutos items={dados.topProdutos} />
          </div>
        </div>

        <div className="dash-grid-2">
          <div className="dash-card">
            <div className="dash-card-head">
              <h2>Meta Mensal</h2>
            </div>

            <div className="dash-goal">
              <div>
                <span>Meta mensal</span>
                <strong>{moeda(metaMensal)}</strong>
              </div>

              <div>
                <span>Realizado</span>
                <strong>{moeda(dados.vendasTotal)}</strong>
              </div>

              <em>{pct(dados.progressoMeta)}</em>

              <div className="dash-goal-track">
                <div
                  className="dash-goal-fill"
                  style={{ width: `${Math.min(100, dados.progressoMeta)}%` }}
                />
              </div>

              <div className="dash-goal-scale">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
          </div>

          <div className="dash-card">
            <div className="dash-card-head">
              <h2>Forma de Pagamento</h2>
            </div>

            <DonutSimples items={dados.porPagamento} total={dados.vendasTotal} />
          </div>
        </div>

        <div className="dash-card dash-insights">
          <div className="dash-card-head">
            <h2>
              <IconBulb size={19} />
              Insights
            </h2>
          </div>

          {dados.insights.map((insight, index) => (
            <div className="dash-insight" key={index}>
              <span>→</span>
              {insight}
            </div>
          ))}
        </div>

        <button
          type="button"
          className="dash-floating-action"
          onClick={() => navigate('/vendas')}
        >
          <IconChartBar size={19} />
          Ver vendas
        </button>
      </section>
    </main>
  )
}