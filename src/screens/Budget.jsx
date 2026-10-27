import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../lib/useAuth.jsx'
import { supabase } from '../lib/supabase'
import { IconArrowLeft, IconChevronDown, IconChevronUp, IconPlus, IconRefresh, IconSend, IconDeviceFloppy, IconSearch } from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import './Budget.css'

const brl = n => Number(n || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
const integer = n => Number(n || 0).toLocaleString('pt-BR',{maximumFractionDigits:1})
const monthLabel = m => new Date(m+'-01T12:00:00').toLocaleDateString('pt-BR',{month:'short',year:'2-digit'})
const norm = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase()
const itemCode = i => String(i.productKey || i.product_code || i.productCode || (i.ultra_codproduto != null ? i.ultra_codproduto+'/'+(i.ultra_codproduto_clas||1) : '') || '')
const qty = i => Number(i.quantityKg ?? i.quantity ?? i.qty ?? 0)
const price = i => Number(i.priceKg ?? i.unitPrice ?? i.unit_price ?? i.price_kg ?? 0)
const monthsBack = () => { const d=new Date(); return Array.from({length:3},(_,n)=>{const x=new Date(d.getFullYear(),d.getMonth()-3+n,1);return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')}) }
function matchProduct(item, products) {
  const id = item.canonicalProductId || item.productId || item.product_id
  const direct=products.find(p=>p.id===id)
  if(direct) return direct
  const code = itemCode(item).split('/')[0]
  return products.find(p=>String(p.ultra_codproduto||'')===code && code) ||
    products.find(p=>norm(p.name)===norm(item.productName||item.product_name||item.name))
}
function historyRows(history,products) {
  const result=new Map()
  for(const order of history) for(const item of Array.isArray(order.items)?order.items:[]) {
    const product=matchProduct(item,products)
    if(!product || !order.farm_id) continue
    const key=order.farm_id+'|'+product.id
    const prev=result.get(key)||{farm_id:order.farm_id,product_id:product.id,product_name:product.name,qty:0,weighted:0,price:0}
    const quantity=Math.max(0,qty(item))
    prev.qty+=quantity
    prev.weighted+=quantity*Math.max(0,price(item))
    if(price(item)>0)prev.price=price(item)
    result.set(key,prev)
  }
  return [...result.values()].map(r=>({...r,average:r.qty/3,unit_price:r.qty?r.weighted/r.qty:r.price}))
}
export default function Budget() {
  const {user}=useAuth()
  const navigate=useNavigate()
  const [cycles,setCycles]=useState([])
  const [assignments,setAssignments]=useState([])
  const [items,setItems]=useState([])
  const [reviews,setReviews]=useState([])
  const [farms,setFarms]=useState([])
  const [products,setProducts]=useState([])
  const [history,setHistory]=useState([])
  const [cycleId,setCycleId]=useState('')
  const [activeFarm,setActiveFarm]=useState('')
  const [term,setTerm]=useState('')
  const [newProduct,setNewProduct]=useState('')
  const [newFarm,setNewFarm]=useState('')
  const [newSource,setNewSource]=useState('opportunity')
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')
  const [expanded,setExpanded]=useState(false)
  const load=async()=>{
    if(!user?.id)return
    setBusy(true);setMessage('')
    const [a,c,f,p,h]=await Promise.all([
      supabase.from('budget_cycle_sellers').select('*').eq('seller_id',user.id),
      supabase.from('budget_cycles').select('*').order('created_at',{ascending:false}),
      supabase.from('farms').select('id,name,seller_id,ultra_partner_id').order('name'),
      supabase.from('products').select('id,name,ultra_codproduto,price_kg,active').eq('active',true).order('name'),
      supabase.rpc('budget_my_sales_history'),
    ])
    const failure=[a,c,f,p,h].find(x=>x.error)
    if(failure)setMessage(failure.error.message)
    setAssignments(a.data||[]);setCycles(c.data||[]);setFarms(f.data||[]);setProducts(p.data||[]);setHistory(h.data||[])
    setCycleId(prev=>prev || (c.data||[]).find(x=>(a.data||[]).some(y=>y.cycle_id===x.id))?.id || '')
    setBusy(false)
  }
  useEffect(()=>{load()},[user?.id])
  const cycle=cycles.find(c=>c.id===cycleId)
  const assignment=assignments.find(a=>a.cycle_id===cycleId)
  const editable=cycle?.status==='open'&&new Date()>=new Date(cycle.opens_at)&&new Date()<=new Date(cycle.closes_at)&&['pending','draft','revision_requested'].includes(assignment?.status)
  const suggested=useMemo(()=>historyRows(history,products),[history,products])
  const myFarms=useMemo(()=>farms.filter(f=>f.seller_id===user?.id || suggested.some(r=>r.farm_id===f.id)),[farms,suggested,user?.id])
  const visibleFarms=myFarms.filter(f=>norm(f.name).includes(norm(term)))
  const farm=farms.find(f=>f.id===activeFarm)
  const farmRows=items.filter(i=>i.farm_id===activeFarm)
  const farmNoSales=reviews.some(r=>r.farm_id===activeFarm)
  const farmSuggestions=farmNoSales?[]:suggested.filter(i=>i.farm_id===activeFarm && !farmRows.some(x=>x.product_id===i.product_id))
  const allPlanned=items.reduce((a,r)=>a+Number(r.quantity_kg)*Number(r.unit_price),0)
  const countFarms=new Set(items.filter(x=>Number(x.quantity_kg)>0).map(x=>x.farm_id)).size
  const reviewedCount=new Set([...items.filter(x=>Number(x.quantity_kg)>0).map(x=>x.farm_id),...reviews.map(x=>x.farm_id)]).size
  useEffect(()=>{
    if(!cycleId){setItems([]);setReviews([]);return}
    let live=true
    Promise.all([supabase.from('budget_items').select('*').eq('cycle_id',cycleId).eq('seller_id',user.id),supabase.from('budget_client_reviews').select('*').eq('cycle_id',cycleId).eq('seller_id',user.id)]).then(([a,b])=>{if(!live)return;setItems(a.data||[]);setReviews(b.data||[]);if(a.error||b.error)setMessage((a.error||b.error).message)})
    return()=>{live=false}
  },[cycleId,user?.id])
  const markStarted=async()=>{
    if(!['pending','revision_requested'].includes(assignment?.status))return
    const {error}=await supabase.from('budget_cycle_sellers').update({status:'draft'})
      .eq('cycle_id',cycleId).eq('seller_id',user.id)
    if(!error)setAssignments(prev=>prev.map(a=>a.cycle_id===cycleId?{...a,status:'draft'}:a))
  }
  const save=async (record,quantity)=>{
    if(!editable)return
    const next={cycle_id:cycleId,seller_id:user.id,farm_id:record.farm_id,product_id:record.product_id,
      month:record.month,quantity_kg:Math.max(0,Number(quantity)||0),unit_price:Math.max(0,Number(record.unit_price)||0),source:record.source||'recurring'}
    setBusy(true);setMessage('')
    const {data,error}=await supabase.from('budget_items').upsert(next,{onConflict:'cycle_id,seller_id,farm_id,product_id,month'}).select().single()
    if(error)setMessage(error.message)
    else {setItems(prev=>[...prev.filter(r=>!(r.farm_id===data.farm_id&&r.product_id===data.product_id&&r.month===data.month)),data]);await markStarted()}
    setBusy(false)
  }
  const applySuggestion=async s=>{
    if(!editable)return
    setBusy(true);setMessage('')
    const rows=cycle.months.map(month=>({cycle_id:cycleId,seller_id:user.id,farm_id:s.farm_id,
      product_id:s.product_id,month,quantity_kg:Math.round(s.average*1000)/1000,
      unit_price:Math.max(0,s.unit_price||Number(products.find(p=>p.id===s.product_id)?.price_kg)||0),source:'recurring'}))
    const {data,error}=await supabase.from('budget_items').upsert(rows,{onConflict:'cycle_id,seller_id,farm_id,product_id,month'}).select()
    if(error)setMessage(error.message)
    else {setItems(prev=>[...prev.filter(x=>!data.some(d=>d.farm_id===x.farm_id&&d.product_id===x.product_id&&d.month===x.month)),...data]);await markStarted()}
    setBusy(false)
  }
  const useAllSuggestions=async()=>{
    if(!editable||!suggested.length)return
    setBusy(true);setMessage('')
    const rows=suggested.filter(s=>!reviews.some(r=>r.farm_id===s.farm_id)).flatMap(s=>cycle.months.map(month=>({cycle_id:cycleId,seller_id:user.id,
      farm_id:s.farm_id,product_id:s.product_id,month,quantity_kg:Math.round(s.average*1000)/1000,
      unit_price:Math.max(0,s.unit_price||Number(products.find(p=>p.id===s.product_id)?.price_kg)||0),source:'recurring'})))
      .filter(r=>!items.some(x=>x.farm_id===r.farm_id&&x.product_id===r.product_id&&x.month===r.month))
    if(!rows.length){setBusy(false);setMessage('Todas as sugestões já foram adicionadas.');return}
    let saved=[]
    for(let n=0;n<rows.length;n+=200){
      const {data,error}=await supabase.from('budget_items').upsert(rows.slice(n,n+200),{onConflict:'cycle_id,seller_id,farm_id,product_id,month'}).select()
      if(error){setMessage(error.message);break}
      saved=[...saved,...(data||[])]
    }
    setItems(prev=>[...prev,...saved]);if(saved.length)await markStarted();setBusy(false)
  }
  const addProduct=async()=>{
    const product=products.find(p=>p.id===newProduct)
    if(!product||!newFarm)return
    if(reviews.some(r=>r.farm_id===newFarm)){setMessage('Desmarque sem vendas previstas antes de adicionar o produto.');return}
    const row={farm_id:newFarm,product_id:product.id,unit_price:Number(product.price_kg||0),source:newSource}
    setActiveFarm(newFarm);setExpanded(false)
    for(const month of cycle.months) await save({...row,month},0)
    setNewProduct('')
  }
  const toggleNoSales=async farmId=>{
    if(!editable)return
    const exists=reviews.some(r=>r.farm_id===farmId)
    if(!exists&&items.some(x=>x.farm_id===farmId&&Number(x.quantity_kg)>0)){setMessage('Cliente com vendas previstas: zere as quantidades antes de marcar sem vendas.');return}
    setBusy(true);setMessage('')
    if(exists){
      const {error}=await supabase.from('budget_client_reviews').delete().eq('cycle_id',cycleId).eq('seller_id',user.id).eq('farm_id',farmId)
      if(error)setMessage(error.message);else setReviews(prev=>prev.filter(x=>x.farm_id!==farmId))
    } else {
      const {data,error}=await supabase.from('budget_client_reviews').upsert({cycle_id:cycleId,seller_id:user.id,farm_id:farmId,status:'no_sales'},{onConflict:'cycle_id,seller_id,farm_id'}).select().single()
      if(error)setMessage(error.message);else setReviews(prev=>[...prev.filter(x=>x.farm_id!==farmId),data])
    }
    await markStarted()
    setBusy(false)
  }
  const submit=async()=>{
    if(!editable)return
    const missing=Math.max(0,myFarms.length-reviewedCount)
    const confirmation=missing?'Ainda existem '+missing+' clientes sem avaliação. Deseja enviar mesmo assim? O preenchimento ficará bloqueado.':'Enviar budget para aprovação? Após o envio ele fica bloqueado para edição.'
    if(!window.confirm(confirmation))return
    setBusy(true)
    const {error}=await supabase.from('budget_cycle_sellers').update({status:'submitted'}).eq('cycle_id',cycleId).eq('seller_id',user.id)
    if(error)setMessage(error.message)
    else {setAssignments(prev=>prev.map(a=>a.cycle_id===cycleId?{...a,status:'submitted'}:a));setMessage('Budget enviado para aprovação.')}
    setBusy(false)
  }
  return <main className="budget-field">
    <button className="budget-back" onClick={()=>navigate('/')}><IconArrowLeft size={17}/> Voltar ao início</button>
    <div className="budget-heading"><span>PLANEJAMENTO COMERCIAL</span><h1>Meu Budget</h1><p>Previsão por cliente e produto, com base no histórico dos três últimos meses completos.</p></div>
    {!!message&&<div className="budget-notice" role="status">{message}</div>}
    {!cycles.filter(c=>assignments.some(a=>a.cycle_id===c.id)).length ? <div className="budget-empty">Nenhum ciclo disponível. O gestor liberará os meses de preenchimento.</div> : <>
      <label className="budget-label">Ciclo de planejamento
        <select value={cycleId} onChange={e=>{setCycleId(e.target.value);setActiveFarm('')}}>{cycles.filter(c=>assignments.some(a=>a.cycle_id===c.id)).map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select>
      </label>
      <div className="budget-stat"><div><small>Previsão total</small><strong>{brl(allPlanned)}</strong></div><div><small>Clientes avaliados</small><strong>{reviewedCount}/{myFarms.length}</strong><small>{countFarms} com vendas</small></div></div>
      <div className="budget-status"><strong>{editable?'Preenchimento liberado':assignment?.status==='submitted'?'Enviado para aprovação':assignment?.status==='approved'?'Budget aprovado':assignment?.status==='revision_requested'?'Revisão solicitada':'Somente leitura'}</strong><span>{(cycle?.months||[]).map(monthLabel).join(' · ')}</span></div>
      {assignment?.feedback&&<div className="budget-notice">Retorno do gestor: {assignment.feedback}</div>}
      {editable&&<div className="budget-action-row"><button disabled={busy} onClick={useAllSuggestions}><IconRefresh size={16}/> Pré-preencher histórico</button><button disabled={busy} onClick={()=>setExpanded(v=>!v)}><IconPlus size={16}/> Novo produto</button></div>}
      {expanded&&editable&&<div className="budget-panel"><label>Cliente<select value={newFarm} onChange={e=>setNewFarm(e.target.value)}><option value="">Selecione</option>{myFarms.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></label><label>Produto<select value={newProduct} onChange={e=>setNewProduct(e.target.value)}><option value="">Selecione</option>{products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>Origem<select value={newSource} onChange={e=>setNewSource(e.target.value)}><option value="opportunity">Nova oportunidade</option><option value="recurring">Carteira recorrente</option></select></label><button disabled={busy||!newFarm||!newProduct} onClick={addProduct}>Adicionar aos meses</button></div>}
      <label className="budget-search"><IconSearch size={17}/><input placeholder="Buscar cliente..." value={term} onChange={e=>setTerm(e.target.value)}/></label>
      {visibleFarms.map(f=>{const count=items.filter(x=>x.farm_id===f.id&&Number(x.quantity_kg)>0).length;return <div key={f.id} className="budget-client">
        <button className="budget-client-top" onClick={()=>setActiveFarm(activeFarm===f.id?'':f.id)}><span><strong>{f.name}</strong><small>{reviews.some(r=>r.farm_id===f.id)?"Sem vendas previstas":count+" previsões preenchidas · "+suggested.filter(x=>x.farm_id===f.id).length+" produtos no histórico"}</small></span>{activeFarm===f.id?<IconChevronUp size={18}/>:<IconChevronDown size={18}/>}</button>
        {activeFarm===f.id&&<div className="budget-client-body">
          <div className="budget-client-review"><span>{farmNoSales?"Cliente avaliado: sem vendas previstas":"Não espera compras deste cliente nos meses liberados?"}</span>{editable&&<button disabled={busy} onClick={()=>toggleNoSales(f.id)}>{farmNoSales?"Desfazer":"Marcar sem vendas"}</button>}</div>
          {farmSuggestions.length>0&&editable&&<div className="budget-suggestions"><strong>Sugestões do histórico</strong>{farmSuggestions.map(s=><div key={s.product_id}><span>{s.product_name}<small>Média mensal: {integer(s.average)} kg</small></span><button disabled={busy} onClick={()=>applySuggestion(s)}>Adicionar</button></div>)}</div>}
          {[...new Set(farmRows.map(x=>x.product_id))].map(productId=>{
            const product=products.find(p=>p.id===productId);const rows=farmRows.filter(r=>r.product_id===productId)
            const historical=suggested.find(s=>s.farm_id===f.id&&s.product_id===productId)
            return <div key={productId} className="budget-product"><strong>{product?.name||'Produto'}</strong><small>Média últimos 3 meses: {integer(historical?.average||0)} kg/mês</small>
              {(cycle?.months||[]).map(month=>{const r=rows.find(x=>x.month===month);if(!r)return null;return <label key={month} className="budget-month"><span>{monthLabel(month)}</span><input type="number" inputMode="decimal" min="0" step="any" disabled={!editable||busy} defaultValue={r.quantity_kg} key={r.id+'-'+r.quantity_kg} onBlur={e=>{if(Number(e.target.value)!==Number(r.quantity_kg))save(r,e.target.value)}}/><small>kg</small></label>})}
              <small className="budget-product-value">Valor previsto: {brl(rows.reduce((sum,r)=>sum+Number(r.quantity_kg)*Number(r.unit_price),0))}</small>
            </div>
          })}
          {!farmRows.length&&!farmSuggestions.length&&<p>Sem produtos previstos. Use “Novo produto” para incluir uma oportunidade.</p>}
        </div>}
      </div>})}
      {!visibleFarms.length&&<div className="budget-empty">Nenhum cliente encontrado na sua carteira.</div>}
      {editable&&<button className="budget-submit" disabled={busy} onClick={submit}><IconSend size={17}/> Enviar para aprovação</button>}
      <p className="budget-footnote">A média considera os itens de pedidos dos três meses fechados. É uma sugestão comercial; não equivale ao faturamento. As quantidades são salvas ao sair de cada campo, com conexão à internet.</p>
    </>}
  </main>
}