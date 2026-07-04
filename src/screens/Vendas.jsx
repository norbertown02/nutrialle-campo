import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconPlus, IconSend, IconReceipt, IconDownload,
  IconBrandWhatsapp, IconAlertTriangle, IconCheck, IconX
} from '@tabler/icons-react'
import { useSales } from '../lib/useSales'
import { useFarms } from '../lib/useFarms'

// NUMERO DO TIME ADMIN - Norberto, ajuste aqui quando definir o numero oficial
const ADMIN_WHATSAPP = '5545999999999'

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

function monthLabel(iso) {
  if (!iso) return ''
  const months = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
  const parts = iso.split('-')
  return months[parseInt(parts[1], 10) - 1] + '/' + parts[0].substring(2)
}

export default function Vendas() {
  const navigate = useNavigate()
  const salesHook = useSales()
  const sales = salesHook.sales
  const markAsSent = salesHook.markAsSent
  const farmsHook = useFarms()
  const getFarm = farmsHook.getFarm

  const [filter, setFilter] = useState('todos')
  const [showCloseDay, setShowCloseDay] = useState(false)
  const [confirmSent, setConfirmSent] = useState(false)

  // Metricas
  const today = todayISO()
  const currentMonth = today.substring(0, 7)

  const salesThisMonth = sales.filter(s => s.saleDate && s.saleDate.startsWith(currentMonth))
  const totalThisMonth = salesThisMonth.reduce((sum, s) => sum + (Number(s.total) || 0), 0)
  const pending = sales.filter(s => s.status === 'pendente_envio')
  const needsApproval = sales.filter(s => s.needsApproval && s.status === 'pendente_envio')
  const pendingTotal = pending.reduce((sum, s) => sum + (Number(s.total) || 0), 0)

  // Lista filtrada
  let filtered = [...sales].sort((a, b) =>
    (b.saleDate || '').localeCompare(a.saleDate || '')
  )
  if (filter === 'pendentes') filtered = filtered.filter(s => s.status === 'pendente_envio')
  if (filter === 'enviados') filtered = filtered.filter(s => s.status === 'enviado')
  if (filter === 'aprovacao') filtered = filtered.filter(s => s.needsApproval)

  // Acoes do fechar dia
  const handleDownloadCSV = () => {
    if (pending.length === 0) return

    const rows = [
      ['Data', 'Cliente', 'Cidade', 'Produto', 'Qtd', 'Preco Unit', 'Subtotal', 'Pagamento', 'Aprovacao']
    ]

    pending.forEach(s => {
      const farm = getFarm(s.farmId)
      const farmName = farm ? farm.name : '(fazenda removida)'
      const city = farm ? farm.city : '-'
      s.items.forEach(it => {
        rows.push([
          formatDate(s.saleDate),
          farmName,
          city,
          it.productName,
          it.quantity,
          fmtBRL(it.unitPrice),
          fmtBRL(it.subtotal || it.quantity * it.unitPrice),
          s.paymentTermLabel,
          s.needsApproval ? 'PRECISA APROVACAO' : 'OK'
        ])
      })
    })

    const csv = rows.map(r =>
      r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(';')
    ).join('\n')

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'vendas_nutrialle_' + today + '.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    // Marca como enviadas
    markAsSent(pending.map(s => s.id))
    setShowCloseDay(false)
    setConfirmSent(true)
    setTimeout(() => setConfirmSent(false), 4000)
  }

  const handleSendWhatsApp = () => {
    if (pending.length === 0) return

    let txt = '*Vendas Nutrialle - ' + formatDate(today) + '*%0A'
    txt += pending.length + ' pedidos - Total: ' + fmtBRL(pendingTotal) + '%0A%0A'

    pending.forEach((s, idx) => {
      const farm = getFarm(s.farmId)
      const farmName = farm ? farm.name : '(fazenda removida)'
      const city = farm ? farm.city : '-'
      txt += '*' + (idx + 1) + '. ' + farmName + '* (' + city + ')%0A'
      s.items.forEach(it => {
        txt += '  - ' + it.productName + ': ' + it.quantity + 'x ' + fmtBRL(it.unitPrice) + '%0A'
      })
      txt += '  Pagamento: ' + s.paymentTermLabel + '%0A'
      txt += '  Total: *' + fmtBRL(s.total) + '*'
      if (s.needsApproval) txt += ' [PRECISA APROVACAO]'
      txt += '%0A%0A'
    })

    txt += 'Para lancamento no Ultra Sistemas.'

    window.open('https://wa.me/' + ADMIN_WHATSAPP + '?text=' + txt, '_blank')

    // Marca como enviadas
    markAsSent(pending.map(s => s.id))
    setShowCloseDay(false)
    setConfirmSent(true)
    setTimeout(() => setConfirmSent(false), 4000)
  }

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

      {confirmSent ? (
        <div className="hint" style={{
          background: 'var(--green-bg)',
          borderColor: 'rgba(91,174,74,0.4)',
          color: 'var(--green)',
          marginBottom: 14
        }}>
          <IconCheck size={16} />
          <div>
            <strong>Dia fechado com sucesso!</strong>
            <div style={{ fontSize: 11, marginTop: 3 }}>
              Pedidos enviados para o time administrativo lancar no Ultra Sistemas.
            </div>
          </div>
        </div>
      ) : null}

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
              <div className="label">Pendente envio</div>
              <div className="value">{fmtBRL(pendingTotal)}</div>
              <div className="sub">{pending.length} pedidos</div>
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

          {/* Botoes principais */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginTop: 14 }}>
            <button
              className="btn btn-ghost"
              onClick={() => setShowCloseDay(true)}
              disabled={pending.length === 0}
              style={{ opacity: pending.length === 0 ? 0.4 : 1 }}
            >
              <IconSend size={16} /> Fechar dia
            </button>
            <button className="btn btn-primary" onClick={() => navigate('/vendas/nova')}>
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
              ['pendentes', 'Pendentes', pending.length],
              ['enviados', 'Enviados', sales.filter(s => s.status === 'enviado').length],
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
              const statusColor = s.status === 'enviado' ? 'var(--green)' : 'var(--amber)'
              const statusBg = s.status === 'enviado' ? 'var(--green-bg)' : 'var(--amber-bg)'
              const statusLabel = s.status === 'enviado' ? 'Enviado' : 'Pendente'

              return (
                <div
                  key={s.id}
                  className="row-item"
                  onClick={() => farm ? navigate('/clientes/' + farm.id) : null}
                  style={{ cursor: farm ? 'pointer' : 'default' }}
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
                    <span style={{
                      fontSize: 10, fontWeight: 600,
                      padding: '3px 8px', borderRadius: 20,
                      background: statusBg, color: statusColor,
                      flexShrink: 0
                    }}>
                      {statusLabel}
                    </span>
                  </div>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--line-soft)'
                  }}>
                    <div>
                      {s.needsApproval ? (
                        <span style={{
                          fontSize: 10, color: 'var(--red)', fontWeight: 600,
                          display: 'flex', alignItems: 'center', gap: 3
                        }}>
                          <IconAlertTriangle size={11} /> Precisa aprovacao
                        </span>
                      ) : null}
                    </div>
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

      {/* MODAL: Fechar Dia */}
      {showCloseDay ? (
        <div
          onClick={() => setShowCloseDay(false)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            zIndex: 100, padding: 0
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 430,
              background: 'var(--bg)',
              borderTopLeftRadius: 20, borderTopRightRadius: 20,
              padding: '14px 18px 30px',
              maxHeight: '90vh', overflowY: 'auto',
              boxShadow: '0 -10px 40px rgba(0,0,0,0.4)'
            }}
          >
            <div style={{
              width: 40, height: 4, borderRadius: 2,
              background: 'var(--line)', margin: '0 auto 14px'
            }} />

            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: 14
            }}>
              <div>
                <h3 style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 22, fontWeight: 600
                }}>Fechar dia</h3>
                <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
                  Enviar pedidos para o time administrativo
                </p>
              </div>
              <button
                onClick={() => setShowCloseDay(false)}
                style={{
                  background: 'var(--surface-2)', border: 'none',
                  width: 32, height: 32, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--text-dim)', cursor: 'pointer'
                }}
              >
                <IconX size={16} />
              </button>
            </div>

            <div className="stat-grid" style={{ marginBottom: 14 }}>
              <div className="stat">
                <div className="label">Pedidos</div>
                <div className="value orange">{pending.length}</div>
              </div>
              <div className="stat">
                <div className="label">Total</div>
                <div className="value">{fmtBRL(pendingTotal)}</div>
              </div>
            </div>

            {needsApproval.length > 0 ? (
              <div className="hint" style={{
                background: 'var(--red-bg)',
                borderColor: 'rgba(217,83,79,0.3)',
                color: 'var(--red)',
                marginBottom: 14
              }}>
                <IconAlertTriangle size={16} />
                <div style={{ fontSize: 11 }}>
                  {needsApproval.length} {needsApproval.length === 1 ? 'pedido' : 'pedidos'} marcado(s) para aprovacao do gerente serao enviados junto
                </div>
              </div>
            ) : null}

            <div className="section-label" style={{ marginTop: 4 }}>Pedidos a enviar</div>
            <div style={{ maxHeight: 240, overflowY: 'auto', marginBottom: 14 }}>
              {pending.map(s => {
                const farm = getFarm(s.farmId)
                const farmName = farm ? farm.name : '(fazenda removida)'
                return (
                  <div key={s.id} className="card" style={{ padding: 11, marginBottom: 6 }}>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between',
                      alignItems: 'flex-start'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{farmName}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                          {formatDate(s.saleDate)} · {s.items.length} {s.items.length === 1 ? 'item' : 'itens'}
                        </div>
                      </div>
                      <span style={{
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontWeight: 700, fontSize: 14, color: 'var(--orange)'
                      }}>
                        {fmtBRL(s.total)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="hint" style={{ marginBottom: 14, fontSize: 11 }}>
              Apos enviar, esses pedidos saem do pendente e ficam no historico como enviados.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
              <button className="btn btn-ghost" onClick={handleDownloadCSV}>
                <IconDownload size={16} /> Baixar CSV
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSendWhatsApp}
                style={{ background: '#1e4a2e', boxShadow: 'none', color: '#5BAE4A' }}
              >
                <IconBrandWhatsapp size={16} /> WhatsApp
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
