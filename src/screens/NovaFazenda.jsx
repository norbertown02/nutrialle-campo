import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconArrowLeft, IconCheck, IconMapPin, IconX } from '@tabler/icons-react'
import { useFarms } from '../lib/useFarms'
import { useConfig } from '../lib/useConfig'

async function buscarCidades(termo, uf) {
  if (termo.length < 2) return []
  try {
    const url = uf
      ? `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`
      : `https://servicodados.ibge.gov.br/api/v1/localidades/municipios`
    const res  = await fetch(url)
    const data = await res.json()
    return data
      .filter(m => m.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
        .includes(termo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')))
      .slice(0, 8)
      .map(m => ({ nome: m.nome, uf: m.microrregiao.mesorregiao.UF.sigla }))
  } catch { return [] }
}

function CidadeInput({ value, uf, onChange, onSelectCity }) {
  const [sugestoes,  setSugestoes]  = useState([])
  const [aberto,     setAberto]     = useState(false)
  const [carregando, setCarregando] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (value.length < 2) { setSugestoes([]); setAberto(false); return }
    setCarregando(true)
    timerRef.current = setTimeout(async () => {
      const cidades = await buscarCidades(value, uf)
      setSugestoes(cidades)
      setAberto(cidades.length > 0)
      setCarregando(false)
    }, 400)
    return () => clearTimeout(timerRef.current)
  }, [value, uf])

  function selecionar(cidade) {
    onSelectCity(cidade.nome, cidade.uf)
    setSugestoes([])
    setAberto(false)
  }

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <IconMapPin size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-faint)' }} />
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => sugestoes.length > 0 && setAberto(true)}
          onBlur={() => setTimeout(() => setAberto(false), 200)}
          placeholder="Digite a cidade..."
          style={{ paddingLeft: 30 }}
        />
        {carregando && (
          <span style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', fontSize:10, color:'var(--text-faint)' }}>
            buscando...
          </span>
        )}
        {value && !carregando && (
          <button type="button" onClick={() => { onChange(''); setSugestoes([]); setAberto(false) }}
            style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--text-faint)', padding:2 }}>
            <IconX size={13} />
          </button>
        )}
      </div>

      {aberto && sugestoes.length > 0 && (
        <div style={{
          position:'absolute', top:'100%', left:0, right:0, zIndex:100,
          background:'var(--surface)', border:'1px solid var(--line)',
          borderRadius:10, marginTop:4, overflow:'hidden',
          boxShadow:'0 4px 16px rgba(0,0,0,0.3)'
        }}>
          {sugestoes.map((c, i) => (
            <button key={i} type="button" onMouseDown={() => selecionar(c)} style={{
              width:'100%', padding:'10px 14px', background:'none', border:'none',
              cursor:'pointer', textAlign:'left',
              borderBottom: i < sugestoes.length-1 ? '1px solid var(--line-soft)' : 'none',
              display:'flex', alignItems:'center', justifyContent:'space-between',
              fontFamily:'inherit',
            }}>
              <span style={{ fontSize:13, color:'var(--text)' }}>{c.nome}</span>
              <span style={{ fontSize:11, color:'var(--text-faint)', background:'var(--surface-2)', padding:'2px 6px', borderRadius:4 }}>{c.uf}</span>
            </button>
          ))}
          <div style={{ padding:'6px 14px', fontSize:10, color:'var(--text-faint)', borderTop:'1px solid var(--line-soft)' }}>
            Fonte: IBGE — nome oficial do município
          </div>
        </div>
      )}
    </div>
  )
}

export default function NovaFazenda() {
  const navigate = useNavigate()
  const { addFarm } = useFarms()
  const { SEGMENT_OPTIONS, STATES, inferRegion } = useConfig()

  const [form, setForm] = useState({
    name:'', owner:'', ownerRole:'Proprietário', phone:'',
    docTipo:'cpf', cpf:'', cnpj:'', cadpro1:'', cadpro2:'', cadpro3:'',
    segment:'leite', city:'', state:'PR', cep:'', street:'', street_number:'',
    herdSize:'', production:'', area:'',
  })

  const [cidadeVerificada, setCidadeVerificada] = useState(false)

  function maskCPF(v) {
    return v.replace(/\D/g,'').slice(0,11)
      .replace(/(\d{3})(\d)/,'$1.$2')
      .replace(/(\d{3})(\d)/,'$1.$2')
      .replace(/(\d{3})(\d{1,2})$/,'$1-$2')
  }

  function maskCNPJ(v) {
    return v.replace(/\D/g,'').slice(0,14)
      .replace(/(\d{2})(\d)/,'$1.$2')
      .replace(/(\d{3})(\d)/,'$1.$2')
      .replace(/(\d{3})(\d)/,'$1/$2')
      .replace(/(\d{4})(\d{1,2})$/,'$1-$2')
  }

  const setField = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  function onSelectCity(nome, uf) {
    setForm(prev => ({ ...prev, city: nome, state: uf }))
    setCidadeVerificada(true)
  }

  const isValid = form.name.trim().length >= 3 && form.owner.trim().length >= 3 && form.city.trim().length >= 2 && cidadeVerificada

  const handleSave = () => {
    if (!isValid) return
    addFarm({
      name: form.name.trim(), owner: form.owner.trim(), ownerRole: form.ownerRole,
      phone: form.phone.trim(), segment: form.segment,
      doc_tipo: form.docTipo, cpf: form.cpf||null, cnpj: form.cnpj||null,
      cadpro_1: form.cadpro1||null, cadpro_2: form.cadpro2||null, cadpro_3: form.cadpro3||null,
      city: form.city.trim(), state: form.state,
      cep: form.cep?.trim(), street: form.street?.trim(), street_number: form.street_number?.trim(),
      region: inferRegion(form.city, form.state),
      herdSize: form.herdSize.trim(), production: form.production.trim(), area: form.area.trim(),
    })
    navigate('/clientes')
  }

  return (
    <div className="content">
      <button onClick={() => navigate(-1)} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--text-dim)',fontSize:13,fontWeight:500,display:'flex',alignItems:'center',gap:4,padding:0,marginBottom:14,fontFamily:'inherit' }}>
        <IconArrowLeft size={16} /> Voltar
      </button>

      <div className="page-head">
        <div className="eyebrow">Nova fazenda</div>
        <h2>Cadastrar cliente</h2>
        <p>Preencha os dados básicos. Você pode completar depois.</p>
      </div>

      <div className="section-label">Identificação</div>

      <Field label="Nome da fazenda *">
        <input value={form.name} onChange={e => setField('name', e.target.value)} placeholder="Ex.: Fazenda Boa Vista" />
      </Field>

      <Field label="Nome do produtor *">
        <input value={form.owner} onChange={e => setField('owner', e.target.value)} placeholder="Ex.: João Marquezini" />
      </Field>

      <Field label="Cargo / função">
        <select value={form.ownerRole} onChange={e => setField('ownerRole', e.target.value)}>
          <option>Proprietário</option><option>Gerente</option><option>Sócio</option>
          <option>Encarregado</option><option>Familiar</option>
        </select>
      </Field>

      <Field label="Telefone / WhatsApp">
        <input value={form.phone} onChange={e => setField('phone', e.target.value)} placeholder="(45) 99000-0000" inputMode="tel" />
      </Field>

      <div className="section-label">Documentos</div>

      <Field label="Tipo de documento">
        <div style={{ display:'flex', gap:6, marginBottom:10 }}>
          {[{v:'cpf',l:'CPF (Pessoa Física)'},{v:'cnpj',l:'CNPJ (Pessoa Jurídica)'}].map(opt=>(
            <button key={opt.v} type="button" onClick={()=>{ setField('docTipo',opt.v); setField('cpf',''); setField('cnpj','') }} style={{
              flex:1, padding:'10px 8px', borderRadius:10,
              border:'1px solid '+(form.docTipo===opt.v?'var(--orange)':'var(--line)'),
              background:form.docTipo===opt.v?'rgba(240,125,26,0.08)':'var(--surface-2)',
              color:form.docTipo===opt.v?'var(--orange)':'var(--text-dim)',
              fontFamily:'inherit', fontSize:12, fontWeight:600, cursor:'pointer'
            }}>{opt.l}</button>
          ))}
        </div>
      </Field>

      {form.docTipo==='cpf' ? (
        <>
          <Field label="CPF">
            <input value={form.cpf} onChange={e=>setField('cpf',maskCPF(e.target.value))} placeholder="000.000.000-00" inputMode="numeric"/>
          </Field>
          <Field label="CAD/PRO 1 (Cadastro de Produtor Rural)">
            <input value={form.cadpro1} onChange={e=>setField('cadpro1',e.target.value)} placeholder="Número do CAD/PRO"/>
          </Field>
          <Field label="CAD/PRO 2 (opcional)">
            <input value={form.cadpro2} onChange={e=>setField('cadpro2',e.target.value)} placeholder="Número do CAD/PRO"/>
          </Field>
          <Field label="CAD/PRO 3 (opcional)">
            <input value={form.cadpro3} onChange={e=>setField('cadpro3',e.target.value)} placeholder="Número do CAD/PRO"/>
          </Field>
        </>
      ) : (
        <Field label="CNPJ">
          <input value={form.cnpj} onChange={e=>setField('cnpj',maskCNPJ(e.target.value))} placeholder="00.000.000/0000-00" inputMode="numeric"/>
        </Field>
      )}

      <div className="section-label">Segmento e localização</div>

      <Field label="Segmento *">
        <div style={{ display:'flex', gap:6 }}>
          {SEGMENT_OPTIONS.map(opt => (
            <button key={opt.value} type="button" onClick={() => setField('segment', opt.value)} style={{
              flex:1, padding:'12px 8px', borderRadius:10,
              border:'1px solid '+(form.segment===opt.value?'var(--orange)':'var(--line)'),
              background:form.segment===opt.value?'rgba(240,125,26,0.08)':'var(--surface-2)',
              color:form.segment===opt.value?'var(--orange)':'var(--text-dim)',
              fontFamily:'inherit', fontSize:12, fontWeight:600, cursor:'pointer'
            }}>
              {opt.label.replace('Bovinos · ', '')}
            </button>
          ))}
        </div>
      </Field>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:10 }}>
        <Field label="UF *">
          <select value={form.state} onChange={e => { setField('state', e.target.value); setField('city', ''); setCidadeVerificada(false) }}>
            {STATES.map(s => <option key={s.value} value={s.value}>{s.value}</option>)}
          </select>
        </Field>
        <Field label="Cidade *">
          <CidadeInput
            value={form.city}
            uf={form.state}
            onChange={v => { setField('city', v); setCidadeVerificada(false) }}
            onSelectCity={onSelectCity}
          />
        </Field>
      </div>

      {form.city && (
        <div style={{ fontSize:11, color: cidadeVerificada ? 'var(--text-faint)' : 'var(--red)', marginTop:-8, marginBottom:12, display:'flex', alignItems:'center', gap:4 }}>
          <IconMapPin size={11} />
          {cidadeVerificada
            ? `${form.city}, ${form.state} · verificado pelo IBGE`
            : 'Selecione uma cidade da lista para validar'}
        </div>
      )}

      <div className="section-label">Endereço</div>

      <Field label="CEP">
        <input value={form.cep||''} onChange={e => setField('cep', e.target.value)} placeholder="Ex.: 85900-000" maxLength={9}/>
      </Field>

      <Field label="Rua / Logradouro">
        <input value={form.street||''} onChange={e => setField('street', e.target.value)} placeholder="Ex.: Rua das Palmeiras"/>
      </Field>

      <Field label="Número">
        <input value={form.street_number||''} onChange={e => setField('street_number', e.target.value)} placeholder="Ex.: 123"/>
      </Field>

      <div className="section-label">Dados da operação</div>

      <Field label="Tamanho do rebanho">
        <input value={form.herdSize} onChange={e => setField('herdSize', e.target.value)}
          placeholder={form.segment==='leite'?'Ex.: 180 vacas em lactação':form.segment==='corte'?'Ex.: 450 cabeças':'Ex.: 320 matrizes'} />
      </Field>

      <Field label="Produção atual">
        <input value={form.production} onChange={e => setField('production', e.target.value)}
          placeholder={form.segment==='leite'?'Ex.: 4.200 L/dia':form.segment==='corte'?'Ex.: 30 arrobas/cabeça':'Ex.: 28 desmamados/matriz/ano'} />
      </Field>

      <div className="hint" style={{ marginTop:18 }}>
        Campos com * são obrigatórios. A cidade é validada automaticamente pelo IBGE.
      </div>

      <button className="btn btn-primary" style={{ marginTop:18, opacity:isValid?1:0.45, cursor:isValid?'pointer':'not-allowed' }}
        disabled={!isValid} onClick={handleSave}>
        <IconCheck size={18} /> Cadastrar fazenda
      </button>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom:12 }}>
      <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-dim)', marginBottom:6, letterSpacing:0.3 }}>
        {label}
      </label>
      {children}
    </div>
  )
}
