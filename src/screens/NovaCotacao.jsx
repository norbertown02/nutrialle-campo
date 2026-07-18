import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/useAuth.jsx'
import { useFarms } from '../lib/useFarms'
import { useProducts } from '../lib/useProducts'
import { useOnlineStatus } from '../lib/useOnlineStatus'
import { db } from '../lib/db'
import { enqueue } from '../lib/syncEngine'
import { IconPlus, IconTrash, IconChevronDown, IconSearch, IconCloudOff } from '@tabler/icons-react'

const PAGAMENTOS = [
  {value:'a_vista',    label:'À vista'},
  {value:'30',         label:'30 dias'},
  {value:'30_60',      label:'30/60 dias'},
  {value:'30_60_90',   label:'30/60/90 dias'},
]

const FRETES = [
  {value:'CIF', label:'CIF', desc:'Frete por conta do vendedor'},
  {value:'FOB', label:'FOB', desc:'Frete por conta do comprador'},
  {value:'EXW', label:'EXW', desc:'Ex Works - retirada na fábrica pelo comprador'},
]

function fmt(n) { return Number(n||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}) }

export default function NovaCotacao() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { user } = useAuth()
  const online = useOnlineStatus()

  const { farms } = useFarms()
  const { products, offline: produtosOffline } = useProducts()
  const [farmSel, setFarmSel] = useState(params.get('farm') || '')
  const [buscaFarm, setBuscaFarm] = useState('')
  const [buscaProd, setBuscaProd] = useState('')
  const [items, setItems] = useState([])
  const [pagamento, setPagamento] = useState('a_vista')
  const [frete, setFrete] = useState('CIF')
  const [notes, setNotes] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [stepFarm, setStepFarm] = useState(!params.get('farm'))

  useEffect(() => {
    if (params.get('farm')) {
      const f = farms.find(f => f.id === params.get('farm'))
      if (f) setBuscaFarm(f.name)
    }
  }, [farms])

  const farmsFiltradas = farms.filter(f =>
    f.name?.toLowerCase().includes(buscaFarm.toLowerCase()) ||
    f.city?.toLowerCase().includes(buscaFarm.toLowerCase())
  ).slice(0, 8)

  const prodsFiltrados = products.filter(p =>
    p.name?.toLowerCase().includes(buscaProd.toLowerCase())
  ).slice(0, 10)

  // A precificação é sempre feita em R$/kg. O preço do saco é sempre
  // derivado da fórmula: R$/kg * kg do saco. Nunca editamos unit_price
  // diretamente — ele é sempre recalculado a partir de price_kg e bag_kg.
  function calcItem(it) {
    const bagKg = Number(it.bag_kg || 0)
    const priceKg = Number(it.price_kg || 0)
    const qty = Number(it.quantity || 0)
    const disc = Number(it.discount || 0)
    const unitPrice = priceKg * bagKg
    const subtotal = unitPrice * qty * (1 - disc / 100)
    return { ...it, unit_price: unitPrice, subtotal }
  }

  function addItem(prod) {
    if (items.find(i => i.product_id === prod.id)) return
    const bagKg = prod.bag_kg || 25
    const priceKg = prod.price_kg || (prod.price && bagKg ? prod.price / bagKg : 0)
    setItems(prev => [...prev, calcItem({
      product_id: prod.id,
      product_name: prod.name,
      unit: prod.unit || 'saco',
      bag_kg: bagKg,
      price_kg: priceKg,
      max_discount: prod.max_discount || 10,
      quantity: 1,
      discount: 0,
    })])
    setBuscaProd('')
  }

  function updateItem(idx, field, value) {
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it
      return calcItem({ ...it, [field]: value })
    }))
  }

  function removeItem(idx) { setItems(prev => prev.filter((_, i) => i !== idx)) }

  const total = items.reduce((a, it) => a + (it.subtotal || 0), 0)
  const temDesconto = items.some(it => Number(it.discount) > Number(it.max_discount || 10))

  const farm = farms.find(f => f.id === farmSel)
  const validUntil = new Date(Date.now() + 10*86400000).toISOString().split('T')[0]

  async function salvar(status = 'rascunho') {
    if (!farmSel || items.length === 0 || salvando) return
    setSalvando(true)

    const id = crypto.randomUUID()
    const payload = {
      id,
      farm_id: farmSel,
      seller_id: user?.id,
      items: items.map(it => ({
        product_id: it.product_id,
        product_name: it.product_name,
        unit: it.unit,
        unit_price: Number(it.unit_price),
        bag_kg: it.bag_kg || 25,
        price_kg: it.price_kg || 0,
        quantity: Number(it.quantity),
        discount: Number(it.discount),
        subtotal: it.subtotal,
      })),
      payment_term: pagamento,
      frete,
      frete_label: (() => { const f = FRETES.find(f => f.value === frete); return f ? `${f.label} - ${f.desc}` : frete })(),
      payment_term_label: PAGAMENTOS.find(p => p.value === pagamento)?.label,
      total,
      status,
      needs_approval: temDesconto,
      valid_until: validUntil,
      notes,
      created_at: new Date().toISOString(),
    }

    // Grava local primeiro (não depende de rede) para nunca perder a
    // cotação, e só então tenta enviar ao Supabase — online, sincroniza
    // em segundos; offline, fica na fila e envia sozinha depois.
    await db.quotes_cache.put({ ...payload, _pending: true })
    await enqueue({ entity: 'quote', entityId: id, op: 'upsert', payload })

    navigate(`/prospeccao/${id}`)
    setSalvando(false)
  }

  // STEP 1 — selecionar fazenda
  if (stepFarm) return (
    <div className="screen-content">
      <div style={{padding:16}}>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
          <button onClick={() => navigate(-1)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-faint)',padding:0}}>← Voltar</button>
          <div style={{fontWeight:700,fontSize:16}}>Nova Cotação</div>
        </div>
        <div style={{fontWeight:600,marginBottom:12}}>Para qual cliente?</div>
        <div style={{position:'relative',marginBottom:12}}>
          <IconSearch size={14} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--text-faint)'}}/>
          <input value={buscaFarm} onChange={e=>setBuscaFarm(e.target.value)} placeholder="Buscar fazenda ou lead..." style={{width:'100%',paddingLeft:32}}/>
        </div>
        <div style={{marginBottom:16}}>
          {farmsFiltradas.map(f => (
            <div key={f.id} onClick={() => { setFarmSel(f.id); setStepFarm(false) }}
              style={{padding:'12px 14px',borderRadius:10,border:'1px solid var(--line)',marginBottom:8,cursor:'pointer',background:'var(--surface-1)'}}>
              <div style={{fontWeight:600,fontSize:14}}>{f.name}</div>
              <div style={{fontSize:11,color:'var(--text-faint)',marginTop:2,display:'flex',gap:8}}>
                <span style={{textTransform:'capitalize'}}>{f.segment}</span>
                {f.city && <span>· {f.city}{f.state ? `/${f.state}` : ''}</span>}
                {f.prospect && <span style={{color:'var(--amber)'}}>· Prospecto</span>}
              </div>
            </div>
          ))}
        </div>
        <button className="btn btn-ghost btn-sm" style={{width:'100%'}} onClick={() => navigate('/clientes/novo?prospect=true')}>
          <IconPlus size={14}/> Cadastrar novo lead
        </button>
      </div>
    </div>
  )

  // STEP 2 — montar cotação
  return (
    <div className="screen-content">
      <div style={{padding:16}}>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
          <button onClick={() => setStepFarm(true)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-faint)',padding:0}}>← Voltar</button>
          <div style={{fontWeight:700,fontSize:16}}>Nova Cotação</div>
        </div>

        {/* Cliente selecionado */}
        <div style={{background:'var(--surface-2)',borderRadius:10,padding:'10px 14px',marginBottom:20,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <div style={{fontWeight:600,fontSize:13}}>{farm?.name}</div>
            <div style={{fontSize:11,color:'var(--text-faint)',textTransform:'capitalize'}}>{farm?.segment} {farm?.prospect ? '· Prospecto' : '· Cliente ativo'}</div>
          </div>
          <button onClick={() => setStepFarm(true)} style={{background:'none',border:'none',color:'var(--orange)',fontSize:12,cursor:'pointer'}}>Trocar</button>
        </div>

        {/* Busca produtos */}
        <div style={{fontWeight:600,marginBottom:10}}>Produtos</div>
        <div style={{position:'relative',marginBottom:8}}>
          <IconSearch size={14} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--text-faint)'}}/>
          <input value={buscaProd} onChange={e=>setBuscaProd(e.target.value)} placeholder="Buscar produto..." style={{width:'100%',paddingLeft:32}}/>
        </div>

        {buscaProd && (
          <div style={{background:'var(--surface-1)',border:'1px solid var(--line)',borderRadius:10,marginBottom:12,overflow:'hidden'}}>
            {prodsFiltrados.length === 0
              ? <div style={{padding:'12px 14px',color:'var(--text-faint)',fontSize:13}}>Nenhum produto encontrado</div>
              : prodsFiltrados.map(p => (
                <div key={p.id} onClick={() => addItem(p)}
                  style={{padding:'10px 14px',borderBottom:'1px solid var(--line)',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:500}}>{p.name}</div>
                    <div style={{fontSize:11,color:'var(--text-faint)'}}>{p.unit || 'kg'}</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:13,fontWeight:600,color:'var(--orange)'}}>R$ {fmt(p.price_kg)}/kg</div>
                    <div style={{fontSize:10,color:'var(--text-faint)'}}>desc. máx {p.max_discount || 10}%</div>
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {/* Itens adicionados */}
        {items.length === 0 ? (
          <div style={{textAlign:'center',padding:'24px 0',color:'var(--text-faint)',fontSize:13}}>Busque e adicione produtos acima</div>
        ) : (
          <div style={{marginBottom:16}}>
            {items.map((it, idx) => (
              <div key={idx} style={{background:'var(--surface-1)',border:'1px solid var(--line)',borderRadius:10,padding:12,marginBottom:8}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                  <div style={{fontWeight:600,fontSize:13,flex:1}}>{it.product_name}</div>
                  <button onClick={() => removeItem(idx)} style={{background:'none',border:'none',color:'var(--red)',cursor:'pointer',padding:0}}>
                    <IconTrash size={14}/>
                  </button>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
                  <div>
                    <div style={{fontSize:10,color:'var(--text-faint)',marginBottom:4}}>Qtd ({it.unit})</div>
                    <input type="number" value={it.quantity} min="1"
                      onChange={e => updateItem(idx, 'quantity', e.target.value)}
                      style={{width:'100%',padding:'6px 8px',fontSize:13}}/>
                  </div>
                  <div>
                    <div style={{fontSize:10,color:'var(--text-faint)',marginBottom:4}}>R$/kg</div>
                    <input type="number" value={it.price_kg} min="0" step="0.01"
                      onChange={e => updateItem(idx, 'price_kg', e.target.value)}
                      style={{width:'100%',padding:'6px 8px',fontSize:13}}/>
                  </div>
                  <div>
                    <div style={{fontSize:10,color:`${Number(it.discount)>it.max_discount?'var(--amber)':'var(--text-faint)'}`,marginBottom:4}}>
                      Desc. % {Number(it.discount) > it.max_discount ? '⚠️' : ''}
                    </div>
                    <input type="number" value={it.discount} min="0" max="100" step="0.5"
                      onChange={e => updateItem(idx, 'discount', e.target.value)}
                      style={{width:'100%',padding:'6px 8px',fontSize:13,borderColor: Number(it.discount)>it.max_discount ? 'var(--amber)' : undefined}}/>
                  </div>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:8}}>
                  <div style={{fontSize:11,color:'var(--text-faint)'}}>
                    {(Number(it.quantity||0) * Number(it.bag_kg||0)).toLocaleString('pt-BR')} kg total · R$ {fmt(it.unit_price)}/saco ({it.bag_kg}kg)
                  </div>
                  <div style={{fontSize:13,fontWeight:600,color:'var(--orange)'}}>
                    R$ {fmt(it.subtotal)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagamento */}
        <div style={{fontWeight:600,marginBottom:8}}>Condição de pagamento</div>
        <select value={pagamento} onChange={e=>setPagamento(e.target.value)} style={{width:'100%',marginBottom:16}}>
          {PAGAMENTOS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>

        {/* Frete */}
        <div style={{fontWeight:600,marginBottom:8}}>Modalidade de frete</div>
        <div style={{display:'flex',gap:10,marginBottom:16}}>
          {FRETES.map(f=>(
            <button key={f.value} onClick={()=>setFrete(f.value)} type="button"
              style={{flex:1,padding:'10px 8px',borderRadius:10,cursor:'pointer',
                border:'2px solid '+(frete===f.value?'var(--orange)':'var(--line)'),
                background:frete===f.value?'var(--orange-bg)':'var(--surface-2)'}}>
              <div style={{fontWeight:700,fontSize:14,color:frete===f.value?'var(--orange)':'var(--text)'}}>{f.label}</div>
              <div style={{fontSize:10,color:'var(--text-faint)',marginTop:2}}>
                {f.desc}
              </div>
            </button>
          ))}
        </div>

        {/* Observações */}
        <div style={{fontWeight:600,marginBottom:8}}>Observações</div>
        <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3}
          placeholder="Ex: cliente pediu entrega até dia 15..." style={{width:'100%',marginBottom:20}}/>

        {/* Total */}
        {temDesconto && (
          <div style={{background:'var(--amber-bg)',border:'1px solid var(--amber)',borderRadius:8,padding:'8px 12px',marginBottom:12,fontSize:12,color:'var(--amber)'}}>
            ⚠️ Desconto acima do limite de algum produto — cotação será sinalizada para aprovação
          </div>
        )}
        {!online && (
          <div style={{display:'flex',alignItems:'center',gap:6,background:'var(--amber-bg)',border:'1px solid var(--amber)',borderRadius:8,padding:'8px 12px',marginBottom:12,fontSize:12,color:'var(--amber)'}}>
            <IconCloudOff size={14}/> Sem conexão · a cotação fica salva no aparelho e envia sozinha quando a internet voltar{produtosOffline ? ' · preços da última tabela salva' : ''}
          </div>
        )}
        <div style={{background:'var(--surface-2)',borderRadius:10,padding:'12px 14px',marginBottom:20,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{fontSize:13,color:'var(--text-faint)'}}>Total da cotação</div>
          <div style={{fontSize:20,fontWeight:700,color:'var(--orange)'}}>R$ {fmt(total)}</div>
        </div>

        <div style={{position:'fixed',bottom:65,left:0,right:0,padding:'10px 16px',background:'var(--surface-1)',borderTop:'1px solid var(--line)',zIndex:100,maxWidth:430,margin:'0 auto'}}>
          <button className="btn btn-primary" style={{width:'100%',fontSize:14,padding:'10px'}} disabled={!farmSel||items.length===0||salvando} onClick={() => salvar('rascunho')}>
            {salvando ? 'Salvando...' : 'Salvar Cotação'}
          </button>
        </div>
        <div style={{height:80}}/>
      </div>
    </div>
  )
}
