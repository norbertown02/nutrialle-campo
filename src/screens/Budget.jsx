import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../lib/useAuth.jsx'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import {
  IconArrowLeft, IconChevronDown, IconChevronUp, IconPlus, IconSearch, IconCheck,
  IconArrowRight, IconRefresh, IconSend, IconCalendarMonth, IconBuildingStore,
  IconX, IconUserPlus, IconAlertCircle, IconPackage, IconPencil, IconClipboardCheck, IconTrash
} from '@tabler/icons-react'
import './Budget.css'

const brl = n => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const num = n => Number(n || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })
const monthName = m => new Date(m + '-01T12:00:00').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '')
const normal = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
const decimal = value => Math.max(0, Number(String(value ?? 0).replace(',', '.')) || 0)
const qtyFrom = item => Number(item.quantityKg ?? item.quantity ?? item.qty ?? 0)
const priceFrom = item => Number(item.priceKg ?? item.unitPrice ?? item.unit_price ?? item.price_kg ?? 0)
const itemCode = item => String(item.productKey || item.product_code || item.productCode ||
  (item.ultra_codproduto != null ? String(item.ultra_codproduto) + '/' + String(item.ultra_codproduto_clas || 1) : '')).split('/')[0]

function historicalProducts(history, products) {
  const byId = new Map(products.map(p => [p.id, p]))
  const byUltra = new Map(products.filter(p => p.ultra_codproduto != null).map(p => [String(p.ultra_codproduto), p]))
  const byName = new Map(products.map(p => [normal(p.name), p]))
  const out = new Map()
  for (const sale of history) {
    if (!Array.isArray(sale.items) || !sale.farm_id) continue
    for (const item of sale.items) {
      const product = byId.get(item.canonicalProductId || item.productId || item.product_id) ||
        byUltra.get(itemCode(item)) || byName.get(normal(item.productName || item.product_name || item.name))
      if (!product) continue
      const key = sale.farm_id + '|' + product.id
      const prev = out.get(key) || { farm_id: sale.farm_id, product_id: product.id, quantity: 0, value: 0 }
      const amount = Math.max(0, qtyFrom(item))
      prev.quantity += amount
      prev.value += amount * Math.max(0, priceFrom(item))
      out.set(key, prev)
    }
  }
  return [...out.values()].map(x => ({
    ...x, average: x.quantity / 3,
    unit_price: x.quantity ? x.value / x.quantity : 0,
  }))
}
function BudgetNotice({ message, dismiss }) {
  if (!message) return null
  return <div className={'bfd-notice ' + (message.kind || 'info')} role="status">
    <IconAlertCircle size={18}/><span>{message.text}</span>
    <button aria-label="Fechar aviso" onClick={dismiss}><IconX size={15}/></button>
  </div>
}
function ForecastEditor({ product, months, rows, history, editable, newEntry, onSave, onCancel, onRemove, saving }) {
  const [quantity, setQuantity] = useState(() => Object.fromEntries(months.map(m => [
    m, String(rows.find(r => r.month === m)?.quantity_kg ?? (newEntry && history ? Math.round(history.average * 1000) / 1000 : 0)),
  ])))
  const [unitPrice, setUnitPrice] = useState(() => String(rows[0]?.unit_price || history?.unit_price || product.price_kg || ''))
  const source = rows[0]?.source || (history ? 'recurring' : 'opportunity')
  const total = months.reduce((a, month) => a + decimal(quantity[month]) * decimal(unitPrice), 0)
  const hasPositive = months.some(month => decimal(quantity[month]) > 0)
  const invalidPrice = hasPositive && decimal(unitPrice) === 0

  return <div className="bfd-editor">
    <div className="bfd-editor-title">
      <div><span className="bfd-overline">{newEntry ? 'NOVO PRODUTO NA PREVISÃO' : 'AJUSTAR PREVISÃO'}</span><h4>{product.name}</h4></div>
      <button type="button" aria-label="Cancelar edição" className="bfd-icon" onClick={onCancel}><IconX size={18}/></button>
    </div>
    {history && <div className="bfd-history-bar"><IconRefresh size={16}/><span>Média de pedidos: <strong>{num(history.average)} kg/mês</strong></span></div>}
    <div className="bfd-editor-months">
      {months.map(month => <label key={month} className="bfd-quantity-row">
        <span>{monthName(month)}</span>
        <div><input type="text" inputMode="decimal" value={quantity[month] ?? ''} disabled={!editable || saving}
          aria-label={'Quantidade prevista de ' + product.name + ' em ' + monthName(month)}
          onChange={e => setQuantity(prev => ({ ...prev, [month]: e.target.value }))}/><small>kg</small></div>
      </label>)}
    </div>
    <label className="bfd-price">Preço de referência <small>(R$/kg)</small>
      <input type="text" inputMode="decimal" disabled={!editable || saving} value={unitPrice} onChange={e => setUnitPrice(e.target.value)} placeholder="Ex.: 4,80"/>
    </label>
    {invalidPrice && <div className="bfd-inline-warning">Informe o preço para calcular o orçamento em reais.</div>}
    <div className="bfd-editor-bottom">
      <span><small>Total dos meses</small><strong>{brl(total)}</strong></span>
      {editable && <button disabled={saving || invalidPrice} type="button" className="bfd-btn bfd-btn-primary"
        onClick={() => onSave(Object.fromEntries(months.map(m => [m, decimal(quantity[m])])), decimal(unitPrice), source)}>
        <IconCheck size={16}/>{saving ? 'Salvando...' : newEntry ? 'Adicionar ao budget' : 'Salvar alterações'}
      </button>}
    </div>
    {editable && !newEntry && onRemove && <button type="button" className="bfd-remove-product" disabled={saving} onClick={onRemove}><IconTrash size={13}/> Remover este produto da previsão</button>}
  </div>
}

export default function Budget() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [cycles, setCycles] = useState([])
  const [assignments, setAssignments] = useState([])
  const [items, setItems] = useState([])
  const [reviews, setReviews] = useState([])
  const [farms, setFarms] = useState([])
  const [products, setProducts] = useState([])
  const [history, setHistory] = useState([])
  const [cycleId, setCycleId] = useState('')
  const [activeFarm, setActiveFarm] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [picker, setPicker] = useState(false)
  const [productQuery, setProductQuery] = useState('')
  const [chosenProductId, setChosenProductId] = useState('')
  const [editingProductId, setEditingProductId] = useState('')
  const [addingClient, setAddingClient] = useState(false)
  const [newClient, setNewClient] = useState({ name: '', segment: 'leite', city: '' })
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState(null)

  async function load() {
    if (!user?.id) return
    setLoading(true)
    const [a, c, f, p, h] = await Promise.all([
      supabase.from('budget_cycle_sellers').select('*').eq('seller_id', user.id),
      supabase.from('budget_cycles').select('*').order('created_at', { ascending: false }),
      supabase.rpc('budget_my_clients'),
      supabase.from('products').select('id,name,ultra_codproduto,price_kg,segment').eq('active', true).order('name'),
      supabase.rpc('budget_my_sales_history'),
    ])
    const error = [a, c, f, p, h].find(r => r.error)?.error
    if (error) setNotice({ kind: 'error', text: 'Falha ao carregar os dados: ' + error.message })
    setAssignments(a.data || [])
    setCycles(c.data || [])
    setFarms(f.data || [])
    setProducts(p.data || [])
    setHistory(h.data || [])
    setCycleId(old => old || (c.data || []).find(cycle => (a.data || []).some(a => a.cycle_id === cycle.id))?.id || '')
    setLoading(false)
  }
  useEffect(() => { load() }, [user?.id])

  const availableCycles = cycles.filter(c => assignments.some(a => a.cycle_id === c.id))
  const cycle = availableCycles.find(c => c.id === cycleId)
  const assignment = assignments.find(a => a.cycle_id === cycleId)
  const editable = Boolean(cycle?.status === 'open' &&
    new Date() >= new Date(cycle.opens_at) &&
    new Date() <= new Date(cycle.closes_at) &&
    ['pending', 'draft', 'revision_requested'].includes(assignment?.status))
  const suggestions = useMemo(() => historicalProducts(history, products), [history, products])
  const myFarms = farms
  const farmById = useMemo(() => new Map(farms.map(f => [f.id, f])), [farms])
  const productById = useMemo(() => new Map(products.map(p => [p.id, p])), [products])
  const client = farmById.get(activeFarm)
  const farmItems = items.filter(item => item.farm_id === activeFarm)
  const farmSuggestions = suggestions.filter(s => s.farm_id === activeFarm && !farmItems.some(i => i.product_id === s.product_id))
  const noSales = reviews.some(r => r.farm_id === activeFarm)
  const plannedValue = items.reduce((a, i) => a + Number(i.quantity_kg) * Number(i.unit_price), 0)
  const plannedKg = items.reduce((a, i) => a + Number(i.quantity_kg), 0)
  const clientsWithForecast = new Set(items.filter(i => Number(i.quantity_kg) > 0).map(i => i.farm_id))
  const reviewedClients = new Set([...clientsWithForecast, ...reviews.map(r => r.farm_id)])
  const remaining = myFarms.filter(f => !reviewedClients.has(f.id)).length
  const filteredFarms = myFarms.filter(f => {
    const matches = normal(f.name + ' ' + (f.city || '')).includes(normal(query))
    if (!matches) return false
    if (filter === 'pending') return !reviewedClients.has(f.id)
    if (filter === 'planned') return clientsWithForecast.has(f.id)
    if (filter === 'zero') return reviews.some(r => r.farm_id === f.id)
    return true
  })
  const availableProducts = products.filter(p => !farmItems.some(i => i.product_id === p.id) &&
    normal(p.name + ' ' + (p.ultra_codproduto || '')).includes(normal(productQuery))).slice(0, 35)

  useEffect(() => {
    if (!cycleId || !user?.id) { setItems([]);setReviews([]);return }
    let active = true
    Promise.all([
      supabase.from('budget_items').select('*').eq('cycle_id', cycleId).eq('seller_id', user.id),
      supabase.from('budget_client_reviews').select('*').eq('cycle_id', cycleId).eq('seller_id', user.id),
    ]).then(([i, r]) => {
      if (!active) return
      setItems(i.data || []);setReviews(r.data || [])
      if (i.error || r.error) setNotice({ kind: 'error', text: (i.error || r.error).message })
    })
    return () => { active = false }
  }, [cycleId, user?.id])

  async function markStarted() {
    if (!['pending', 'revision_requested'].includes(assignment?.status)) return
    const { error } = await supabase.from('budget_cycle_sellers')
      .update({ status: 'draft' }).eq('cycle_id', cycleId).eq('seller_id', user.id)
    if (!error) setAssignments(prev => prev.map(a => a.cycle_id === cycleId ? { ...a, status: 'draft' } : a))
  }
  async function upsertForecast(farmId, productId, values, unitPrice, source) {
    if (!editable) return false
    if (!farmById.has(farmId)) { setNotice({ kind: 'error', text: 'Cliente não está na sua carteira. Atualize a página.' });return false }
    if (Object.values(values).some(v => v > 0) && unitPrice <= 0) {
      setNotice({ kind: 'error', text: 'Informe um preço de referência para este produto.' });return false
    }
    setBusy(true);setNotice(null)
    const list = cycle.months.map(month => ({
      cycle_id: cycleId, seller_id: user.id, farm_id: farmId, product_id: productId,
      month, quantity_kg: Math.round(Math.max(0, values[month] || 0) * 1000) / 1000,
      unit_price: unitPrice, source,
    }))
    const { data, error } = await supabase.from('budget_items').upsert(list, {
      onConflict: 'cycle_id,seller_id,farm_id,product_id,month',
    }).select()
    if (error) setNotice({ kind: 'error', text: 'Não foi possível salvar: ' + error.message })
    else {
      setItems(prev => [...prev.filter(x => !data.some(d => d.farm_id === x.farm_id && d.product_id === x.product_id && d.month === x.month)), ...data])
      setNotice({ kind: 'success', text: 'Previsão de ' + (productById.get(productId)?.name || 'produto') + ' salva.' })
      await markStarted()
    }
    setBusy(false)
    return !error
  }
  async function removeForecast(farmId, productId) {
    if (!editable) return
    if (!window.confirm('Retirar este produto da previsão de todos os meses?')) return
    setBusy(true);setNotice(null)
    const { error } = await supabase.from('budget_items').delete()
      .eq('cycle_id', cycleId).eq('seller_id', user.id).eq('farm_id', farmId).eq('product_id', productId)
    if (error) setNotice({ kind: 'error', text: error.message })
    else {setItems(prev => prev.filter(i => !(i.farm_id === farmId && i.product_id === productId)));setEditingProductId('');setNotice({ kind: 'success', text: 'Produto retirado da previsão deste cliente.' })}
    setBusy(false)
  }
  async function addHistoryRows(clientId = null) {
    if (!editable) return
    const source = suggestions.filter(s => (!clientId || s.farm_id === clientId) &&
      farmById.has(s.farm_id) &&
      !reviews.some(r => r.farm_id === s.farm_id))
    const list = source.flatMap(s => cycle.months.filter(month =>
      !items.some(x => x.farm_id === s.farm_id && x.product_id === s.product_id && x.month === month)
    ).map(month => ({
      cycle_id: cycleId, seller_id: user.id, farm_id: s.farm_id, product_id: s.product_id, month,
      quantity_kg: Math.round(s.average * 1000) / 1000,
      unit_price: Math.max(0, s.unit_price || Number(productById.get(s.product_id)?.price_kg) || 0),
      source: 'recurring',
    })))
    if (!list.length) { setNotice({ kind: 'info', text: 'Todos os produtos históricos já foram adicionados.' });return }
    setBusy(true);setNotice(null)
    let saved = [];let failure = null
    for (let offset = 0; offset < list.length; offset += 160) {
      const { data, error } = await supabase.from('budget_items').upsert(list.slice(offset, offset + 160), {
        onConflict: 'cycle_id,seller_id,farm_id,product_id,month',
      }).select()
      if (error) { failure = error;break }
      saved = saved.concat(data || [])
    }
    if (saved.length) { setItems(prev => [...prev, ...saved]);await markStarted() }
    setBusy(false)
    setNotice(failure ? { kind: 'error', text: failure.message } :
      { kind: 'success', text: 'Histórico aplicado. Revise as quantidades sugeridas antes de enviar.' })
  }
  async function toggleNoSales(farmId) {
    if (!editable) return
    const exists = reviews.some(r => r.farm_id === farmId)
    if (!exists && items.some(x => x.farm_id === farmId && Number(x.quantity_kg) > 0)) {
      setNotice({ kind: 'error', text: 'Este cliente tem volume previsto. Primeiro zere as quantidades.' });return
    }
    setBusy(true);setNotice(null)
    if (exists) {
      const { error } = await supabase.from('budget_client_reviews').delete().eq('cycle_id', cycleId).eq('seller_id', user.id).eq('farm_id', farmId)
      if (!error) setReviews(prev => prev.filter(r => r.farm_id !== farmId))
      else setNotice({ kind: 'error', text: error.message })
    } else {
      const { data, error } = await supabase.from('budget_client_reviews').upsert({
        cycle_id: cycleId, seller_id: user.id, farm_id: farmId, status: 'no_sales',
      }, { onConflict: 'cycle_id,seller_id,farm_id' }).select().single()
      if (!error) setReviews(prev => [...prev.filter(r => r.farm_id !== farmId), data])
      else setNotice({ kind: 'error', text: error.message })
    }
    await markStarted()
    setBusy(false)
  }
  async function createClient() {
    const name = newClient.name.trim()
    if (name.length < 3) { setNotice({ kind: 'error', text: 'Informe um nome de pelo menos três caracteres.' });return }
    if (myFarms.some(f => normal(f.name) === normal(name))) {
      setNotice({ kind: 'error', text: 'Este cliente já está na sua carteira. Encontre-o pela busca.' });return
    }
    setBusy(true);setNotice(null)
    const id = crypto.randomUUID()
    const { data, error } = await supabase.from('farms').insert({
      id, name, seller_id: user.id, segment: newClient.segment,
      city: newClient.city.trim() || null, prospect: true, status: 'ativo',
    }).select('id,name,seller_id,prospect,segment,city').single()
    if (error) setNotice({ kind: 'error', text: 'Não foi possível cadastrar: ' + error.message })
    else {
      setFarms(prev => [...prev, { ...data, assigned: true }].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')))
      setActiveFarm(data.id);setQuery('');setFilter('all')
      setAddingClient(false);setNewClient({ name: '', segment: 'leite', city: '' })
      setNotice({ kind: 'success', text: 'Cliente incluído como prospecto. Você já pode planejar produtos; complete o cadastro para efetuar pedidos.' })
    }
    setBusy(false)
  }
  async function submit() {
    if (!editable || busy) return
    if (!items.length && !reviews.length) {
      setNotice({ kind: 'error', text: 'Avalie ao menos um cliente antes de enviar.' });return
    }
    const message = remaining
      ? 'Ainda existem ' + remaining + ' clientes sem avaliação. Deseja enviar o budget mesmo assim?'
      : 'Enviar budget para aprovação? Depois do envio ele ficará bloqueado para edição.'
    if (!window.confirm(message)) return
    setBusy(true)
    const { error } = await supabase.from('budget_cycle_sellers')
      .update({ status: 'submitted' }).eq('cycle_id', cycleId).eq('seller_id', user.id)
    if (error) setNotice({ kind: 'error', text: error.message })
    else {
      setAssignments(prev => prev.map(a => a.cycle_id === cycleId ? { ...a, status: 'submitted' } : a))
      setNotice({ kind: 'success', text: 'Budget enviado para aprovação.' })
    }
    setBusy(false)
  }
  const openClient = id => {setActiveFarm(old => old === id ? '' : id);setPicker(false);setChosenProductId('');setEditingProductId('');setProductQuery('')}
  const openNewProduct = id => {
    setActiveFarm(id);setChosenProductId('');setProductQuery('');setEditingProductId('');setPicker(true)
  }
  const sortedFarmProducts = [...new Set(farmItems.map(i => i.product_id))]
  return <main className="bfd-page">
    <button type="button" className="bfd-back" onClick={() => navigate('/')}><IconArrowLeft size={16}/> Início</button>
    <header className="bfd-hero">
      <span className="bfd-overline">PLANEJAMENTO DE VENDAS</span>
      <h1>Meu Budget</h1>
      <p>Monte sua previsão cliente por cliente, com sugestões baseadas nos pedidos dos últimos três meses completos.</p>
    </header>
    <BudgetNotice message={notice} dismiss={() => setNotice(null)}/>
    {loading && <div className="bfd-empty"><IconRefresh size={24}/><h3>Carregando planejamento...</h3></div>}
    {!loading && !availableCycles.length && <div className="bfd-empty"><IconCalendarMonth size={27}/><h3>Aguardando liberação</h3><p>Os meses do budget serão exibidos quando a gestão liberar um ciclo para você.</p></div>}
    {!loading && cycle && <>
      {availableCycles.length > 1 && <label className="bfd-cycle-picker">Ciclo<select value={cycleId} onChange={e => {setCycleId(e.target.value);setActiveFarm('');setQuery('')}}>{availableCycles.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></label>}
      <div className="bfd-current-cycle">
        <div><small>CICLO DE PLANEJAMENTO</small><strong>{cycle.title}</strong><span>{cycle.months.map(monthName).join(' · ')}</span></div>
        <span className={'bfd-state ' + (editable ? 'open' : 'closed')}>{editable ? 'Liberado' : assignment?.status === 'approved' ? 'Aprovado' : assignment?.status === 'submitted' ? 'Enviado' : cycle.status === 'draft' ? 'Aguardando liberação' : 'Somente leitura'}</span>
      </div>
      {assignment?.feedback && <div className="bfd-feedback"><strong>Orientação da gestão</strong><p>{assignment.feedback}</p></div>}
      <div className="bfd-summary">
        <div><small>Previsão total</small><strong>{brl(plannedValue)}</strong><span>{num(plannedKg / 1000)} t previstas</span></div>
        <div><small>Clientes avaliados</small><strong>{reviewedClients.size} <em>/ {myFarms.length}</em></strong><span>{remaining} aguardando análise</span></div>
      </div>
      {editable && <div className="bfd-main-actions">
        <button className="bfd-main-action primary" onClick={() => setAddingClient(true)}><IconUserPlus size={18}/><span><strong>Novo cliente</strong><small>Incluir no planejamento</small></span><IconPlus size={15}/></button>
        <button className="bfd-main-action" disabled={busy} onClick={() => addHistoryRows()}><IconRefresh size={17}/><span><strong>Usar histórico</strong><small>Pré-preencher médias</small></span></button>
      </div>}
      <div className="bfd-list-title"><div><span className="bfd-overline">CARTEIRA COMERCIAL</span><h2>Clientes do planejamento</h2></div><span>{myFarms.length} clientes</span></div>
      <label className="bfd-client-search"><IconSearch size={18}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar cliente ou cidade..." aria-label="Buscar clientes"/></label>
      <div className="bfd-tabs" role="group" aria-label="Filtrar clientes">
        {[['all','Todos'],['pending','Pendentes'],['planned','Com previsão'],['zero','Sem vendas']].map(([value,label]) => <button key={value} aria-pressed={filter === value} className={filter === value ? 'active' : ''} onClick={() => {setFilter(value);setActiveFarm('')}}>{label}</button>)}
      </div>
      <section className="bfd-client-list">
        {!filteredFarms.length && <div className="bfd-empty small"><IconSearch size={22}/><p>Não há clientes neste filtro.</p>{editable && <button onClick={() => setAddingClient(true)} className="bfd-btn bfd-btn-dark"><IconPlus size={14}/> Adicionar cliente</button>}</div>}
        {filteredFarms.map(f => {
          const thisClientRows = items.filter(r => r.farm_id === f.id)
          const productCount = new Set(thisClientRows.map(r => r.product_id)).size
          const clientValue = thisClientRows.reduce((sum, r) => sum + Number(r.quantity_kg) * Number(r.unit_price), 0)
          const forecast = clientsWithForecast.has(f.id)
          const reviewedZero = reviews.some(r => r.farm_id === f.id)
          const open = activeFarm === f.id
          return <article key={f.id} className={'bfd-client ' + (open ? 'is-open' : '')}>
            <button type="button" className="bfd-client-header" onClick={() => openClient(f.id)} aria-expanded={open}>
              <span className="bfd-client-avatar">{f.name.slice(0, 2).toUpperCase()}</span>
              <span className="bfd-client-text"><strong>{f.name}</strong><small>{reviewedZero ? 'Sem vendas previstas' : forecast ? productCount + ' produtos · ' + brl(clientValue) : f.prospect ? 'Prospecto · sem previsão' : 'Aguardando previsão'}</small></span>
              {reviewedZero ? <span className="bfd-client-mark muted"><IconCheck size={14}/></span> : forecast ? <span className="bfd-client-mark"><IconCheck size={14}/></span> : null}
              {open ? <IconChevronUp size={17}/> : <IconChevronDown size={17}/>}
            </button>
            {open && <div className="bfd-client-detail">
              <div className="bfd-client-tools">
                <div><span className="bfd-overline">PREVISÃO POR PRODUTO</span><h3>{f.name}</h3>{f.prospect && <button type="button" className="bfd-complete-customer" onClick={() => navigate('/clientes/' + f.id)}>Pré-cadastro · completar ficha <IconArrowRight size={13}/></button>}{f.assigned === false && <small>Cliente do seu histórico de vendas · carteira vinculada a outro responsável</small>}</div>
                {editable && <button className="bfd-btn bfd-btn-dark" disabled={busy} onClick={() => openNewProduct(f.id)}><IconPlus size={16}/> Produto</button>}
              </div>
              {editable && !reviewedZero && farmSuggestions.length > 0 && <div className="bfd-suggestions">
                <div><strong>Sugestões do histórico</strong><span>{farmSuggestions.length} produtos</span></div>
                <button type="button" disabled={busy} onClick={() => addHistoryRows(f.id)}>Aplicar média para este cliente <IconArrowRight size={14}/></button>
                <div className="bfd-suggestion-lines">{farmSuggestions.slice(0, 4).map(s => <span key={s.product_id}>{productById.get(s.product_id)?.name} · {num(s.average)} kg/mês</span>)}{farmSuggestions.length > 4 && <span>+ {farmSuggestions.length - 4} outros produtos</span>}</div>
              </div>}
              {editable && <div className="bfd-zero-action">
                <span>{reviewedZero ? 'Cliente avaliado: nenhuma venda prevista nos meses liberados.' : 'Nenhuma venda prevista para este cliente?'}</span>
                <button disabled={busy} onClick={() => toggleNoSales(f.id)}>{reviewedZero ? 'Desfazer' : 'Marcar sem vendas'}</button>
              </div>}
              {picker && editable && <div className="bfd-product-picker">
                <div className="bfd-picker-head"><strong>Adicionar produto ao cliente</strong><button className="bfd-icon" aria-label="Fechar seleção" onClick={() => {setPicker(false);setChosenProductId('')}}><IconX size={17}/></button></div>
                {!chosenProductId ? <>
                  <label className="bfd-picker-search"><IconSearch size={17}/><input autoFocus placeholder="Digite o nome ou código do produto" value={productQuery} onChange={e => setProductQuery(e.target.value)}/></label>
                  <div className="bfd-product-results">
                    {availableProducts.map(p => <button type="button" key={p.id} onClick={() => setChosenProductId(p.id)}>
                      <span className="bfd-product-symbol"><IconPackage size={17}/></span><span><strong>{p.name}</strong><small>{p.ultra_codproduto ? 'Código ' + p.ultra_codproduto : 'Produto do catálogo'} · {Number(p.price_kg) > 0 ? brl(p.price_kg) + '/kg' : 'Sem preço de referência'}</small></span><IconPlus size={17}/></button>)}
                    {!availableProducts.length && <p>Nenhum produto encontrado. Procure pelo nome ou pelo código.</p>}
                    {availableProducts.length === 35 && <small className="bfd-picker-hint">Mostrando 35 produtos. Digite para refinar a busca.</small>}
                  </div>
                </> : <ForecastEditor key={f.id + ':' + chosenProductId} product={productById.get(chosenProductId)} months={cycle.months}
                  rows={[]} history={suggestions.find(s => s.farm_id === f.id && s.product_id === chosenProductId)}
                  newEntry editable={editable} saving={busy} onCancel={() => setChosenProductId('')}
                  onSave={async (volumes, price, source) => {
                    const ok = await upsertForecast(f.id, chosenProductId, volumes, price, source)
                    if (ok) {setChosenProductId('');setPicker(false);setProductQuery('')}
                  }}/>
                }
              </div>}
              <div className="bfd-product-list">
                {sortedFarmProducts.length === 0 && !picker && <div className="bfd-first-product"><IconPackage size={25}/><strong>Ainda não há produtos previstos</strong><p>Você pode aplicar o histórico do cliente ou adicionar qualquer produto do catálogo.</p>{editable && <button className="bfd-btn bfd-btn-primary" onClick={() => openNewProduct(f.id)}><IconPlus size={16}/> Adicionar primeiro produto</button>}</div>}
                {sortedFarmProducts.map(id => {
                  const product = productById.get(id)
                  if (!product) return null
                  const rows = farmItems.filter(r => r.product_id === id)
                  const h = suggestions.find(s => s.farm_id === f.id && s.product_id === id)
                  const total = rows.reduce((a, r) => a + Number(r.quantity_kg) * Number(r.unit_price), 0)
                  const openedEditor = editingProductId === id
                  return <div key={id} className="bfd-product-card">
                    <button type="button" className="bfd-product-line" onClick={() => setEditingProductId(openedEditor ? '' : id)}>
                      <span className="bfd-product-symbol"><IconPackage size={18}/></span>
                      <span className="bfd-product-info"><strong>{product.name}</strong><small>{num(rows.reduce((sum, r) => sum + Number(r.quantity_kg), 0))} kg previstos · {brl(total)}</small></span>
                      {openedEditor ? <IconChevronUp size={17}/> : <IconPencil size={16}/>}
                    </button>
                    {openedEditor && <ForecastEditor key={cycleId + id} product={product} rows={rows} months={cycle.months} history={h} editable={editable} saving={busy}
                      onCancel={() => setEditingProductId('')}
                      onRemove={() => removeForecast(f.id, id)}
                      onSave={async (volumes, price, source) => {
                        const ok = await upsertForecast(f.id, id, volumes, price, source)
                        if (ok) setEditingProductId('')
                      }}/>}
                  </div>
                })}
              </div>
            </div>}
          </article>
        })}
      </section>
      {editable && <div className="bfd-submit-panel"><div><IconClipboardCheck size={18}/><span><strong>Pronto para enviar?</strong><small>{remaining ? remaining + ' clientes ainda sem avaliação' : 'Sua carteira está revisada'}</small></span></div><button type="button" className="bfd-btn bfd-btn-primary" disabled={busy} onClick={submit}><IconSend size={16}/> Enviar para aprovação</button></div>}
      <p className="bfd-footnote">A média considera produtos dos pedidos dos últimos três meses encerrados e serve apenas como referência. O budget não altera pedidos, metas ou faturamento.</p>
    </>}
    {addingClient && editable && <div className="bfd-modal-overlay" onClick={() => !busy && setAddingClient(false)}>
      <div className="bfd-modal" role="dialog" aria-modal="true" aria-label="Adicionar novo cliente" onClick={e => e.stopPropagation()}>
        <div className="bfd-modal-grip"/>
        {notice?.kind === 'error' && <div className="bfd-modal-error" role="alert">{notice.text}</div>}
        <div className="bfd-modal-heading"><div><span className="bfd-overline">OPORTUNIDADE COMERCIAL</span><h2>Novo cliente</h2><p>Crie um pré-cadastro para incluir imediatamente na sua previsão. Complete a ficha do cliente depois, antes de realizar pedidos.</p></div><button className="bfd-icon" onClick={() => setAddingClient(false)} aria-label="Fechar"><IconX size={18}/></button></div>
        <label>Nome do cliente / empresa <span>*</span><input autoFocus value={newClient.name} onChange={e => setNewClient(prev => ({ ...prev, name: e.target.value }))} placeholder="Nome da fazenda ou empresa"/></label>
        <label>Segmento<select value={newClient.segment} onChange={e => setNewClient(prev => ({ ...prev, segment: e.target.value }))}><option value="leite">Bovinos de leite</option><option value="corte">Bovinos de corte</option><option value="suinos">Suínos</option></select></label>
        <label>Cidade <small>Opcional</small><input value={newClient.city} onChange={e => setNewClient(prev => ({ ...prev, city: e.target.value }))} placeholder="Ex.: Cascavel"/></label>
        <button className="bfd-btn bfd-btn-primary bfd-modal-submit" disabled={busy || newClient.name.trim().length < 3} onClick={createClient}><IconCheck size={17}/>{busy ? 'Cadastrando...' : 'Cadastrar e planejar'}</button>
      </div>
    </div>}
  </main>
}
