import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { IconSearch, IconTag } from '@tabler/icons-react'

function fmt(n) { return Number(n||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}) }

export default function Precos() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    const { data } = await supabase.from('products').select('*').eq('active', true).order('name')
    setProducts(data || [])
    setLoading(false)
  }

  const filtrados = products.filter(p =>
    p.name?.toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <div className="screen-content">
      <div style={{padding:'16px 16px 0'}}>
        <div style={{marginBottom:16}}>
          <div style={{fontSize:18,fontWeight:700}}>Tabela de Preços</div>
          <div style={{fontSize:12,color:'var(--text-faint)'}}>{products.length} produtos ativos</div>
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
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,fontSize:14}}>{p.name}</div>
                  <div style={{fontSize:11,color:'var(--text-faint)',marginTop:2}}>
                    {p.unit || 'un'} · desc. máx {p.max_discount || 10}%
                  </div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:18,fontWeight:700,color:'var(--orange)'}}>
                    R$ {fmt(p.price)}
                  </div>
                  <div style={{fontSize:10,color:'var(--text-faint)'}}>por {p.unit||'un'}</div>
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
