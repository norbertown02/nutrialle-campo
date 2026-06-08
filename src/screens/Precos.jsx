import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { IconSearch, IconTag } from '@tabler/icons-react'

function fmt(n) { return Number(n||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}) }

export default function Precos() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [segmento, setSegmento] = useState('todos')

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    const { data } = await supabase.from('products').select('*').eq('active', true).order('name')
    setProducts(data || [])
    setLoading(false)
  }

  const filtrados = products.filter(p =>
    p.name?.toLowerCase().includes(busca.toLowerCase()) &&
    (segmento === 'todos' || p.segment === segmento)
  )

  return (
    <div className="screen-content">
      <div style={{padding:'16px 16px 0'}}>
        <div style={{marginBottom:16}}>
          <div style={{fontSize:18,fontWeight:700}}>Tabela de Preços</div>
          <div style={{fontSize:12,color:'var(--text-faint)'}}>{products.length} produtos ativos</div>
        </div>

        <div style={{display:'flex',gap:8,marginBottom:12}}>
          {['todos','leite','corte','suinos'].map(s=>(
            <button key={s} onClick={()=>setSegmento(s)}
              style={{padding:'6px 12px',borderRadius:20,border:`1px solid ${segmento===s?'var(--orange)':'var(--line)'}`,
                background:segmento===s?'var(--orange-bg)':'var(--surface-2)',
                color:segmento===s?'var(--orange)':'var(--text-faint)',
                fontSize:12,fontWeight:segmento===s?600:400,cursor:'pointer',textTransform:'capitalize'}}>
              {s==='todos'?'Todos':s}
            </button>
          ))}
        </div>

        <div style={{position:'relative',marginBottom:16}}>
          <IconSearch size={14} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--text-faint)'}}/>
          <input value={busca} onChange={e=>setBusca(e.target.value)}
            placeholder="Buscar produto..." style={{width:'100%',paddingLeft:32}}/>
        </div>
      </div>

      {loading ? (
        <div style={{textAlign:'center',padding:40,color:'var(--text-faint)'}}>Carregando...</div>
      ) : filtrados.length === 0 ? (
        <div style={{textAlign:'center',padding:40,color:'var(--text-faint)'}}>
          <IconTag size={32} style={{marginBottom:8,opacity:.3}}/>
          <div>Nenhum produto encontrado</div>
        </div>
      ) : (
        <div style={{padding:'0 16px 100px'}}>
          {filtrados.map(p => (
            <div key={p.id} style={{background:'var(--surface-1)',border:'1px solid var(--line)',borderRadius:12,padding:'12px 14px',marginBottom:8}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,fontSize:14}}>{p.name}</div>
                  <div style={{fontSize:11,color:'var(--text-faint)',marginTop:2,textTransform:'capitalize'}}>
                    {p.segment} · {p.bag_kg||25}kg por saco · desc. máx {p.max_discount||10}%
                  </div>
                </div>
                <span style={{background:'var(--orange-bg)',color:'var(--orange)',borderRadius:6,padding:'2px 6px',fontSize:10,textTransform:'capitalize'}}>
                  {p.segment}
                </span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',paddingTop:8,borderTop:'1px solid var(--line)'}}>
                <div>
                  <div style={{fontSize:11,color:'var(--text-faint)'}}>Preço por saco</div>
                  <div style={{fontSize:20,fontWeight:700,color:'var(--orange)'}}>R$ {fmt(p.price)}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:11,color:'var(--text-faint)'}}>Preço por kg</div>
                  <div style={{fontSize:14,fontWeight:600,color:'var(--text-dim)'}}>
                    R$ {p.price_kg ? fmt(p.price_kg) : p.bag_kg ? fmt(p.price/p.bag_kg) : '—'}/kg
                  </div>
                </div>
              </div>
              {p.description && (
                <div style={{fontSize:11,color:'var(--text-dim)',marginTop:8,paddingTop:8,borderTop:'1px solid var(--line)'}}>
                  {p.description}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
