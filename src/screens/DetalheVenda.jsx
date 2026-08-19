import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  IconArrowLeft,
  IconAlertTriangle,
  IconTruck,
  IconCreditCard,
  IconUser,
  IconMapPin,
  IconReceipt,
  IconTrash,
  IconDownload,
  IconRefresh,
} from '@tabler/icons-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

import { useSales } from '../lib/useSales'
import { useFarms } from '../lib/useFarms'
import { useAuth } from '../lib/useAuth.jsx'
import { confirmDialog } from '../lib/confirm'
import { showToast } from '../lib/toast'
import logoHeader from '../assets/logo-cotacao-header.png'

function fmtBRL(n) {
  return 'R$ ' + Number(n || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function moeda(n) {
  return Number(n || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
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

function limparNomeArquivo(nome) {
  return String(nome || 'Cliente')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_')
}

function labelSegmento(segment) {
  if (!segment) return '—'

  const mapa = {
    leite: 'Leite',
    corte: 'Corte',
    loja: 'Loja',
    suinos: 'Suínos',
    aves: 'Aves',
  }

  return mapa[segment] || String(segment).charAt(0).toUpperCase() + String(segment).slice(1)
}

// Número do pedido não existe como campo próprio na venda — usamos os
// últimos dígitos do id (que já é baseado em timestamp) como um número
// curto e estável para identificar o pedido no PDF.
function numeroPedido(venda) {
  const digitos = String(venda?.id || '').replace(/\D/g, '')
  return digitos ? digitos.slice(-6) : '—'
}

export default function DetalheVenda() {
  const navigate = useNavigate()
  const { id } = useParams()

  const { sales, resendSaleToUltra, removeSale } = useSales()
  const [reenviandoUltra, setReenviandoUltra] = useState(false)
  const { getFarm } = useFarms()
  const { user } = useAuth()

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

  const itens = Array.isArray(venda.items) ? venda.items : []

  function buildPDF() {
    const doc = new jsPDF('p', 'mm', 'a4')

    const W = 210
    const H = 297
    const M = 14

    const ORANGE = [232, 119, 34]
    const ORANGE_DARK = [204, 90, 0]
    const BLACK = [8, 8, 8]
    const WHITE = [255, 255, 255]
    const PAPER = [248, 246, 243]
    const LINE = [225, 218, 211]
    const TEXT = [22, 22, 22]
    const MUTED = [112, 106, 100]
    const SOFT = [160, 154, 147]

    const cliente = farmName
    const vendedor = user?.name || user?.email || '—'
    const cidadeUf = [farm?.city, farm?.state].filter(Boolean).join('/')
    const emitidaEm = formatDate(venda.saleDate)
    const pedidoNum = numeroPedido(venda)

    const subtotalItens = itens.reduce((acc, item) => acc + Number(item.subtotal || 0), 0)
    const brutoItens = itens.reduce(
      (acc, item) => acc + Number(item.quantity || 0) * Number(item.unitPrice || 0),
      0
    )
    const desconto = Math.max(0, brutoItens - subtotalItens)
    const total = Number(venda.total ?? subtotalItens)

    function drawFooter(pageNumber, pageCount) {
      doc.setDrawColor(...ORANGE)
      doc.setLineWidth(0.35)
      doc.line(M, H - 16, W - M, H - 16)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(...TEXT)
      doc.text('Nutrialle Nutrição Animal', M, H - 10)

      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...MUTED)
      doc.text(`Vendedor: ${vendedor}`, W / 2, H - 10, { align: 'center' })

      doc.setTextColor(...SOFT)
      doc.text(`Página ${pageNumber} de ${pageCount}`, W - M, H - 10, { align: 'right' })
    }

    function drawHeader() {
      doc.setFillColor(...BLACK)
      doc.rect(0, 0, W, 52, 'F')

      doc.setFillColor(...ORANGE)
      doc.rect(0, 52, W, 1.3, 'F')

      try {
        doc.addImage(logoHeader, 'PNG', M, 12, 66, 14)
      } catch (e) {
        console.warn('Não foi possível desenhar o logo no PDF:', e)
      }

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(19)
      doc.setTextColor(...WHITE)
      doc.text('PEDIDO DE', W - M, 18, { align: 'right' })

      doc.setTextColor(...ORANGE)
      doc.text('VENDA', W - M, 26, { align: 'right' })

      doc.setDrawColor(...ORANGE)
      doc.setLineWidth(0.35)
      doc.line(W - M - 42, 31, W - M, 31)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(215, 215, 215)
      doc.text('Nº do pedido', W - M - 43, 38)
      doc.text('Data da venda', W - M - 43, 44)

      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...WHITE)
      doc.text(pedidoNum, W - M, 38, { align: 'right' })
      doc.text(emitidaEm, W - M, 44, { align: 'right' })
    }

    drawHeader()

    let y = 66

    doc.setFillColor(...WHITE)
    doc.setDrawColor(...LINE)
    doc.setLineWidth(0.3)
    doc.roundedRect(M, y, W - M * 2, 40, 4, 4, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.8)
    doc.setTextColor(...ORANGE_DARK)
    doc.text('CLIENTE', M + 7, y + 8)

    doc.setFontSize(17)
    doc.setTextColor(...TEXT)
    doc.text(cliente, M + 7, y + 18, { maxWidth: 95 })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.4)
    doc.setTextColor(...MUTED)

    const infosCliente = [
      labelSegmento(farm?.segment),
      cidadeUf || '—',
      farm?.prospect ? 'Prospecto' : 'Cliente ativo',
    ].filter(Boolean)

    doc.text(infosCliente.join('  ·  '), M + 7, y + 26)

    doc.setFontSize(7.6)
    doc.setTextColor(...SOFT)

    const docsCliente = [
      farm?.cpfCnpj && `CPF/CNPJ: ${farm.cpfCnpj}`,
      farm?.cadPro && `CAD/PRO: ${farm.cadPro}`,
      farm?.phone && `Tel: ${farm.phone}`,
    ].filter(Boolean)

    doc.text(docsCliente.length > 0 ? docsCliente.join('  ·  ') : 'Dados cadastrais incompletos', M + 7, y + 33, { maxWidth: 95 })

    doc.setDrawColor(...LINE)
    doc.line(W - M - 58, y + 7, W - M - 58, y + 33)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.8)
    doc.setTextColor(...ORANGE_DARK)
    doc.text('VENDEDOR', W - M - 51, y + 10)

    doc.setFontSize(10)
    doc.setTextColor(...TEXT)
    doc.text(vendedor, W - M - 51, y + 18, { maxWidth: 45 })

    if (venda.needsApproval) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.6)
      doc.setTextColor(...ORANGE_DARK)
      doc.text('Precisa aprovação', W - M - 51, y + 27, { maxWidth: 45 })
    }

    y += 51

    autoTable(doc, {
      startY: y,
      head: [[
        'Produto',
        'Qtd.',
        'Total kg',
        'R$/kg',
        'R$/saco',
        'Subtotal',
      ]],
      body: itens.map(item => {
        const quantidade = Number(item.quantity || 0)
        const bagKg = Number(item.bagKg || 25)
        const totalKg = quantidade * bagKg
        const valorSaco = Number(item.unitPrice || 0)
        const valorKg = item.priceKg
          ? Number(item.priceKg)
          : bagKg > 0
            ? valorSaco / bagKg
            : 0

        return [
          item.productName || '—',
          quantidade.toLocaleString('pt-BR'),
          `${totalKg.toLocaleString('pt-BR')} kg`,
          moeda(valorKg),
          moeda(valorSaco),
          moeda(item.subtotal),
        ]
      }),
      theme: 'grid',
      margin: {
        left: M,
        right: M,
        bottom: 26,
      },
      tableWidth: W - M * 2,
      styles: {
        font: 'helvetica',
        fontSize: 8,
        cellPadding: {
          top: 4,
          right: 3,
          bottom: 4,
          left: 3,
        },
        lineColor: LINE,
        lineWidth: 0.2,
        textColor: TEXT,
        valign: 'middle',
      },
      headStyles: {
        fillColor: PAPER,
        textColor: ORANGE_DARK,
        fontStyle: 'bold',
        fontSize: 7.3,
        halign: 'center',
        lineColor: LINE,
        lineWidth: 0.2,
      },
      bodyStyles: {
        fillColor: WHITE,
        textColor: TEXT,
      },
      alternateRowStyles: {
        fillColor: [253, 251, 248],
      },
      columnStyles: {
        0: {
          cellWidth: 63,
          halign: 'left',
          fontStyle: 'bold',
        },
        1: {
          cellWidth: 18,
          halign: 'center',
        },
        2: {
          cellWidth: 26,
          halign: 'center',
        },
        3: {
          cellWidth: 25,
          halign: 'right',
        },
        4: {
          cellWidth: 26,
          halign: 'right',
        },
        5: {
          cellWidth: 24,
          halign: 'right',
          fontStyle: 'bold',
          textColor: ORANGE_DARK,
        },
      },
      didDrawPage: () => {
        if (doc.internal.getNumberOfPages() > 1) {
          if (doc.internal.getCurrentPageInfo().pageNumber > 1) {
            doc.setFillColor(...WHITE)
            doc.rect(0, 0, W, H, 'F')
          }
        }
      },
    })

    y = doc.lastAutoTable.finalY + 9

    if (y > 218) {
      doc.addPage()
      y = 24
    }

    const leftW = 105
    const rightW = W - M * 2 - leftW - 8

    doc.setFillColor(...WHITE)
    doc.setDrawColor(...LINE)
    doc.roundedRect(M, y, leftW, 47, 4, 4, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.8)
    doc.setTextColor(...ORANGE_DARK)
    doc.text('CONDIÇÕES COMERCIAIS', M + 6, y + 8)

    const condicoes = [
      ['Condição', venda.paymentTermLabel || '—'],
      ['Frete', venda.frete_label || venda.frete || 'CIF - Frete por conta do vendedor'],
      ['Data da venda', emitidaEm],
      ['Registrado em', formatDateTime(venda.createdAt)],
    ]

    let cy = y + 17

    condicoes.forEach((linha, index) => {
      const valorLinhas = doc.splitTextToSize(String(linha[1]), 62)

      if (index > 0) {
        doc.setDrawColor(...LINE)
        doc.line(M + 6, cy - 5, M + leftW - 6, cy - 5)
      }

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(...TEXT)
      doc.text(linha[0], M + 6, cy)

      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...MUTED)
      doc.text(valorLinhas, M + 35, cy)

      cy += Math.max(8, valorLinhas.length * 4 + 2)
    })

    const sx = M + leftW + 8

    doc.setFillColor(...WHITE)
    doc.setDrawColor(...LINE)
    doc.roundedRect(sx, y, rightW, 47, 4, 4, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.8)
    doc.setTextColor(...ORANGE_DARK)
    doc.text('RESUMO', sx + 6, y + 8)

    const resumo = [
      ['Subtotal', moeda(brutoItens)],
      ['Descontos', desconto > 0 ? moeda(desconto) : '—'],
    ]

    let sy = y + 17

    resumo.forEach((linha, index) => {
      if (index > 0) {
        doc.setDrawColor(...LINE)
        doc.line(sx + 6, sy - 5, sx + rightW - 6, sy - 5)
      }

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.3)
      doc.setTextColor(...MUTED)
      doc.text(linha[0], sx + 6, sy)

      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...TEXT)
      doc.text(linha[1], sx + rightW - 6, sy, { align: 'right' })

      sy += 8
    })

    doc.setDrawColor(...ORANGE)
    doc.setLineWidth(0.45)
    doc.line(sx + 6, y + 35, sx + rightW - 6, y + 35)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...ORANGE_DARK)
    doc.text('Total do pedido', sx + 6, y + 42)

    doc.setFontSize(13)
    doc.text(moeda(total), sx + rightW - 6, y + 42, { align: 'right' })

    const pageCount = doc.internal.getNumberOfPages()

    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      drawFooter(i, pageCount)
    }

    return doc
  }

  function nomeArquivoPDF() {
    return `Pedido_${limparNomeArquivo(farmName)}_${numeroPedido(venda)}.pdf`
  }

  async function gerarPDF() {
    try {
      const doc = buildPDF()
      doc.save(nomeArquivoPDF())
    } catch (e) {
      showToast('Erro ao gerar PDF: ' + e.message, 'error')
    }
  }

  async function handleReenviarUltra() {
    if (reenviandoUltra) return

    setReenviandoUltra(true)
    try {
      const { error } = await resendSaleToUltra(venda.id)
      if (error) {
        showToast('Não foi possível reenviar: ' + (error.message || error), 'error')
        return
      }
      showToast('Venda enviada novamente para o Ultra.', 'success')
    } catch (e) {
      showToast('Erro ao reenviar para o Ultra: ' + (e.message || e), 'error')
    } finally {
      setReenviandoUltra(false)
    }
  }

  async function handleExcluir() {
    const ok = await confirmDialog('Excluir esta venda? Essa ação não pode ser desfeita.', {
      title: 'Excluir venda', confirmLabel: 'Excluir', danger: true,
    })
    if (!ok) return
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

      {venda.needsApproval ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '14px 0' }}>
          <span style={{
            fontSize: 11, fontWeight: 600, color: 'var(--red)',
            background: 'var(--red-bg)', padding: '4px 10px', borderRadius: 20,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <IconAlertTriangle size={13} /> Precisa aprovação
          </span>
        </div>
      ) : null}

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

      <button
        className="btn btn-ghost"
        onClick={gerarPDF}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          marginBottom: 10,
        }}
      >
        <IconDownload size={16} /> Baixar PDF do pedido
      </button>

      {!venda.ultraOrderId && (venda.integrationStatus === 'erro' || venda.integrationStatus === 'aguardando_configuracao' || venda.ultraError) ? (
        <button
          className="btn btn-ghost"
          onClick={handleReenviarUltra}
          disabled={reenviandoUltra}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            marginBottom: 10,
            color: 'var(--orange)',
            borderColor: 'rgba(240,125,26,0.35)',
            opacity: reenviandoUltra ? 0.65 : 1,
          }}
        >
          <IconRefresh size={16} />
          {reenviandoUltra ? 'Reenviando para o Ultra...' : 'Reenviar para o Ultra'}
        </button>
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
