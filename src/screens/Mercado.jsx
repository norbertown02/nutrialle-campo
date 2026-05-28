import { useState, useEffect, useCallback } from 'react'
import {
  IconRefresh, IconTrendingUp, IconTrendingDown, IconMinus,
  IconChevronDown, IconChevronUp, IconNews, IconGauge,
  IconChartBar, IconExternalLink
} from '@tabler/icons-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

// ─── Proxy com fallback ───────────────────────────────────────────────────────
async function tryProxy(url) {
  const proxies = [
    `https://corsproxy.io/?${encodeURIComponent(url)}`,
    `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
  ]
  for (const proxy of proxies) {
    try {
      const res  = await fetch(proxy, { signal: AbortSignal.timeout(6000) })
      if (!res.ok) continue
      const text = await res.text()
      try { const j = JSON.parse(text); return j.contents ?? text } catch { return text }
    } catch {}
  }
  return null
}

// ─── Commodities config ───────────────────────────────────────────────────────
const COMMODITIES_CFG = [
  { id: 'dolar', label: 'Dólar',     unitLabel: 'USD/BRL',     icon: '💵', source: 'awesome', descricao: 'Dólar Comercial · AwesomeAPI' },
  { id: 'boi',   label: 'Boi Gordo', unitLabel: 'R$/arroba',   icon: '🐂', source: 'yahoo', ticker: 'LE=F',  descricao: 'Futuro CME · arroba 15kg',  converter: (v,d) => (v/100)*d*15/0.4536  },
  { id: 'milho', label: 'Milho',     unitLabel: 'R$/saca 60kg',icon: '🌽', source: 'yahoo', ticker: 'ZC=F',  descricao: 'Futuro CBOT · saca 60kg',  converter: (v,d) => (v/100)*d*60/25.4012 },
  { id: 'soja',  label: 'Soja',      unitLabel: 'R$/saca 60kg',icon: '🌱', source: 'yahoo', ticker: 'ZS=F',  descricao: 'Futuro CBOT · saca 60kg',  converter: (v,d) => (v/100)*d*60/27.2155 },
]

// ─── Fetchers ─────────────────────────────────────────────────────────────────
async function fetchDolar() {
  const res  = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL', { signal: AbortSignal.timeout(4000) })
  const data = await res.json()
  const d    = data.USDBRL
  return { valor: parseFloat(d.bid), variacao: parseFloat(d.varBid), variacaoPct: parseFloat(d.pctChange), high: parseFloat(d.high), low: parseFloat(d.low) }
}

async function fetchYahoo(ticker) {
  const url  = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`
  const text = await tryProxy(url)
  if (!text) throw new Error('falhou')
  const data = JSON.parse(text)
  const meta = data.chart.result[0].meta
  return { valorUSD: meta.regularMarketPrice, prevUSD: meta.chartPreviousClose || meta.previousClose }
}

// Histórico apenas 10 dias, carregado sob demanda
async function fetchHistorico10d(commodity, dolarValor) {
  if (commodity.source === 'awesome') {
    const res  = await fetch('https://economia.awesomeapi.com.br/json/daily/USD-BRL/10')
    const data = await res.json()
    return data.reverse().map(d => ({
      data: new Date(parseInt(d.timestamp)*1000).toLocaleDateString('pt-BR', {day:'2-digit', month:'short'}),
      valor: parseFloat(d.bid),
    }))
  }
  const url  = `https://query1.finance.yahoo.com/v8/finance/chart/${commodity.ticker}?interval=1d&range=10d`
  const text = await tryProxy(url)
  if (!text) return []
  const data = JSON.parse(text)
  const r    = data.chart.result[0]
  const ts   = r.timestamp || []
  const cls  = r.indicators.quote[0].close || []
  return ts.map((t, i) => ({
    data: new Date(t*1000).toLocaleDateString('pt-BR', {day:'2-digit', month:'short'}),
    valor: cls[i] != null ? Number(commodity.converter(cls[i], dolarValor).toFixed(2)) : null,
  })).filter(d => d.valor != null)
}

async function fetchSelic() {
  const res  = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.11/dados/ultimos/1?formato=json', { signal: AbortSignal.timeout(5000) })
  const data = await res.json()
  const diaria = parseFloat(data[0].valor)
  return ((Math.pow(1 + diaria/100, 252) - 1) * 100).toFixed(2)
}

async function fetchIPCA() {
  const res  = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados/ultimos/1?formato=json', { signal: AbortSignal.timeout(5000) })
  const data = await res.json()
  return { valor: parseFloat(data[0].valor).toFixed(2), data: data[0].data }
}

async function fetchNoticias() {
  const feeds = [
    'https://news.google.com/rss/search?q=agroneg%C3%B3cio+soja+milho+pecu%C3%A1ria&hl=pt-BR&gl=BR&ceid=BR:pt-419',
    'https://www.agrolink.com.br/rss/noticias',
    'https://www.noticiasagricolas.com.br/rss/noticias.xml',
  ]
  for (const rss of feeds) {
    try {
      const text = await tryProxy(rss)
      if (!text) continue
      const doc   = new DOMParser().parseFromString(text, 'text/xml')
      const items = Array.from(doc.querySelectorAll('item')).slice(0, 8)
      const news  = items.map(item => ({
        titulo: item.querySelector('title')?.textContent?.replace(/<!\[CDATA\[|\]\]>/g,'').replace(/ - .*$/,'').trim() || '',
        link:   item.querySelector('link')?.textContent?.trim() || '',
        fonte:  item.querySelector('source')?.textContent?.trim() || '',
        data:   item.querySelector('pubDate')?.textContent?.trim() || '',
      })).filter(n => n.titulo)
      if (news.length) return news
    } catch {}
  }
  return []
}

// ─── Helpers visuais ──────────────────────────────────────────────────────────
function varCor(v) { return v > 0 ? 'var(--green)' : v < 0 ? 'var(--red)' : 'var(--text-faint)' }
function VarIcon({ v, size = 13 }) {
  if (v > 0) return <IconTrendingUp size={size} />
  if (v < 0) return <IconTrendingDown size={size} />
  return <IconMinus size={size} />
}
function fmt(v, d = 2) { return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }) }
function fmtData(str) { try { return new Date(str).toLocaleDateString('pt-BR', {day:'2-digit', month:'short'}) } catch { return '' } }

const ttStyle = {
  contentStyle: { background: '#1f1f22', border: '1px solid #323236', borderRadius: 10, fontSize: 12, color: '#EDEDEF' },
  labelStyle: { color: '#9B9C9F' },
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton({ w = '100%', h = 18, radius = 6 }) {
  return (
    <div style={{ width: w, height: h, borderRadius: radius, background: 'var(--surface-3)', animation: 'pulse 1.4s ease-in-out infinite' }} />
  )
}

// ─── Card cotação ─────────────────────────────────────────────────────────────
function CotacaoCard({ commodity, cot, dolarValor }) {
  const [expandido, setExpandido] = useState(false)
  const [historico, setHistorico] = useState([])
  const [loadHist,  setLoadHist]  = useState(false)

  async function toggleGrafico() {
    if (expandido) { setExpandido(false); return }
    setExpandido(true)
    if (historico.length) return
    setLoadHist(true)
    try {
      const hist = await fetchHistorico10d(commodity, dolarValor)
      setHistorico(hist)
    } catch {}
    setLoadHist(false)
  }

  const carregando = !cot

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', marginBottom: 10 }}>
      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 26 }}>{commodity.icon}</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{commodity.label}</div>
              <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>{commodity.descricao}</div>
            </div>
          </div>

          {carregando ? (
            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
              <Skeleton w={80} h={14} />
              <Skeleton w={60} h={22} />
              <Skeleton w={70} h={12} />
            </div>
          ) : (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: 'var(--text-faint)', marginBottom: 2 }}>{commodity.unitLabel}</div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 24, fontWeight: 700, color: 'var(--orange)', lineHeight: 1 }}>
                R$ {fmt(cot.valor)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3, marginTop: 3, color: varCor(cot.variacao), fontSize: 12 }}>
                <VarIcon v={cot.variacao} />
                {cot.variacao >= 0 ? '+' : ''}{fmt(cot.variacao)} ({Number(cot.variacaoPct).toFixed(2)}%)
              </div>
            </div>
          )}
        </div>

        {!carregando && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line-soft)' }}>
            <div style={{ display: 'flex', gap: 16 }}>
              {cot.high > 0 && <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>Máx: <span style={{ color: 'var(--text-dim)' }}>R$ {fmt(cot.high)}</span></span>}
              {cot.low  > 0 && <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>Mín: <span style={{ color: 'var(--text-dim)' }}>R$ {fmt(cot.low)}</span></span>}
            </div>
            <button onClick={toggleGrafico} style={{ background: 'none', border: '1px solid var(--line)', borderRadius: 8, color: expandido ? 'var(--orange)' : 'var(--text-dim)', padding: '4px 10px', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
              {expandido ? <IconChevronUp size={13} /> : <IconChevronDown size={13} />} 10 dias
            </button>
          </div>
        )}
      </div>

      {expandido && (
        <div style={{ paddingBottom: 14, borderTop: '1px solid var(--line-soft)' }}>
          {loadHist ? (
            <div style={{ padding: '16px 16px 4px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Skeleton h={120} radius={8} />
            </div>
          ) : historico.length > 0 ? (
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={historico} margin={{ top: 12, right: 8, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id={`g-${commodity.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#F07D1A" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#F07D1A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line-soft)" />
                <XAxis dataKey="data" tick={{ fontSize: 10, fill: 'var(--text-faint)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-faint)' }} domain={['auto','auto']} width={52} />
                <Tooltip {...ttStyle} formatter={v => [`R$ ${fmt(v)}`, commodity.label]} />
                <Area type="monotone" dataKey="valor" stroke="var(--orange)" strokeWidth={2} fill={`url(#g-${commodity.id})`} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', padding: 20, fontSize: 12, color: 'var(--text-faint)' }}>Histórico não disponível</div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Tela principal ───────────────────────────────────────────────────────────
export default function Mercado() {
  const [cotacoes,  setCotacoes]  = useState({ dolar: null, boi: null, milho: null, soja: null, _dolar: null })
  const [selic,     setSelic]     = useState(null)
  const [ipca,      setIpca]      = useState(null)
  const [noticias,  setNoticias]  = useState(null) // null = carregando, [] = vazio
  const [ultimaAtt, setUltimaAtt] = useState(null)

  function parseCommodity(result, cfg, dolarValor) {
    if (result.status !== 'fulfilled' || !result.value) return null
    const { valorUSD, prevUSD } = result.value
    const valor    = cfg.converter(valorUSD, dolarValor)
    const prev     = cfg.converter(prevUSD,  dolarValor)
    const variacao = valor - prev
    return { valor, variacao, variacaoPct: (variacao / prev) * 100, high: 0, low: 0 }
  }

  const carregar = useCallback(async () => {
    // FASE 1 — Dólar imediato
    try {
      const dolar = await fetchDolar()
      setCotacoes(prev => ({ ...prev, dolar, _dolar: dolar.valor }))

      // FASE 2 — Commodities, indicadores e notícias em paralelo
      const [boi, milho, soja, selicR, ipcaR, newsR] = await Promise.allSettled([
        fetchYahoo('LE=F'),
        fetchYahoo('ZC=F'),
        fetchYahoo('ZS=F'),
        fetchSelic(),
        fetchIPCA(),
        fetchNoticias(),
      ])

      setCotacoes(prev => ({
        ...prev,
        boi:   parseCommodity(boi,   COMMODITIES_CFG[1], dolar.valor),
        milho: parseCommodity(milho, COMMODITIES_CFG[2], dolar.valor),
        soja:  parseCommodity(soja,  COMMODITIES_CFG[3], dolar.valor),
      }))

      if (selicR.status === 'fulfilled') setSelic(selicR.value)
      if (ipcaR.status  === 'fulfilled') setIpca(ipcaR.value)
      setNoticias(newsR.status === 'fulfilled' ? newsR.value : [])
      setUltimaAtt(new Date())
    } catch {}
  }, [])

  useEffect(() => {
    carregar()
    const t = setInterval(carregar, 5 * 60 * 1000)
    return () => clearInterval(t)
  }, [carregar])

  const INDICADORES = [
    { label: 'Selic',  valor: selic ? `${selic}% a.a.` : null, sub: 'Taxa básica · Banco Central', cor: 'var(--blue)' },
    { label: 'IPCA',   valor: ipca  ? `${ipca.valor}%` : null, sub: ipca ? `Mês ${ipca.data}` : 'Inflação mensal · IBGE', cor: parseFloat(ipca?.valor) > 0.5 ? 'var(--red)' : 'var(--green)' },
  ]

  return (
    <div className="content">
      <div className="page-head">
        <div className="eyebrow">Agronegócio</div>
        <h2>Mercado</h2>
        <p>Cotações, indicadores e notícias do campo</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>
          {ultimaAtt ? `Atualizado ${ultimaAtt.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}` : 'Buscando cotações...'}
        </span>
        <button onClick={carregar} style={{ background: 'none', border: '1px solid var(--line)', borderRadius: 8, color: 'var(--orange)', padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
          <IconRefresh size={13} /> Atualizar
        </button>
      </div>

      {/* Cotações */}
      <div className="section-label"><IconChartBar size={13} style={{ verticalAlign: -2, marginRight: 4 }} />Câmbio e Commodities</div>
      {COMMODITIES_CFG.map(c => (
        <CotacaoCard key={c.id} commodity={c} cot={cotacoes[c.id]} dolarValor={cotacoes._dolar} />
      ))}

      {/* Indicadores */}
      <div className="section-label" style={{ marginTop: 8 }}><IconGauge size={13} style={{ verticalAlign: -2, marginRight: 4 }} />Indicadores Econômicos</div>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', marginBottom: 16 }}>
        {INDICADORES.map((item, i) => (
          <div key={item.label} style={{ padding: '13px 16px', borderBottom: i < INDICADORES.length - 1 ? '1px solid var(--line-soft)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 13, color: 'var(--text)' }}>{item.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>{item.sub}</div>
            </div>
            {item.valor
              ? <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 20, fontWeight: 700, color: item.cor }}>{item.valor}</div>
              : <Skeleton w={70} h={20} />
            }
          </div>
        ))}
      </div>

      {/* Notícias */}
      <div className="section-label" style={{ marginTop: 8 }}><IconNews size={13} style={{ verticalAlign: -2, marginRight: 4 }} />Notícias Agrícolas</div>
      {noticias === null ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2,3,4].map(i => <Skeleton key={i} h={16} radius={6} />)}
        </div>
      ) : noticias.length === 0 ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: 20, textAlign: 'center', color: 'var(--text-faint)', fontSize: 13 }}>
          Notícias indisponíveis no momento
        </div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', marginBottom: 16 }}>
          {noticias.map((n, i) => (
            <a key={i} href={n.link} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', textDecoration: 'none', borderBottom: i < noticias.length - 1 ? '1px solid var(--line-soft)' : 'none' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.4, fontWeight: 500 }}>{n.titulo}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  {n.fonte && <span style={{ fontSize: 11, color: 'var(--orange)' }}>{n.fonte}</span>}
                  {n.data  && <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{fmtData(n.data)}</span>}
                </div>
              </div>
              <IconExternalLink size={13} color="var(--text-faint)" style={{ flexShrink: 0, marginTop: 2 }} />
            </a>
          ))}
        </div>
      )}

      <div style={{ fontSize: 11, color: 'var(--text-faint)', textAlign: 'center', paddingBottom: 8 }}>
        AwesomeAPI · Yahoo Finance · Banco Central · Google News
      </div>

      <style>{`
        @keyframes spin  { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  )
}
