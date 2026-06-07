import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { IconArrowLeft, IconCheck, IconClock } from '@tabler/icons-react'

function fmt(n) { return Number(n||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}) }

export default function DetalheVenda() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [venda, setVenda] = useState(null)
  const [farm, setFarm] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { carregar() }, [id])

  async function carregar() {
    setLoading(true)
    const { data: v } = await supabase.from('sales').select('*').eq('id', id).single()
    if (v) {
      setVenda(v)
      const { data: f } = await supabase.from('farms').select('*').eq('id', v.farm_id).single()
      setFarm(f)
    }
    setLoading(false)
  }

  if (loading) return <div style={{padding:40,textAlign:'center',color:'var(--text-faint)'}}>Carregando...</div>
  if (!venda) return <div style={{padding:40,textAlign:'center',color:'var(--text-faint)'}}>Venda não encontrada</div>

  const enviada = venda.status === 'enviado'

  return (
    <div className="screen-content">
      <div style={{padding:16,paddingBottom:40}}>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
          <button onClick={() => navigate(-1)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-faint)',padding:0}}>
            <IconArrowLeft size={18}/>
          </button>
          <div style={{fontWeight:700,fontSize:16,flex:1}}>Detalhe da Venda</div>
          <span style={{
            background: enviada ? 'var(--green-bg)' : 'var(--amber-bg)',
            color: enviada ? 'var(--green)' : 'var(--amber)',
            borderRadius:20, padding:'4px 12px', fontSize:11, fontWeight:600,
            display:'flex', alignItems:'center', gap:4
          }}>
            {enviada ? <IconCheck size={11}/> : <IconClock size={11}/>}
            {enviada ? 'Enviada' : 'Pendente'}
          </span>
        </div>

        {/* Fazenda */}
        <div style={{background:'var(--surface-2)',borderRadius:12,padding:'12px 14px',marginBottom:16}}>
          <div style={{fontSize:11,color:'var(--text-faint)',marginBottom:4}}>Cliente</div>
          <div style={{fontWeight:700,fontSize:15}}>{farm?.name || '—'}</div>
          <div style={{fontSize:12,color:'var(--text-faint)',marginTop:2,textTransform:'capitalize'}}>
            {farm?.segment}
            {farm?.city && ` · ${farm.city}${farm.state ? '/' + farm.state : ''}`}
          </div>
          {farm?.cpf_cnpj && <div style={{fontSize:11,color:'var(--text-faint)',marginTop:2}}>CPF/CNPJ: {farm.cpf_cnpj}</div>}
          {farm?.cad_pro && <div style={{fontSize:11,color:'var(--text-faint)'}}>CAD/PRO: {farm.cad_pro}</div>}
        </div>

        {/* Info da venda */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
          <div style={{background:'var(--surface-2)',borderRadius:10,padding:'10px 12px'}}>
            <div style={{fontSize:11,color:'var(--text-faint)',marginBottom:4}}>Data</div>
            <div style={{fontWeight:600,fontSize:13}}>
              {new Date(venda.sale_date+'T12:00:00').toLocaleDateString('pt-BR')}
            </div>
          </div>
          <div style={{background:'var(--surface-2)',borderRadius:10,padding:'10px 12px'}}>
            <div style={{fontSize:11,color:'var(--text-faint)',marginBottom:4}}>Pagamento</div>
            <div style={{fontWeight:600,fontSize:13}}>{venda.payment_term_label || '—'}</div>
          </div>
        </div>

        {/* Itens */}
        <div style={{fontWeight:600,marginBottom:10}}>Produtos</div>
        {(venda.items || []).map((it, i) => (
          <div key={i} style={{background:'var(--surface-1)',border:'1px solid var(--line)',borderRadius:10,padding:'10px 12px',marginBottom:8}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
              <div>
                <div style={{fontWeight:600,fontSize:13}}>{it.productName || it.product_name}</div>
                <div style={{fontSize:11,color:'var(--text-faint)',marginTop:2}}>
                  {it.quantity} {it.unit || ''} × R$ {fmt(it.unitPrice || it.unit_price)}
                  {Number(it.discount) > 0 && (
                    <span style={{color:'var(--green)'}}> · {it.discount}% desc.</span>
                  )}
                </div>
              </div>
              <div style={{fontWeight:700,color:'var(--orange)',fontSize:14}}>
                R$ {fmt(it.subtotal)}
              </div>
            </div>
          </div>
        ))}

        {/* Total */}
        <div style={{background:'var(--surface-2)',borderRadius:10,padding:'14px 16px',marginTop:16,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{fontSize:13,color:'var(--text-faint)'}}>Total da venda</div>
          <div style={{fontSize:22,fontWeight:700,color:'var(--orange)'}}>R$ {fmt(venda.total)}</div>
        </div>

        {venda.needs_approval && (
          <div style={{marginTop:12,background:'var(--amber-bg)',border:'1px solid var(--amber)',borderRadius:8,padding:'8px 12px',fontSize:12,color:'var(--amber)'}}>
            ⚠️ Desconto acima de 10% — aguardando aprovação do gestor
          </div>
        )}
      </div>
    </div>
  )
}
