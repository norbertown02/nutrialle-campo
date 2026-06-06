import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/useAuth.jsx'
import { IconFileText, IconCheck, IconX, IconEdit, IconDownload } from '@tabler/icons-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import logoB64 from '../assets/logo-b64.txt?raw'

function fmt(n) { return Number(n||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}) }
function fmtK(n) { if(n>=1000000) return `R$ ${(n/1000000).toFixed(1)}M`; if(n>=1000) return `R$ ${(n/1000).toFixed(1)}k`; return `R$ ${fmt(n)}` }

const STATUS_CFG = {
  rascunho:   { label: 'Rascunho',   color: 'var(--text-faint)', bg: 'var(--surface-2)' },
  enviada:    { label: 'Enviada',    color: 'var(--amber)',      bg: 'var(--amber-bg)'   },
  convertida: { label: 'Convertida', color: 'var(--green)',      bg: 'var(--green-bg)'   },
  cancelada:  { label: 'Cancelada',  color: 'var(--red)',        bg: 'var(--red-bg)'     },
}

export default function DetalheCotacao() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [quote, setQuote] = useState(null)
  const [farm, setFarm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [atualizando, setAtualizando] = useState(false)

  useEffect(() => { carregar() }, [id])

  async function carregar() {
    setLoading(true)
    const { data: q } = await supabase.from('quotes').select('*').eq('id', id).single()
    if (q) {
      setQuote(q)
      const { data: f } = await supabase.from('farms').select('*').eq('id', q.farm_id).single()
      setFarm(f)
    }
    setLoading(false)
  }

  async function mudarStatus(status) {
    setAtualizando(true)
    await supabase.from('quotes').update({ status }).eq('id', id)
    setQuote(prev => ({ ...prev, status }))
    setAtualizando(false)
  }

  async function converterEmVenda() {
    if (!confirm('Converter esta cotação em venda?')) return
    setAtualizando(true)

    // Cria venda
    const venda = {
      farm_id: quote.farm_id,
      seller_id: quote.seller_id,
      sale_date: new Date().toISOString().split('T')[0],
      items: quote.items,
      payment_term: quote.payment_term,
      payment_term_label: quote.payment_term_label,
      total: quote.total,
      status: 'enviado',
      needs_approval: quote.needs_approval,
      notes: quote.notes,
    }
    await supabase.from('sales').insert(venda)

    // Atualiza cotação
    await supabase.from('quotes').update({ status: 'convertida', converted_at: new Date().toISOString() }).eq('id', id)

    // Se era prospecto, ativa a fazenda
    if (farm?.prospect) {
      await supabase.from('farms').update({ prospect: false }).eq('id', quote.farm_id)
    }

    setQuote(prev => ({ ...prev, status: 'convertida' }))
    setAtualizando(false)
    alert('Venda criada com sucesso!')
    navigate('/vendas')
  }

  async function gerarPDF() {
    const doc = new jsPDF('p', 'mm', 'a4')
    const W = 210, M = 16
    const OG = [240, 125, 26]
    const BG = [18, 18, 18]
    const W1 = [255, 255, 255]
    const GY = [160, 160, 160]

    // Fundo escuro
    doc.setFillColor(...BG)
    doc.rect(0, 0, W, 297, 'F')
    doc.setFillColor(...OG)
    doc.rect(0, 0, 5, 297, 'F')

    // Logo
    try { doc.addImage('data:image/jpeg;base64,' + logoB64, 'JPEG', M, 12, 14, 14) } catch(e) {}

    // Cabeçalho
    doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(...W1)
    doc.text('NUTRIALLE', M + 18, 19)
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GY)
    doc.text('Nutrição Animal', M + 18, 24)

    doc.setFontSize(9); doc.setTextColor(...GY)
    doc.text('COTAÇÃO COMERCIAL', W - M, 19, { align: 'right' })
    doc.setFontSize(7)
    doc.text(`Emitida em ${new Date().toLocaleDateString('pt-BR')}`, W - M, 24, { align: 'right' })
    doc.text(`Válida até ${new Date(quote.valid_until + 'T12:00:00').toLocaleDateString('pt-BR')}`, W - M, 28, { align: 'right' })

    doc.setDrawColor(...OG); doc.setLineWidth(0.5)
    doc.line(M, 32, W - M, 32)

    // Dados do cliente
    let y = 40
    doc.setFillColor(28, 28, 28); doc.roundedRect(M, y, W - M * 2, 28, 3, 3, 'F')
    doc.setFontSize(7); doc.setTextColor(...OG); doc.setFont('helvetica', 'bold')
    doc.text('CLIENTE', M + 6, y + 7)
    doc.setTextColor(...W1); doc.setFontSize(12); doc.setFont('helvetica', 'bold')
    doc.text(farm?.name || '—', M + 6, y + 14)
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GY)
    const infos = [farm?.segment && farm.segment.charAt(0).toUpperCase() + farm.segment.slice(1), farm?.city && `${farm.city}${farm.state ? '/' + farm.state : ''}`, farm?.prospect ? 'Prospecto' : 'Cliente ativo'].filter(Boolean)
    doc.text(infos.join('  ·  '), M + 6, y + 21)

    // Vendedor
    doc.setFontSize(7); doc.setTextColor(...GY)
    doc.text(`Vendedor: ${user?.name || '—'}`, W - M - 4, y + 21, { align: 'right' })

    y += 36

    // Tabela de produtos
    autoTable(doc, {
      startY: y,
      head: [['Produto', 'Unid.', 'Qtd.', 'Preço Unit.', 'Desc.%', 'Subtotal']],
      body: (quote.items || []).map(it => [
        it.product_name,
        it.unit || 'kg',
        it.quantity,
        `R$ ${fmt(it.unit_price)}`,
        `${it.discount || 0}%`,
        `R$ ${fmt(it.subtotal)}`,
      ]),
      theme: 'grid',
      headStyles: { fillColor: [35, 35, 35], textColor: OG, fontSize: 8, fontStyle: 'bold', lineColor: [50, 50, 50] },
      bodyStyles: { fontSize: 8, textColor: W1, fillColor: [22, 22, 22], lineColor: [38, 38, 38], cellPadding: 4 },
      alternateRowStyles: { fillColor: [28, 28, 28] },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 18, halign: 'center' },
        2: { cellWidth: 18, halign: 'center' },
        3: { cellWidth: 30, halign: 'right' },
        4: { cellWidth: 18, halign: 'center' },
        5: { cellWidth: 30, halign: 'right', fontStyle: 'bold', textColor: OG },
      },
      margin: { left: M, right: M },
    })

    y = doc.lastAutoTable.finalY + 8

    // Total
    doc.setFillColor(35, 35, 35); doc.roundedRect(W - M - 70, y, 70, 18, 2, 2, 'F')
    doc.setFontSize(8); doc.setTextColor(...GY); doc.setFont('helvetica', 'normal')
    doc.text('TOTAL DA COTAÇÃO', W - M - 35, y + 6, { align: 'center' })
    doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(...OG)
    doc.text(`R$ ${fmt(quote.total)}`, W - M - 35, y + 13, { align: 'center' })

    // Condição de pagamento
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GY)
    doc.text(`Condição: ${quote.payment_term_label || '—'}`, M, y + 8)
    doc.text(`Validade: ${new Date(quote.valid_until + 'T12:00:00').toLocaleDateString('pt-BR')}`, M, y + 14)

    if (quote.notes) {
      y += 26
      doc.setFontSize(7); doc.setTextColor(...GY)
      doc.text('Observações: ' + quote.notes, M, y, { maxWidth: W - M * 2 })
    }

    // Rodapé
    doc.setFillColor(...OG); doc.rect(0, 285, W, 12, 'F')
    doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(...W1)
    doc.text('Nutrialle Nutrição Animal', M, 292)
    doc.setFont('helvetica', 'normal')
    doc.text(`Vendedor: ${user?.name || seller?.name || '—'}`, W - M, 292, { align: 'right' })

    doc.save(`Cotacao_${farm?.name?.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.pdf`)
  }

  if (loading) return <div style={{padding:40,textAlign:'center',color:'var(--text-faint)'}}>Carregando...</div>
  if (!quote) return <div style={{padding:40,textAlign:'center',color:'var(--text-faint)'}}>Cotação não encontrada</div>

  const cfg = STATUS_CFG[quote.status] || STATUS_CFG.rascunho
  const valido = quote.valid_until && new Date(quote.valid_until) >= new Date()

  return (
    <div className="screen-content">
      <div style={{padding:16}}>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
          <button onClick={() => navigate('/prospeccao')} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-faint)',padding:0}}>← Voltar</button>
          <div style={{fontWeight:700,fontSize:16,flex:1}}>Cotação</div>
          <span style={{background:cfg.bg,color:cfg.color,borderRadius:20,padding:'4px 12px',fontSize:12,fontWeight:600}}>{cfg.label}</span>
        </div>

        {/* Cliente */}
        <div style={{background:'var(--surface-2)',borderRadius:12,padding:'12px 14px',marginBottom:16}}>
          <div style={{fontWeight:700,fontSize:15}}>{farm?.name}</div>
          <div style={{fontSize:12,color:'var(--text-faint)',marginTop:2,textTransform:'capitalize'}}>
            {farm?.segment} · {farm?.prospect ? 'Prospecto' : 'Cliente ativo'}
            {farm?.city && ` · ${farm.city}`}
          </div>
        </div>

        {/* Validade */}
        {quote.valid_until && (
          <div style={{fontSize:12,color: valido ? 'var(--text-faint)' : 'var(--red)',marginBottom:16,textAlign:'center'}}>
            {valido ? `Válida até ${new Date(quote.valid_until+'T12:00:00').toLocaleDateString('pt-BR')}` : '⚠️ Cotação expirada'}
          </div>
        )}

        {/* Itens */}
        <div style={{fontWeight:600,marginBottom:10}}>Produtos</div>
        {(quote.items || []).map((it, i) => (
          <div key={i} style={{background:'var(--surface-1)',border:'1px solid var(--line)',borderRadius:10,padding:'10px 12px',marginBottom:8}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
              <div>
                <div style={{fontWeight:600,fontSize:13}}>{it.product_name}</div>
                <div style={{fontSize:11,color:'var(--text-faint)',marginTop:2}}>
                  {it.quantity} {it.unit} × R$ {fmt(it.unit_price)}
                  {Number(it.discount) > 0 && <span style={{color: Number(it.discount)>10 ? 'var(--amber)' : 'var(--green)'}}> · {it.discount}% desc.</span>}
                </div>
              </div>
              <div style={{fontWeight:700,color:'var(--orange)',fontSize:14}}>R$ {fmt(it.subtotal)}</div>
            </div>
          </div>
        ))}

        {/* Total */}
        <div style={{background:'var(--surface-2)',borderRadius:10,padding:'12px 14px',margin:'16px 0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <div style={{fontSize:12,color:'var(--text-faint)'}}>Total</div>
            <div style={{fontSize:11,color:'var(--text-faint)'}}>{quote.payment_term_label}</div>
          </div>
          <div style={{fontSize:22,fontWeight:700,color:'var(--orange)'}}>R$ {fmt(quote.total)}</div>
        </div>

        {quote.needs_approval && (
          <div style={{background:'var(--amber-bg)',border:'1px solid var(--amber)',borderRadius:8,padding:'8px 12px',marginBottom:16,fontSize:12,color:'var(--amber)'}}>
            ⚠️ Desconto acima de 10% — aguardando aprovação do gestor
          </div>
        )}

        {quote.notes && (
          <div style={{fontSize:12,color:'var(--text-dim)',marginBottom:16,padding:'10px 12px',background:'var(--surface-2)',borderRadius:8}}>
            <strong>Obs:</strong> {quote.notes}
          </div>
        )}

        {/* Ações */}
        <div style={{display:'flex',flexDirection:'column',gap:10,paddingBottom:40}}>
          <button className="btn btn-ghost" onClick={gerarPDF} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
            <IconDownload size={15}/> Gerar PDF
          </button>

          {quote.status === 'rascunho' && (
            <button className="btn btn-ghost" onClick={() => mudarStatus('enviada')} disabled={atualizando}
              style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
              <IconFileText size={15}/> Marcar como Enviada
            </button>
          )}

          {(quote.status === 'rascunho' || quote.status === 'enviada') && (
            <button className="btn btn-primary" onClick={converterEmVenda} disabled={atualizando}
              style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
              <IconCheck size={15}/> Converter em Venda
            </button>
          )}

          {quote.status !== 'convertida' && quote.status !== 'cancelada' && (
            <button onClick={() => mudarStatus('cancelada')} disabled={atualizando}
              style={{background:'none',border:'none',color:'var(--red)',cursor:'pointer',fontSize:13,padding:'8px 0',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
              <IconX size={14}/> Cancelar cotação
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
