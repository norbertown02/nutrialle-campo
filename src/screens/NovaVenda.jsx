import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  IconArrowLeft, IconCheck, IconPlus, IconTrash,
  IconAlertTriangle, IconReceipt
} from '@tabler/icons-react'
import { useFarms } from '../lib/useFarms'
import { useSales } from '../lib/useSales'
import { useProducts } from '../lib/useProducts'

function todayISO() {
  const d = new Date()
  return d.toISOString().split('T')[0]
}

function fmtBRL(n) {
  const value = Number(n || 0)

  return 'R$ ' + value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

function parsePercent(value) {
  if (value === null || value === undefined || value === '') return 0

  const clean = String(value)
    .replace(',', '.')
    .replace(/[^\d.]/g, '')

  const number = Number(clean)

  return Number.isFinite(number) ? number : 0
}

const FRETES = [
  { value: 'CIF', label: 'CIF', desc: 'Frete por conta do vendedor' },
  { value: 'FOB', label: 'FOB', desc: 'Frete por conta do comprador' },
  { value: 'EXW', label: 'EXW', desc: 'Ex Works - retirada na fábrica pelo comprador' },
]

// Mesma regra da cotação: a venda é sempre precificada em R$/kg, e o
// preço do saco (unitPrice) é sempre derivado de price_kg * bag_kg —
// nunca editado diretamente. Isso garante que uma venda direta e uma
// venda que veio de cotação convertida sigam exatamente a mesma lógica.
function calcItem(it) {
  const bagKg = Number(it.bagKg || 0)
  const priceKg = Number(it.priceKg || 0)
  const qty = Number(it.quantity || 0)
  const disc = Number(it.discount || 0)
  const unitPrice = priceKg * bagKg
  const subtotal = unitPrice * qty * (1 - disc / 100)
  return { ...it, unitPrice, subtotal }
}

const backBtnStyle = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--text-dim)',
  fontSize: 13,
  fontWeight: 500,
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: 0,
  marginBottom: 14,
  fontFamily: 'inherit'
}

export default function NovaVenda() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const farmsHook = useFarms()
  const farms = farmsHook.farms
  const getFarm = farmsHook.getFarm
  const salesHook = useSales()
  const addSale = salesHook.addSale
  const { products, paymentTerms } = useProducts()

  const preselectedFarmId = searchParams.get('farm')
  const preselectedFarm = preselectedFarmId ? getFarm(preselectedFarmId) : null

  const [farmId, setFarmId] = useState(preselectedFarmId || '')
  const [saleDate, setSaleDate] = useState(todayISO())
  const [items, setItems] = useState([])
  const [paymentTermId, setPaymentTermId] = useState('')
  const [frete, setFrete] = useState('CIF')
  const [notes, setNotes] = useState('')
  const [comissao, setComissao] = useState('')

  useEffect(() => {
    if (!paymentTerms.length) return
    const aindaValido = paymentTerms.some(t => t.id === paymentTermId)
    if (!aindaValido) setPaymentTermId(paymentTerms[0].id)
  }, [paymentTerms])

  const selectedFarm = farmId ? getFarm(farmId) : preselectedFarm

  const availableProducts = products

  const addItem = () => {
    if (availableProducts.length === 0) return
    const firstProduct = availableProducts[0]
    setItems(prev => [...prev, calcItem({
      key: 'i' + Date.now(),
      productId: firstProduct.id,
      productName: firstProduct.name,
      unit: firstProduct.unit || 'saco',
      bagKg: firstProduct.bag_kg || 25,
      priceKg: firstProduct.price_kg || 0,
      tablePriceKg: firstProduct.price_kg || 0,
      maxDiscount: firstProduct.max_discount || 10,
      quantity: 1,
      discount: 0,
    })])
  }

  const updateItem = (key, changes) => {
    setItems(prev => prev.map(it => {
      if (it.key !== key) return it
      let updated = { ...it, ...changes }
      if (changes.productId) {
        const p = products.find(p => p.id === changes.productId)
        if (p) {
          updated = {
            ...updated,
            productName: p.name,
            unit: p.unit || 'saco',
            bagKg: p.bag_kg || 25,
            priceKg: p.price_kg || 0,
            tablePriceKg: p.price_kg || 0,
            maxDiscount: p.max_discount || 10,
          }
        }
      }
      return calcItem(updated)
    }))
  }

  const removeItem = (key) => {
    setItems(prev => prev.filter(it => it.key !== key))
  }

  const subtotal = items.reduce((sum, it) => sum + (Number(it.subtotal) || 0), 0)

  const comissaoPct = parsePercent(comissao)
  const valorComissao = subtotal * (comissaoPct / 100)

  const hasOverDiscount = items.some(it => Number(it.discount) > Number(it.maxDiscount || 10))

  const isValid = farmId && items.length > 0 && !!paymentTermId && items.every(it =>
    it.quantity > 0 && it.priceKg >= 0
  )

  const handleSave = () => {
    if (!isValid) return

    const freteInfo = FRETES.find(f => f.value === frete)

    addSale({
      farmId,
      saleDate,
      items: items.map(it => ({
        productId: it.productId,
        productName: it.productName,
        unit: it.unit,
        bagKg: Number(it.bagKg) || 0,
        priceKg: Number(it.priceKg) || 0,
        unitPrice: Number(it.unitPrice),
        quantity: Number(it.quantity),
        discount: Number(it.discount) || 0,
        subtotal: Number(it.subtotal),
      })),
      total: subtotal,
      paymentTermId,
      paymentTermLabel: paymentTerms.find(p => p.id === paymentTermId)?.label || "",
      frete,
      frete_label: freteInfo ? `${freteInfo.label} - ${freteInfo.desc}` : frete,
      comissaoPct: comissaoPct,
      notes: notes.trim(),
      needsApproval: hasOverDiscount,
    })

    navigate('/vendas')
  }

  return (
    <div className="content">
      <button onClick={() => navigate(-1)} style={backBtnStyle}>
        <IconArrowLeft size={16} /> Voltar
      </button>

      <div className="page-head">
        <div className="eyebrow">Nova venda</div>
        <h2>Registrar pedido</h2>
        <p>
          {selectedFarm
            ? selectedFarm.name
            : 'Escolha a fazenda e adicione os produtos'}
        </p>
      </div>

      {!preselectedFarm ? (
        <>
          <div className="section-label">Fazenda</div>
          {farms.length === 0 ? (
            <div className="hint" style={{ marginBottom: 18 }}>
              Voce ainda nao tem fazendas cadastradas. Volte para Clientes e
              cadastre primeiro a fazenda.
            </div>
          ) : (
            <div style={{ marginBottom: 14 }}>
              <label style={{
                display: 'block', fontSize: 12, fontWeight: 600,
                color: 'var(--text-dim)', marginBottom: 6, letterSpacing: 0.3
              }}>
                Selecione a fazenda *
              </label>
              <select value={farmId} onChange={e => setFarmId(e.target.value)}>
                <option value="">Escolher...</option>
                {farms.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.name} - {f.city}
                  </option>
                ))}
              </select>
            </div>
          )}
        </>
      ) : null}

      <div className="section-label">Data</div>
      <div style={{ marginBottom: 14 }}>
        <input type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)} />
      </div>

      <div className="section-label">
        Produtos
        <span style={{
          fontSize: 11, color: 'var(--text-faint)', marginLeft: 'auto',
          fontWeight: 500, letterSpacing: 0, textTransform: 'none'
        }}>
          {items.length} {items.length === 1 ? 'item' : 'itens'}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="empty" style={{ padding: 24, marginBottom: 12 }}>
          <IconReceipt />
          <p>Nenhum produto adicionado</p>
        </div>
      ) : (
        items.map((it, idx) => {
          const discount = Number(it.discount) || 0
          const maxDiscount = Number(it.maxDiscount || 10)
          const overLimit = discount > maxDiscount

          return (
            <div key={it.key} className="card" style={{ marginBottom: 10 }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', marginBottom: 8
              }}>
                <span style={{
                  fontSize: 11, fontWeight: 600, color: 'var(--text-dim)',
                  letterSpacing: 0.3
                }}>
                  Item {idx + 1}
                </span>
                <button
                  onClick={() => removeItem(it.key)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--red)', fontSize: 11, fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', gap: 3
                  }}
                >
                  <IconTrash size={13} /> remover
                </button>
              </div>

              <label style={{
                display: 'block', fontSize: 11, color: 'var(--text-dim)',
                marginBottom: 4
              }}>Produto</label>
              <select
                value={it.productId}
                onChange={e => updateItem(it.key, { productId: e.target.value })}
                style={{ marginBottom: 8 }}
              >
                {availableProducts.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.unit})
                  </option>
                ))}
              </select>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{
                    display: 'block', fontSize: 11, color: 'var(--text-dim)',
                    marginBottom: 4
                  }}>Qtd ({it.unit})</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={it.quantity}
                    onChange={e => updateItem(it.key, { quantity: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{
                    display: 'block', fontSize: 11, color: 'var(--text-dim)',
                    marginBottom: 4
                  }}>R$/kg</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={it.priceKg}
                    onChange={e => updateItem(it.key, { priceKg: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{
                    display: 'block', fontSize: 11,
                    color: overLimit ? 'var(--red)' : 'var(--text-dim)',
                    marginBottom: 4
                  }}>Desc. % {overLimit ? '⚠️' : ''}</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={it.discount}
                    onChange={e => updateItem(it.key, { discount: e.target.value })}
                    style={{ borderColor: overLimit ? 'var(--red)' : undefined }}
                  />
                </div>
              </div>

              {discount > 0 ? (
                <div style={{
                  fontSize: 11, marginTop: 6,
                  color: overLimit ? 'var(--red)' : 'var(--amber)',
                  display: 'flex', alignItems: 'center', gap: 4
                }}>
                  {overLimit ? <IconAlertTriangle size={12} /> : null}
                  Desconto de {discount.toFixed(1)}% (máximo do produto: {maxDiscount}%)
                </div>
              ) : null}

              <div style={{
                fontSize: 11, color: 'var(--text-faint)', marginTop: 8
              }}>
                {(Number(it.quantity || 0) * Number(it.bagKg || 0)).toLocaleString('pt-BR')} kg total · {fmtBRL(it.unitPrice)}/{it.unit} ({it.bagKg}kg)
              </div>

              <div style={{
                marginTop: 10, paddingTop: 8,
                borderTop: '1px solid var(--line-soft)',
                display: 'flex', justifyContent: 'space-between',
                fontSize: 13, fontWeight: 600
              }}>
                <span style={{ color: 'var(--text-dim)' }}>Subtotal</span>
                <span style={{ color: 'var(--orange)' }}>{fmtBRL(it.subtotal)}</span>
              </div>
            </div>
          )
        })
      )}

      <button
        onClick={addItem}
        disabled={!selectedFarm}
        style={{
          width: '100%',
          padding: '12px',
          borderRadius: 10,
          border: '1px dashed var(--orange)',
          background: 'rgba(240,125,26,0.06)',
          color: 'var(--orange)',
          fontFamily: 'inherit',
          fontSize: 13,
          fontWeight: 600,
          cursor: selectedFarm ? 'pointer' : 'not-allowed',
          opacity: selectedFarm ? 1 : 0.4,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          marginBottom: 18
        }}
      >
        <IconPlus size={16} /> Adicionar produto
      </button>

      <div className="section-label">Condicao de pagamento</div>
      <div style={{ marginBottom: 14 }}>
        <select value={paymentTermId} onChange={e => setPaymentTermId(e.target.value)}>
          {paymentTerms.map(t => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
      </div>

      <div className="section-label">Modalidade de frete</div>
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

      <div className="section-label">Comissão do representante</div>
      <div style={{display:'flex',alignItems:'center',gap:10,background:'var(--surface)',border:'1px solid var(--line)',borderRadius:10,padding:'12px 14px',marginBottom:8}}>
        <input
          type="number"
          value={comissao}
          onChange={e => setComissao(e.target.value)}
          placeholder="0"
          min="0" max="100" step="0.5"
          style={{flex:1,background:'none',border:'none',outline:'none',fontSize:16,fontWeight:600,color:'var(--text)',fontFamily:'inherit'}}
        />
        <span style={{fontSize:14,color:'var(--text-dim)',fontWeight:600}}>%</span>
        {comissaoPct > 0 && subtotal > 0 && (
          <span style={{fontSize:13,color:'var(--orange)',fontWeight:600}}>
            {'= ' + fmtBRL(valorComissao)}
          </span>
        )}
      </div>

      <div className="section-label">Observacoes</div>
      <div style={{ marginBottom: 18 }}>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Detalhes do pedido, prazo de entrega, observacoes do produtor..."
          style={{ minHeight: 70 }}
        />
      </div>

      <div className="card" style={{
        background: 'linear-gradient(135deg, rgba(240,125,26,0.13), rgba(240,125,26,0.05))',
        borderColor: 'rgba(240,125,26,0.3)',
        marginBottom: 14
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div>
            <div style={{
              fontSize: 11, color: 'var(--text-dim)', fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: 0.3
            }}>
              Total do pedido
            </div>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700, fontSize: 28, color: 'var(--orange)', lineHeight: 1
            }}>
              {fmtBRL(subtotal)}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
              {items.length} {items.length === 1 ? 'item' : 'itens'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 2 }}>
              {paymentTerms.find(p => p.id === paymentTermId)?.label || ""}
            </div>
          </div>
        </div>
      </div>

      {hasOverDiscount ? (
        <div className="hint" style={{
          background: 'var(--red-bg)',
          borderColor: 'rgba(217,83,79,0.3)',
          color: 'var(--red)',
          marginBottom: 14
        }}>
          <IconAlertTriangle size={16} />
          <div>
            <strong>Desconto acima do limite de algum produto</strong>
            <div style={{ marginTop: 3, fontSize: 11 }}>
              Pedido será salvo mas marcado para aprovação do gerente.
            </div>
          </div>
        </div>
      ) : null}

      <div className="hint" style={{ marginBottom: 14 }}>
        Ao salvar, o pedido é registrado e um e-mail com os dados é
        enviado automaticamente para o time administrativo.
      </div>

      <button
        className="btn btn-primary"
        onClick={handleSave}
        disabled={!isValid}
        style={{
          opacity: isValid ? 1 : 0.45,
          cursor: isValid ? 'pointer' : 'not-allowed'
        }}
      >
        <IconCheck size={18} />
        Salvar pedido
      </button>
    </div>
  )
}