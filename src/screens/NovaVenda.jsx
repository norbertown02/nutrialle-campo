import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  IconArrowLeft, IconCheck, IconPlus, IconTrash,
  IconAlertTriangle, IconReceipt, IconSearch, IconChevronDown
} from '@tabler/icons-react'
import { useFarms } from '../lib/useFarms'
import { useSales } from '../lib/useSales'
import { useProducts } from '../lib/useProducts'
import { showToast } from '../lib/toast'

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
  const clean = String(value).replace(',', '.').replace(/[^\d.]/g, '')
  const number = Number(clean)
  return Number.isFinite(number) ? number : 0
}

const FRETES = [
  { value: 'CIF', label: 'CIF', desc: 'Frete por conta do vendedor' },
  { value: 'FOB', label: 'FOB', desc: 'Frete por conta do comprador' },
  { value: 'EXW', label: 'EXW', desc: 'Ex Works - retirada na fábrica pelo comprador' },
]

// A venda trabalha em KG de ponta a ponta.
// bagKg é apenas informação logística e nunca altera a quantidade digitada.
function calcItem(it) {
  const priceKg = Number(it.priceKg || 0)
  const qtyKg = Number(it.quantity || 0)
  const disc = Number(it.discount || 0)
  const unitPrice = priceKg
  const subtotal = priceKg * qtyKg * (1 - disc / 100)
  return { ...it, unit: 'kg', unitPrice, subtotal }
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


function normalizeSearch(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function FarmSearchSelect({ farms, value, onChange }) {
  const selected = farms.find(f => f.id === value) || null
  const [query, setQuery] = useState(selected?.name || '')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) setQuery(selected?.name || '')
  }, [value, selected?.name, open])

  const normalizedQuery = normalizeSearch(query)
  const filtered = normalizedQuery
    ? farms.filter(f => {
        const haystack = normalizeSearch(
          [
            f.name,
            f.owner_name,
            f.owner,
            f.city,
            f.state,
            f.client_code,
            f.cpf_cnpj,
            f.cpf,
            f.cnpj
          ].filter(Boolean).join(' ')
        )
        return haystack.includes(normalizedQuery)
      })
    : farms

  const visible = filtered.slice(0, 30)

  const choose = (farm) => {
    onChange(farm.id)
    setQuery(farm.name)
    setOpen(false)
  }

  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        border: open ? '1.5px solid var(--orange)' : '1px solid var(--line)',
        borderRadius: 11,
        background: 'var(--surface-2)',
        boxShadow: open ? '0 0 0 3px rgba(240,125,26,0.10)' : 'none',
        transition: 'border-color .15s ease, box-shadow .15s ease'
      }}>
        <IconSearch
          size={16}
          style={{ position: 'absolute', left: 12, color: open ? 'var(--orange)' : 'var(--text-faint)', pointerEvents: 'none' }}
        />
        <input
          value={query}
          onFocus={() => {
            setOpen(true)
            if (selected) setQuery('')
          }}
          onBlur={() => {
            window.setTimeout(() => {
              setOpen(false)
              setQuery(selected?.name || '')
            }, 140)
          }}
          onChange={e => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          placeholder="Digite o nome do cliente..."
          autoComplete="off"
          style={{
            width: '100%',
            padding: '11px 36px 11px 38px',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontFamily: 'inherit',
            fontSize: 13,
            fontWeight: selected && !open ? 600 : 500,
            color: 'var(--text)'
          }}
        />
        <IconChevronDown
          size={16}
          style={{
            position: 'absolute',
            right: 12,
            color: 'var(--text-faint)',
            pointerEvents: 'none',
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform .15s ease'
          }}
        />
      </div>

      {open ? (
        <div style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 'calc(100% + 6px)',
          zIndex: 60,
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 12,
          boxShadow: '0 14px 36px rgba(20,20,20,0.16)',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '8px 11px',
            fontSize: 10,
            fontWeight: 600,
            color: 'var(--text-faint)',
            borderBottom: '1px solid var(--line-soft)',
            background: 'var(--surface-2)'
          }}>
            {filtered.length === 0
              ? 'Nenhum cliente encontrado'
              : `${filtered.length} ${filtered.length === 1 ? 'cliente encontrado' : 'clientes encontrados'}`}
          </div>

          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {visible.map(farm => (
              <button
                key={farm.id}
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => choose(farm)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: 'none',
                  borderBottom: '1px solid var(--line-soft)',
                  background: farm.id === value ? 'var(--orange-bg)' : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontSize: 13,
                    fontWeight: farm.id === value ? 700 : 600,
                    color: farm.id === value ? 'var(--orange)' : 'var(--text)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {farm.name}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 2 }}>
                    {[farm.city, farm.state, farm.client_code ? `Cód. ${farm.client_code}` : null].filter(Boolean).join(' · ')}
                  </div>
                </div>
                {farm.id === value ? <IconCheck size={14} style={{ color: 'var(--orange)', flexShrink: 0 }} /> : null}
              </button>
            ))}

            {filtered.length > visible.length ? (
              <div style={{ padding: 9, textAlign: 'center', fontSize: 10, color: 'var(--text-faint)' }}>
                Continue digitando para refinar a busca.
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function ProductSearchSelect({ products, value, onChange }) {
  const selected = products.find(p => p.id === value) || null
  const [query, setQuery] = useState(selected?.name || '')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) setQuery(selected?.name || '')
  }, [value, selected?.name, open])

  const normalizedQuery = normalizeSearch(query)
  const filtered = normalizedQuery
    ? products.filter(p => {
        const haystack = normalizeSearch(
          [p.name, p.segment, p.code, p.ultra_ref_fabrica].filter(Boolean).join(' ')
        )
        return haystack.includes(normalizedQuery)
      })
    : products

  const visible = filtered.slice(0, 30)

  const choose = (product) => {
    onChange(product.id)
    setQuery(product.name)
    setOpen(false)
  }

  return (
    <div style={{ position: 'relative', marginBottom: 8 }}>
      <div style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        border: open ? '1.5px solid var(--orange)' : '1px solid var(--line)',
        borderRadius: 11,
        background: 'var(--surface-2)',
        boxShadow: open ? '0 0 0 3px rgba(240,125,26,0.10)' : 'none',
        transition: 'border-color .15s ease, box-shadow .15s ease'
      }}>
        <IconSearch
          size={16}
          style={{ position: 'absolute', left: 12, color: open ? 'var(--orange)' : 'var(--text-faint)', pointerEvents: 'none' }}
        />
        <input
          value={query}
          onFocus={() => {
            setOpen(true)
            if (selected) setQuery('')
          }}
          onBlur={() => {
            window.setTimeout(() => {
              setOpen(false)
              setQuery(selected?.name || '')
            }, 140)
          }}
          onChange={e => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          placeholder="Digite para buscar um produto..."
          autoComplete="off"
          style={{
            width: '100%',
            padding: '11px 36px 11px 38px',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontFamily: 'inherit',
            fontSize: 13,
            fontWeight: selected && !open ? 600 : 500,
            color: 'var(--text)'
          }}
        />
        <IconChevronDown
          size={16}
          style={{
            position: 'absolute',
            right: 12,
            color: 'var(--text-faint)',
            pointerEvents: 'none',
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform .15s ease'
          }}
        />
      </div>

      {open ? (
        <div style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 'calc(100% + 6px)',
          zIndex: 50,
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 12,
          boxShadow: '0 14px 36px rgba(20,20,20,0.16)',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '8px 11px',
            fontSize: 10,
            fontWeight: 600,
            color: 'var(--text-faint)',
            borderBottom: '1px solid var(--line-soft)',
            background: 'var(--surface-2)'
          }}>
            {filtered.length === 0
              ? 'Nenhum produto encontrado'
              : `${filtered.length} ${filtered.length === 1 ? 'produto encontrado' : 'produtos encontrados'}`}
          </div>

          <div style={{ maxHeight: 260, overflowY: 'auto' }}>
            {visible.map(product => (
              <button
                key={product.id}
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => choose(product)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: 'none',
                  borderBottom: '1px solid var(--line-soft)',
                  background: product.id === value ? 'var(--orange-bg)' : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontSize: 13,
                    fontWeight: product.id === value ? 700 : 600,
                    color: product.id === value ? 'var(--orange)' : 'var(--text)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {product.name}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 2 }}>
                    {[product.segment, product.code].filter(Boolean).join(' · ')}
                  </div>
                </div>

                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                  {Number(product.price_kg || 0) > 0 ? (
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)' }}>
                      {fmtBRL(product.price_kg)}/kg
                    </div>
                  ) : (
                    <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>sem preço</div>
                  )}
                  {product.id === value ? (
                    <IconCheck size={14} style={{ color: 'var(--orange)', marginTop: 2 }} />
                  ) : null}
                </div>
              </button>
            ))}

            {filtered.length > visible.length ? (
              <div style={{ padding: 9, textAlign: 'center', fontSize: 10, color: 'var(--text-faint)' }}>
                Continue digitando para refinar a busca.
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default function NovaVenda() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const farmsHook = useFarms()
  const farms = farmsHook.farms
  const getFarm = farmsHook.getFarm
  const salesHook = useSales()
  const addSale = salesHook.addSale
  const { products, paymentTerms, paymentMethods, priceTables } = useProducts()

  const preselectedFarmId = searchParams.get('farm')
  const preselectedFarm = preselectedFarmId ? getFarm(preselectedFarmId) : null

  const [farmId, setFarmId] = useState(preselectedFarmId || '')
  const [saleDate, setSaleDate] = useState(todayISO())
  const [deliveryDate, setDeliveryDate] = useState('')
  const [items, setItems] = useState([])
  const [paymentTermId, setPaymentTermId] = useState('')
  const [paymentMethodId, setPaymentMethodId] = useState('')
  const [frete, setFrete] = useState('CIF')
  const [notes, setNotes] = useState('')
  const [comissao, setComissao] = useState('')
  const [saving, setSaving] = useState(false)

  const selectedFarm = farmId ? getFarm(farmId) : preselectedFarm
  const availableProducts = products

  const segmento = String(selectedFarm?.segment || '').trim().toLowerCase()
  const isLoja = segmento === 'loja' || segmento.includes('loja')
  const isProdutor = ['corte', 'leite', 'suinos', 'suínos', 'bovinos', 'pecuaria', 'pecuária'].some(v => segmento === v || segmento.includes(v))
  const tabelaDesejada = isLoja ? 'loja' : isProdutor ? 'produtor' : null
  const tabelaPreco = tabelaDesejada
    ? priceTables.find(t => String(t.description || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(tabelaDesejada)) || null
    : null

  const addItem = () => {
    if (availableProducts.length === 0) return
    setItems(prev => [...prev, calcItem({
      key: 'i' + Date.now(),
      productId: '',
      productName: '',
      unit: 'kg',
      bagKg: 0,
      priceKg: 0,
      tablePriceKg: 0,
      maxDiscount: 10,
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
            unit: 'kg',
            bagKg: p.bag_kg || 0,
            priceKg: p.price_kg || 0,
            tablePriceKg: p.price_kg || 0,
            maxDiscount: p.max_discount || 10,
          }
        }
      }
      return calcItem(updated)
    }))
  }

  const removeItem = (key) => setItems(prev => prev.filter(it => it.key !== key))

  const subtotal = items.reduce((sum, it) => sum + (Number(it.subtotal) || 0), 0)
  const comissaoPct = parsePercent(comissao)
  const valorComissao = subtotal * (comissaoPct / 100)
  const hasOverDiscount = items.some(it => Number(it.discount) > Number(it.maxDiscount || 10))

  const datasValidas = !!saleDate && !!deliveryDate && deliveryDate >= saleDate
  const itensValidos = items.length > 0 && items.every(it =>
    !!it.productId && Number(it.quantity) > 0 && Number(it.priceKg) > 0
  )
  const isValid = !!farmId && !!selectedFarm && datasValidas && itensValidos &&
    !!paymentTermId && !!paymentMethodId && !!tabelaPreco && !!frete

  const handleSave = async () => {
    if (!isValid || saving) {
      if (!saving) showToast('Preencha cliente, datas, produtos em kg, preço/kg, condição e método de pagamento.', 'error')
      return
    }
    setSaving(true)
    const freteInfo = FRETES.find(f => f.value === frete)

    const { error } = await addSale({
      farmId,
      saleDate,
      deliveryDate,
      items: items.map(it => ({
        productId: it.productId,
        productName: it.productName,
        unit: 'kg',
        bagKg: Number(it.bagKg) || 0,
        priceKg: Number(it.priceKg) || 0,
        unitPrice: Number(it.priceKg) || 0,
        quantity: Number(it.quantity),
        quantityKg: Number(it.quantity),
        discount: Number(it.discount) || 0,
        subtotal: Number(it.subtotal),
      })),
      total: subtotal,
      paymentTermId,
      paymentTermLabel: paymentTerms.find(p => p.id === paymentTermId)?.label || '',
      paymentMethodId: Number(paymentMethodId),
      paymentMethodLabel: paymentMethods.find(p => String(p.id) === String(paymentMethodId))?.description || '',
      priceTableId: tabelaPreco?.id || null,
      priceTableLabel: tabelaPreco?.description || '',
      frete,
      frete_label: freteInfo ? `${freteInfo.label} - ${freteInfo.desc}` : frete,
      comissaoPct,
      notes: notes.trim(),
      needsApproval: hasOverDiscount,
    })

    if (error) {
      setSaving(false)
      showToast('Não foi possível registrar o pedido: ' + (error.message || 'erro desconhecido'), 'error')
      return
    }

    showToast('Pedido registrado com sucesso.', 'success')
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
        <p>{selectedFarm ? selectedFarm.name : 'Escolha a fazenda e adicione os produtos'}</p>
      </div>

      {!preselectedFarm ? (
        <>
          <div className="section-label">Fazenda</div>
          {farms.length === 0 ? (
            <div className="hint" style={{ marginBottom: 18 }}>
              Voce ainda nao tem fazendas cadastradas. Volte para Clientes e cadastre primeiro a fazenda.
            </div>
          ) : (
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 6, letterSpacing: 0.3 }}>
                Selecione a fazenda *
              </label>
              <FarmSearchSelect
                farms={farms}
                value={farmId}
                onChange={setFarmId}
              />
            </div>
          )}
        </>
      ) : null}

      <div className="section-label">Data do pedido *</div>
      <div style={{ marginBottom: 14 }}>
        <input type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)} />
      </div>

      <div className="section-label">Previsão de entrega *</div>
      <div style={{ marginBottom: 14 }}>
        <input type="date" value={deliveryDate} min={saleDate || undefined} onChange={e => setDeliveryDate(e.target.value)} />
      </div>

      <div className="section-label">
        Produtos *
        <span style={{ fontSize: 11, color: 'var(--text-faint)', marginLeft: 'auto', fontWeight: 500, letterSpacing: 0, textTransform: 'none' }}>
          {items.length} {items.length === 1 ? 'item' : 'itens'}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="empty" style={{ padding: 24, marginBottom: 12 }}>
          <IconReceipt /><p>Nenhum produto adicionado</p>
        </div>
      ) : (
        items.map((it, idx) => {
          const discount = Number(it.discount) || 0
          const maxDiscount = Number(it.maxDiscount || 10)
          const overLimit = discount > maxDiscount

          return (
            <div key={it.key} className="card" style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', letterSpacing: 0.3 }}>Item {idx + 1}</span>
                <button onClick={() => removeItem(it.key)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', fontSize: 11, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <IconTrash size={13} /> remover
                </button>
              </div>

              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>Produto *</label>
              <ProductSearchSelect
                products={availableProducts}
                value={it.productId}
                onChange={productId => updateItem(it.key, { productId })}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>Quantidade (kg) *</label>
                  <input type="number" min="0" step="0.01" value={it.quantity} onChange={e => updateItem(it.key, { quantity: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>R$/kg *</label>
                  <input type="number" min="0" step="0.01" value={it.priceKg} onChange={e => updateItem(it.key, { priceKg: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: overLimit ? 'var(--red)' : 'var(--text-dim)', marginBottom: 4 }}>Desc. % {overLimit ? '⚠️' : ''}</label>
                  <input type="number" min="0" max="100" step="0.5" value={it.discount} onChange={e => updateItem(it.key, { discount: e.target.value })} style={{ borderColor: overLimit ? 'var(--red)' : undefined }} />
                </div>
              </div>

              {discount > 0 ? (
                <div style={{ fontSize: 11, marginTop: 6, color: overLimit ? 'var(--red)' : 'var(--amber)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {overLimit ? <IconAlertTriangle size={12} /> : null}
                  Desconto de {discount.toFixed(1)}% (máximo do produto: {maxDiscount}%)
                </div>
              ) : null}

              <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 8 }}>
                {Number(it.quantity || 0).toLocaleString('pt-BR')} kg · {fmtBRL(it.priceKg)}/kg
              </div>

              <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--line-soft)', display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600 }}>
                <span style={{ color: 'var(--text-dim)' }}>Subtotal</span>
                <span style={{ color: 'var(--orange)' }}>{fmtBRL(it.subtotal)}</span>
              </div>
            </div>
          )
        })
      )}

      <button onClick={addItem} disabled={!selectedFarm} style={{ width: '100%', padding: '12px', borderRadius: 10, border: '1px dashed var(--orange)', background: 'rgba(240,125,26,0.06)', color: 'var(--orange)', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: selectedFarm ? 'pointer' : 'not-allowed', opacity: selectedFarm ? 1 : 0.4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 18 }}>
        <IconPlus size={16} /> Adicionar produto
      </button>

      <div className="section-label">Condição de pagamento *</div>
      <div style={{ marginBottom: 14 }}>
        <select value={paymentTermId} onChange={e => setPaymentTermId(e.target.value)}>
          <option value="">Selecionar condição...</option>
          {paymentTerms.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </div>

      <div className="section-label">Método de pagamento *</div>
      <div style={{ marginBottom: 14 }}>
        <select value={paymentMethodId} onChange={e => setPaymentMethodId(e.target.value)}>
          <option value="">Selecionar método...</option>
          {paymentMethods.map(m => <option key={m.id} value={m.id}>{m.description}</option>)}
        </select>
      </div>

      <div className="section-label">Tabela de preço *</div>
      <div style={{ marginBottom: 14 }}>
        <div className="hint" style={{ marginBottom: 0 }}>
          {tabelaPreco ? `${tabelaPreco.description} — selecionada automaticamente pelo tipo do cliente.` : 'Não foi encontrada uma tabela de preço ativa para este tipo de cliente.'}
        </div>
      </div>

      <div className="section-label">Modalidade de frete *</div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        {FRETES.map(f => (
          <button key={f.value} onClick={() => setFrete(f.value)} type="button" style={{ flex: 1, padding: '10px 8px', borderRadius: 10, cursor: 'pointer', border: '2px solid ' + (frete === f.value ? 'var(--orange)' : 'var(--line)'), background: frete === f.value ? 'var(--orange-bg)' : 'var(--surface-2)' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: frete === f.value ? 'var(--orange)' : 'var(--text)' }}>{f.label}</div>
            <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 2 }}>{f.desc}</div>
          </button>
        ))}
      </div>

      <div className="section-label">Comissão do representante</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}>
        <input type="number" value={comissao} onChange={e => setComissao(e.target.value)} placeholder="0" min="0" max="100" step="0.5" style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 16, fontWeight: 600, color: 'var(--text)', fontFamily: 'inherit' }} />
        <span style={{ fontSize: 14, color: 'var(--text-dim)', fontWeight: 600 }}>%</span>
        {comissaoPct > 0 && subtotal > 0 && <span style={{ fontSize: 13, color: 'var(--orange)', fontWeight: 600 }}>{'= ' + fmtBRL(valorComissao)}</span>}
      </div>

      <div className="section-label">Observações</div>
      <div style={{ marginBottom: 18 }}>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Detalhes do pedido, prazo de entrega, observações do produtor..." style={{ minHeight: 70 }} />
      </div>

      <div className="card" style={{ background: 'linear-gradient(135deg, rgba(240,125,26,0.13), rgba(240,125,26,0.05))', borderColor: 'rgba(240,125,26,0.3)', marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>Total do pedido</div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 28, color: 'var(--orange)', lineHeight: 1 }}>{fmtBRL(subtotal)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{items.length} {items.length === 1 ? 'item' : 'itens'}</div>
            <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 2 }}>{paymentTerms.find(p => p.id === paymentTermId)?.label || ''}</div>
            <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>{paymentMethods.find(p => String(p.id) === String(paymentMethodId))?.description || ''}</div>
            <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>{tabelaPreco?.description || ''}</div>
          </div>
        </div>
      </div>

      {hasOverDiscount ? (
        <div className="hint" style={{ background: 'var(--red-bg)', borderColor: 'rgba(217,83,79,0.3)', color: 'var(--red)', marginBottom: 14 }}>
          <IconAlertTriangle size={16} />
          <div>
            <strong>Desconto acima do limite de algum produto</strong>
            <div style={{ marginTop: 3, fontSize: 11 }}>Pedido será salvo mas marcado para aprovação do gerente.</div>
          </div>
        </div>
      ) : null}

      <div className="hint" style={{ marginBottom: 14 }}>
        A quantidade do pedido é sempre registrada em kg. Ao salvar, o pedido só é registrado se todos os campos obrigatórios estiverem completos.
      </div>

      <button className="btn btn-primary" onClick={handleSave} disabled={!isValid || saving} style={{ opacity: (isValid && !saving) ? 1 : 0.45, cursor: (isValid && !saving) ? 'pointer' : 'not-allowed' }}>
        <IconCheck size={18} /> {saving ? 'Salvando...' : 'Salvar pedido'}
      </button>
    </div>
  )
}
