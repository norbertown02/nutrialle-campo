import { useNavigate, useParams } from 'react-router-dom'
import {
  IconArrowLeft,
  IconAlertTriangle,
  IconCheck,
  IconTruck,
  IconCreditCard,
  IconUser,
  IconMapPin,
  IconReceipt,
  IconTrash,
} from '@tabler/icons-react'

import { useSales } from '../lib/useSales'
import { useFarms } from '../lib/useFarms'

function fmtBRL(n) {
  return 'R$ ' + Number(n || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR')
}

function formatDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR')
}

export default function DetalheVenda() {
  const navigate = useNavigate()
  const { id } = useParams()

  const { sales, removeSale } = useSales()
  const { getFarm } = useFarms()

  const venda = sales.find(s => s.id === id)

  if (!venda) {
    return (
      <div className="content">
        <button
          onClick={() => navigate(-1)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--orange)', fontSize: 14, cursor: 'pointer', marginBottom: 16, padding: 0 }}
        >
          <IconArrowLeft size={16} /> Voltar
        </button>

        <div className="empty">
          <IconReceipt />
          <p>Venda não encontrada.</p>
        </div>
      </div>
    )
  }

  const farm = getFarm(venda.farmId)
  const farmName = farm ? farm.name : '(fazenda removida)'

  const statusColor = venda.status === 'enviado' ? 'var(--green)' : 'var(--amber)'
  const statusBg = venda.status === 'enviado' ? 'var(--green-bg)' : 'var(--amber-bg)'
  const statusLabel = venda.status === 'enviado' ? 'Enviado' : 'Pendente de envio'

  const itens = Array.isArray(venda.items) ? venda.items : []

  function handleExcluir() {
    if (!window.confirm('Excluir esta venda? Essa ação não pode ser desfeita.')) return
    removeSale(venda.id)
    navigate('/vendas')
  }

  return (
    <div className="content">
      <button
        onClick={() => navigate(-1)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--orange)', fontSize: 14, cursor: 'pointer', marginBottom: 16, padding: 0 }}
      >
        <IconArrowLeft size={16} /> Voltar
      </button>

      <div className="page-head">
        <div className="eyebrow">Venda · {formatDate(venda.saleDate)}</div>
        <h2>{farmName}</h2>
        <p>
          {itens.length} {itens.length === 1 ? 'item' : 'itens'} · {venda.paymentTermLabel || 'Pagamento não informado'}
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '14px 0' }}>
        <span style={{
          fontSize: 11, fontWeight: 600,
          padding: '4px 10px', borderRadius: 20,
          background: statusBg, color: statusColor,
        }}>
          {statusLabel}
        </span>

        {venda.needsApproval ? (
          <span style={{
            fontSize: 11, fontWeight: 600, color: 'var(--red)',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <IconAlertTriangle size={13} /> Precisa aprovação
          </span>
        ) : null}
      </div>

      {farm ? (
        <div
          className="card"
          onClick={() => navigate('/clientes/' + farm.id)}
          style={{ cursor: 'pointer', marginBottom: 14 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 12,
              background: 'rgba(240,125,26,0.13)', color: 'var(--orange)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <IconUser size={18} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{farm.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-faint)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <IconMapPin size={12} /> {farm.city || farm.region || 'Cidade não informada'}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="section-label">Itens do pedido</div>
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 14 }}>
        {itens.length === 0 ? (
          <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-faint)', fontSize: 13 }}>
            Nenhum item registrado nesta venda.
          </div>
        ) : (
          itens.map((it, index) => (
            <div
              key={index}
              style={{
                padding: '12px 14px',
                borderBottom: index < itens.length - 1 ? '1px solid var(--line-soft)' : 'none',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{it.productName || 'Produto sem nome'}</div>
                <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>
                  {it.quantity} × {fmtBRL(it.unitPrice)}
                </div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', flexShrink: 0 }}>
                {fmtBRL(it.subtotal ?? (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0))}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="section-label">Condições</div>
      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <IconCreditCard size={16} color="var(--text-faint)" />
          <span style={{ fontSize: 13, color: 'var(--text)' }}>{venda.paymentTermLabel || 'Não informado'}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <IconTruck size={16} color="var(--text-faint)" />
          <span style={{ fontSize: 13, color: 'var(--text)' }}>{venda.frete_label || venda.frete || 'Não informado'}</span>
        </div>

        {venda.comissaoPct > 0 ? (
          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-faint)' }}>
            Comissão: {venda.comissaoPct}%
          </div>
        ) : null}
      </div>

      <div className="stat-grid" style={{ marginBottom: 14 }}>
        <div className="stat">
          <div className="label">Total da venda</div>
          <div className="value orange">{fmtBRL(venda.total)}</div>
        </div>
        <div className="stat">
          <div className="label">Registrada em</div>
          <div className="value" style={{ fontSize: 13 }}>{formatDateTime(venda.createdAt)}</div>
        </div>
      </div>

      {venda.sentAt ? (
        <div className="hint" style={{ marginBottom: 14 }}>
          <IconCheck size={16} />
          <div style={{ fontSize: 12 }}>
            Enviada para o time administrativo em {formatDateTime(venda.sentAt)}.
          </div>
        </div>
      ) : null}

      <button
        className="btn btn-ghost"
        style={{ color: 'var(--red)', borderColor: 'rgba(217,83,79,0.3)' }}
        onClick={handleExcluir}
      >
        <IconTrash size={16} /> Excluir venda
      </button>
    </div>
  )
}
