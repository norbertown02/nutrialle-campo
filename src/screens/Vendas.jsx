import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconPlus, IconReceipt, IconAlertTriangle
} from '@tabler/icons-react'
import { useSales } from '../lib/useSales'
import { useFarms } from '../lib/useFarms'

function fmtBRL(n) {
  return 'R$ ' + Number(n).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR')
}

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

export default function Vendas() {
  const navigate = useNavigate()
  const salesHook = useSales()
  const sales = salesHook.sales
  const farmsHook = useFarms()
  const getFarm = farmsHook.getFarm

  const [filter, setFilter] = useState('todos')

  // Metricas
  const today = todayISO()
  const currentMonth = today.substring(0, 7)

  const salesThisMonth = sales.filter(s => s.saleDate && s.saleDate.startsWith(currentMonth))
  const totalThisMonth = salesThisMonth.reduce((sum, s) => sum + (Number(s.total) || 0), 0)
  const needsApproval = sales.filter(s => s.needsApproval)

  // Lista filtrada
  let filtered = [...sales].sort((a, b) =>
    (b.saleDate || '').localeCompare(a.saleDate || '')
  )
  if (filter === 'aprovacao') filtered = filtered.filter(s => s.needsApproval)

  return (
    <div className="content">
      <div className="page-head">
        <div className="eyebrow">Controle comercial</div>
        <h2>Vendas</h2>
        <p>
          {sales.length === 0
            ? 'Comece registrando seu primeiro pedido'
            : sales.length + ' ' + (sales.length === 1 ? 'pedido registrado' : 'pedidos registrados')}
        </p>
      </div>

      {sales.length === 0 ? (
        <div style={{
          background: 'var(--surface)',
          border: '2px dashed var(--line)',
          borderRadius: 16,
          padding: '40px 24px',
          textAlign: 'center',
          marginTop: 8
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20,
            background: 'rgba(240,125,26,0.13)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--orange)', margin: '0 auto 16px'
          }}>
            <IconReceipt size={36} />
          </div>
          <h3 style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 22, fontWeight: 600, marginBottom: 6
          }}>
            Nenhuma venda ainda
          </h3>
          <p style={{
            fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.5,
            marginBottom: 20, maxWidth: 280, margin: '0 auto 20px'
          }}>
            Acesse a ficha de um cliente e registre o primeiro pedido.
          </p>
          <button
            className="btn btn-primary"
            style={{ maxWidth: 240, margin: '0 auto' }}
            onClick={() => navigate('/clientes')}
          >
            Ir para clientes
          </button>
        </div>
      ) : (
        <>
          {/* KPIs do mes */}
          <div className="stat-grid">
            <div className="stat">
              <div className="label">Total do mes</div>
              <div className="value orange">{fmtBRL(totalThisMonth)}</div>
              <div className="sub">{salesThisMonth.length} pedidos</div>
            </div>
            <div className="stat">
              <div className="label">Aguardando aprovação</div>
              <div className="value">{needsApproval.length}</div>
              <div className="sub">{needsApproval.length === 1 ? 'pedido' : 'pedidos'}</div>
            </div>
          </div>

          {needsApproval.length > 0 ? (
            <div className="hint" style={{
              background: 'var(--red-bg)',
              borderColor: 'rgba(217,83,79,0.3)',
              color: 'var(--red)',
              marginTop: 12
            }}>
              <IconAlertTriangle size={16} />
              <div>
                {needsApproval.length} {needsApproval.length === 1 ? 'pedido aguarda' : 'pedidos aguardam'} aprovacao do gerente
              </div>
            </div>
          ) : null}

          {/* Botao principal */}
          <div style={{ marginTop: 14 }}>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => navigate('/vendas/nova')}>
              <IconPlus size={16} /> Nova venda
            </button>
          </div>

          {/* Filtros */}
          <div className="section-label" style={{ marginTop: 18 }}>Histórico</div>
          <div style={{
            display: 'flex', gap: 6, overflowX: 'auto',
            marginBottom: 14, paddingBottom: 4
          }}>
            {[
              ['todos', 'Todos', sales.length],
              ['aprovacao', 'Aprovacao', needsApproval.length],
            ].map(([id, label, count]) => (
              <button
                key={id}
                onClick={() => setFilter(id)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 20,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  whiteSpace: 'nowrap',
                  background: filter === id ? 'var(--orange)' : 'var(--surface-2)',
                  color: filter === id ? '#1a0d00' : 'var(--text-dim)'
                }}
              >
                {label}{count > 0 ? ' (' + count + ')' : ''}
              </button>
            ))}
          </div>

          {/* Lista de vendas */}
          {filtered.length === 0 ? (
            <div className="empty">
              <IconReceipt />
              <p>Nenhum pedido neste filtro</p>
            </div>
          ) : (
            filtered.map(s => {
              const farm = getFarm(s.farmId)
              const farmName = farm ? farm.name : '(fazenda removida)'

              return (
                <div
                  key={s.id}
                  className="row-item"
                  onClick={() => navigate('/vendas/' + s.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'flex-start', marginBottom: 6
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{farmName}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>
                        {formatDate(s.saleDate)} · {s.items.length} {s.items.length === 1 ? 'item' : 'itens'} · {s.paymentTermLabel}
                      </div>
                    </div>
                    {s.needsApproval && (
                      <span style={{
                        fontSize: 10, fontWeight: 600,
                        padding: '3px 8px', borderRadius: 20,
                        background: 'var(--red-bg)', color: 'var(--red)',
                        flexShrink: 0, display: 'flex', alignItems: 'center', gap: 3
                      }}>
                        <IconAlertTriangle size={11} /> Aprovação
                      </span>
                    )}
                  </div>
                  <div style={{
                    display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
                    marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--line-soft)'
                  }}>
                    <div style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontWeight: 700, fontSize: 18, color: 'var(--orange)'
                    }}>
                      {fmtBRL(s.total)}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </>
      )}
    </div>
  )
}
