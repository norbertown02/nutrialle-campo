import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/useAuth.jsx'
import {
  IconFileText,
  IconCheck,
  IconEdit,
  IconDownload,
  IconBrandWhatsapp,
} from '@tabler/icons-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import logoHeader from '../assets/logo-cotacao-header.png'

function fmt(n) {
  return Number(n || 0).toLocaleString('pt-BR', {
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

function dataBR(date) {
  if (!date) return '—'

  try {
    if (String(date).includes('T')) {
      return new Date(date).toLocaleDateString('pt-BR')
    }

    return new Date(date + 'T12:00:00').toLocaleDateString('pt-BR')
  } catch {
    return '—'
  }
}

function limparNomeArquivo(nome) {
  return String(nome || 'Cliente')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
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

const STATUS_CFG = {
  rascunho: {
    label: 'Rascunho',
    color: 'var(--text-faint)',
    bg: 'var(--surface-2)',
  },
  enviada: {
    label: 'Enviada',
    color: 'var(--amber)',
    bg: 'var(--amber-bg)',
  },
  convertida: {
    label: 'Convertida',
    color: 'var(--green)',
    bg: 'var(--green-bg)',
  },
  cancelada: {
    label: 'Cancelada',
    color: 'var(--red)',
    bg: 'var(--red-bg)',
  },
}

export default function DetalheCotacao() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [quote, setQuote] = useState(null)
  const [farm, setFarm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [atualizando, setAtualizando] = useState(false)

  useEffect(() => {
    carregar()
  }, [id])

  async function carregar() {
    setLoading(true)

    const { data: q } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', id)
      .single()

    if (q) {
      setQuote(q)

      const { data: f } = await supabase
        .from('farms')
        .select('*')
        .eq('id', q.farm_id)
        .single()

      setFarm(f)
    }

    setLoading(false)
  }

  async function mudarStatus(status) {
    setAtualizando(true)

    await supabase
      .from('quotes')
      .update({ status })
      .eq('id', id)

    setQuote(prev => ({ ...prev, status }))
    setAtualizando(false)
  }

  async function converterEmVenda() {
    const camposFaltando = []

    if (!farm?.cpf_cnpj) camposFaltando.push('CPF/CNPJ')
    if (!farm?.cad_pro) camposFaltando.push('CAD/PRO')
    if (!farm?.street && !farm?.address) camposFaltando.push('Endereço')
    if (!farm?.city) camposFaltando.push('Município')
    if (!farm?.phone) camposFaltando.push('Telefone')

    if (camposFaltando.length > 0) {
      alert(
        'Para converter em venda, complete os dados da fazenda:\n\n• ' +
          camposFaltando.join('\n• ') +
          '\n\nAcesse a ficha do cliente e preencha os dados faltantes.'
      )
      return
    }

    if (!confirm('Converter esta cotação em venda?')) return

    setAtualizando(true)

    const venda = {
      id: 's' + Date.now(),
      farm_id: quote.farm_id,
      sale_date: new Date().toISOString().split('T')[0],
      items: quote.items,
      payment_term: quote.payment_term,
      payment_term_label: quote.payment_term_label,
      frete: quote.frete || 'CIF',
      frete_label: quote.frete_label || 'CIF - Frete por conta do vendedor',
      total: quote.total,
      needs_approval: false,
      status: 'pendente_envio',
    }

    const { error: errVenda } = await supabase
      .from('sales')
      .insert(venda)

    if (errVenda) {
      alert('Erro ao criar venda: ' + errVenda.message)
      setAtualizando(false)
      return
    }

    await supabase
      .from('quotes')
      .update({
        status: 'convertida',
        converted_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (farm?.prospect) {
      await supabase
        .from('farms')
        .update({ prospect: false })
        .eq('id', quote.farm_id)
    }

    setQuote(prev => ({ ...prev, status: 'convertida' }))
    setAtualizando(false)
    navigate('/vendas')
  }

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

    const cliente = farm?.name || 'Cliente'
    const vendedor = user?.name || user?.email || '—'
    const cidadeUf = [farm?.city, farm?.state].filter(Boolean).join('/')
    const emitidaEm = quote?.created_at ? dataBR(quote.created_at) : new Date().toLocaleDateString('pt-BR')
    const validade = dataBR(quote?.valid_until)

    const items = quote?.items || []
    const subtotal = items.reduce((acc, item) => acc + Number(item.subtotal || 0), 0)
    const desconto = Number(quote?.discount_total || 0)
    const freteValor = Number(quote?.freight_value || 0)
    const total = Number(quote?.total ?? subtotal - desconto + freteValor)

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
      } catch (e) {}

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(19)
      doc.setTextColor(...WHITE)
      doc.text('COTAÇÃO', W - M, 18, { align: 'right' })

      doc.setTextColor(...ORANGE)
      doc.text('COMERCIAL', W - M, 26, { align: 'right' })

      doc.setDrawColor(...ORANGE)
      doc.setLineWidth(0.35)
      doc.line(W - M - 42, 31, W - M, 31)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(215, 215, 215)
      doc.text('Emitida em', W - M - 43, 38)
      doc.text('Válida até', W - M - 43, 44)

      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...WHITE)
      doc.text(emitidaEm, W - M, 38, { align: 'right' })
      doc.text(validade, W - M, 44, { align: 'right' })
    }

    drawHeader()

    let y = 66

    doc.setFillColor(...WHITE)
    doc.setDrawColor(...LINE)
    doc.setLineWidth(0.3)
    doc.roundedRect(M, y, W - M * 2, 34, 4, 4, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.8)
    doc.setTextColor(...ORANGE_DARK)
    doc.text('CLIENTE', M + 7, y + 8)

    doc.setFontSize(19)
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

    doc.setDrawColor(...LINE)
    doc.line(W - M - 58, y + 7, W - M - 58, y + 27)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.8)
    doc.setTextColor(...ORANGE_DARK)
    doc.text('VENDEDOR', W - M - 51, y + 10)

    doc.setFontSize(10)
    doc.setTextColor(...TEXT)
    doc.text(vendedor, W - M - 51, y + 18, { maxWidth: 45 })

    y += 45

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
      body: items.map(item => {
        const quantidade = Number(item.quantity || 0)
        const bagKg = Number(item.bag_kg || 25)
        const totalKg = quantidade * bagKg
        const valorSaco = Number(item.unit_price || 0)
        const valorKg = item.price_kg
          ? Number(item.price_kg)
          : bagKg > 0
            ? valorSaco / bagKg
            : 0

        return [
          item.product_name || '—',
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
      ['Condição', quote?.payment_term_label || '—'],
      ['Frete', quote?.frete_label || quote?.frete || 'CIF - Frete por conta do vendedor'],
      ['Validade', validade],
      ['Observações', quote?.notes || 'Valores sujeitos à confirmação de estoque e disponibilidade.'],
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
      ['Subtotal', moeda(subtotal)],
      ['Descontos', desconto > 0 ? moeda(desconto) : '—'],
      ['Frete', freteValor > 0 ? moeda(freteValor) : '—'],
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
    doc.text('Total da cotação', sx + 6, y + 42)

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
    return `Cotacao_${limparNomeArquivo(farm?.name)}_${new Date().toISOString().slice(0, 10)}.pdf`
  }

  async function gerarPDF() {
    try {
      const doc = buildPDF()
      doc.save(nomeArquivoPDF())
    } catch (e) {
      alert('Erro ao gerar PDF: ' + e.message)
    }
  }

  async function compartilharPDF() {
    try {
      const doc = buildPDF()
      const pdfBlob = doc.output('blob')

      const nomeArq = `cotacoes/cotacao_${id}_${Date.now()}.pdf`

      const { error: upErr } = await supabase
        .storage
        .from('cotacoes')
        .upload(nomeArq, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true,
        })

      if (upErr) {
        alert('Erro ao fazer upload: ' + upErr.message)
        return
      }

      const { data } = supabase
        .storage
        .from('cotacoes')
        .getPublicUrl(nomeArq)

      const url = data.publicUrl

      const msg = encodeURIComponent(
        `Olá. Segue a cotação comercial Nutrialle para análise:\n\n${url}`
      )

      window.open(`https://wa.me/?text=${msg}`, '_blank')
    } catch (e) {
      alert('Erro ao compartilhar: ' + e.message)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-faint)' }}>
        Carregando...
      </div>
    )
  }

  if (!quote) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-faint)' }}>
        Cotação não encontrada
      </div>
    )
  }

  const cfg = STATUS_CFG[quote.status] || STATUS_CFG.rascunho
  const valido = quote.valid_until && new Date(quote.valid_until) >= new Date()

  return (
    <div className="screen-content">
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button
            onClick={() => navigate('/prospeccao')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-faint)',
              padding: 0,
            }}
          >
            ← Voltar
          </button>

          <div style={{ fontWeight: 700, fontSize: 16, flex: 1 }}>
            Cotação
          </div>

          <span
            style={{
              background: cfg.bg,
              color: cfg.color,
              borderRadius: 20,
              padding: '4px 12px',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {cfg.label}
          </span>
        </div>

        <div
          style={{
            background: 'var(--surface-2)',
            borderRadius: 12,
            padding: '12px 14px',
            marginBottom: 16,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 15 }}>
            {farm?.name}
          </div>

          <div
            style={{
              fontSize: 12,
              color: 'var(--text-faint)',
              marginTop: 2,
              textTransform: 'capitalize',
            }}
          >
            {farm?.segment} · {farm?.prospect ? 'Prospecto' : 'Cliente ativo'}
            {farm?.city && ` · ${farm.city}`}
          </div>
        </div>

        {quote.valid_until && (
          <div
            style={{
              fontSize: 12,
              color: valido ? 'var(--text-faint)' : 'var(--red)',
              marginBottom: 16,
              textAlign: 'center',
            }}
          >
            {valido
              ? `Válida até ${new Date(quote.valid_until + 'T12:00:00').toLocaleDateString('pt-BR')}`
              : '⚠️ Cotação expirada'}
          </div>
        )}

        <div style={{ fontWeight: 600, marginBottom: 10 }}>
          Produtos
        </div>

        {(quote.items || []).map((it, i) => (
          <div
            key={i}
            style={{
              background: 'var(--surface-1)',
              border: '1px solid var(--line)',
              borderRadius: 10,
              padding: '10px 12px',
              marginBottom: 8,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>
                  {it.product_name}
                </div>

                <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>
                  {it.quantity} {it.unit} × R$ {fmt(it.unit_price)}
                  {Number(it.discount) > 0 && (
                    <span
                      style={{
                        color: Number(it.discount) > 10 ? 'var(--amber)' : 'var(--green)',
                      }}
                    >
                      {' '}· {it.discount}% desc.
                    </span>
                  )}
                </div>
              </div>

              <div style={{ fontWeight: 700, color: 'var(--orange)', fontSize: 14, whiteSpace: 'nowrap' }}>
                R$ {fmt(it.subtotal)}
              </div>
            </div>
          </div>
        ))}

        <div
          style={{
            background: 'var(--surface-2)',
            borderRadius: 10,
            padding: '12px 14px',
            margin: '16px 0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>
              Total
            </div>

            <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>
              {quote.payment_term_label}
            </div>
          </div>

          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--orange)', whiteSpace: 'nowrap' }}>
            R$ {fmt(quote.total)}
          </div>
        </div>

        {quote.needs_approval && (
          <div
            style={{
              background: 'var(--amber-bg)',
              border: '1px solid var(--amber)',
              borderRadius: 8,
              padding: '8px 12px',
              marginBottom: 16,
              fontSize: 12,
              color: 'var(--amber)',
            }}
          >
            ⚠️ Desconto acima de 10% — aguardando aprovação do gestor
          </div>
        )}

        {quote.notes && (
          <div
            style={{
              fontSize: 12,
              color: 'var(--text-dim)',
              marginBottom: 16,
              padding: '10px 12px',
              background: 'var(--surface-2)',
              borderRadius: 8,
            }}
          >
            <strong>Obs:</strong> {quote.notes}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 40 }}>
          {(quote.status === 'rascunho' || quote.status === 'enviada') && (
            <button
              className="btn btn-ghost"
              onClick={() => navigate(`/prospeccao/${id}/editar`)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontSize: 14,
                padding: '12px 16px',
              }}
            >
              <IconEdit size={15} />
              Editar Cotação
            </button>
          )}

          <button
            className="btn btn-ghost"
            onClick={gerarPDF}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              fontSize: 14,
              padding: '12px 16px',
            }}
          >
            <IconDownload size={15} />
            Baixar PDF
          </button>

          <button
            className="btn btn-primary"
            onClick={compartilharPDF}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              fontSize: 14,
              padding: '12px 16px',
              background: '#0d2e1a',
              color: '#25D366',
              border: '1px solid #1a4a28',
            }}
          >
            <IconBrandWhatsapp size={15} />
            Compartilhar no WhatsApp
          </button>

          {quote.status === 'rascunho' && (
            <button
              className="btn btn-ghost"
              onClick={() => mudarStatus('enviada')}
              disabled={atualizando}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontSize: 14,
                padding: '12px 16px',
              }}
            >
              <IconFileText size={15} />
              Marcar como Enviada
            </button>
          )}

          {(quote.status === 'rascunho' || quote.status === 'enviada') && (
            <button
              className="btn btn-ghost"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontSize: 14,
                padding: '12px 16px',
                color: 'var(--red)',
              }}
              onClick={() => {
                if (window.confirm('Cancelar esta cotação?')) mudarStatus('cancelada')
              }}
            >
              Cancelar cotação
            </button>
          )}

          {(quote.status === 'rascunho' || quote.status === 'enviada') && (
            <button
              className="btn btn-primary"
              onClick={converterEmVenda}
              disabled={atualizando}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontSize: 14,
                padding: '12px 16px',
              }}
            >
              <IconCheck size={15} />
              Converter em Venda
            </button>
          )}
        </div>
      </div>
    </div>
  )
}