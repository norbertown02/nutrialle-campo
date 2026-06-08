import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconArrowLeft, IconCheck, IconRoute, IconBell } from '@tabler/icons-react'
import { useFarms } from '../lib/useFarms'
import { useAppointments } from '../lib/useAppointments'

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

const backBtnStyle = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: 'var(--text-dim)', fontSize: 13, fontWeight: 500,
  display: 'flex', alignItems: 'center', gap: 4,
  padding: 0, marginBottom: 14, fontFamily: 'inherit'
}

export default function NovoCompromisso() {
  const navigate = useNavigate()
  const { farms } = useFarms()
  const { addAppointment } = useAppointments()

  const [kind, setKind] = useState('visita') // visita | lembrete
  const [title, setTitle] = useState('')
  const [appointmentDate, setAppointmentDate] = useState(todayISO())
  const [appointmentTime, setAppointmentTime] = useState('')
  const [farmId, setFarmId] = useState('')
  const [notes, setNotes] = useState('')

  const isValid = title.trim().length >= 3 && appointmentDate

  const handleSave = () => {
    if (!isValid) return
    addAppointment({
      title: title.trim(),
      appointmentDate,
      appointmentTime: appointmentTime || null,
      farmId: kind === 'visita' ? (farmId || null) : null,
      notes: notes.trim(),
      kind, // 'visita' ou 'lembrete'
    })
    navigate('/agenda')
  }

  return (
    <div className="content">
      <button onClick={() => navigate(-1)} style={backBtnStyle}>
        <IconArrowLeft size={16} /> Voltar
      </button>

      <div className="page-head">
        <div className="eyebrow">Novo compromisso</div>
        <h2>Adicionar compromisso</h2>
      </div>

      {/* Tipo */}
      <div className="section-label">Tipo</div>
      <div style={{display:'flex',gap:10,marginBottom:18}}>
        <button onClick={()=>setKind('visita')}
          style={{flex:1,padding:'12px 8px',borderRadius:12,border:`2px solid ${kind==='visita'?'var(--orange)':'var(--line)'}`,
            background:kind==='visita'?'var(--orange-bg)':'var(--surface-2)',cursor:'pointer',
            display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
          <IconRoute size={20} color={kind==='visita'?'var(--orange)':'var(--text-faint)'}/>
          <span style={{fontSize:13,fontWeight:600,color:kind==='visita'?'var(--orange)':'var(--text-dim)'}}>Visita</span>
          <span style={{fontSize:10,color:'var(--text-faint)',textAlign:'center'}}>Conta como visita do dia</span>
        </button>
        <button onClick={()=>setKind('lembrete')}
          style={{flex:1,padding:'12px 8px',borderRadius:12,border:`2px solid ${kind==='lembrete'?'var(--orange)':'var(--line)'}`,
            background:kind==='lembrete'?'var(--orange-bg)':'var(--surface-2)',cursor:'pointer',
            display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
          <IconBell size={20} color={kind==='lembrete'?'var(--orange)':'var(--text-faint)'}/>
          <span style={{fontSize:13,fontWeight:600,color:kind==='lembrete'?'var(--orange)':'var(--text-dim)'}}>Lembrete</span>
          <span style={{fontSize:10,color:'var(--text-faint)',textAlign:'center'}}>Só aparece em compromissos</span>
        </button>
      </div>

      {/* Título */}
      <div className="section-label">Descrição *</div>
      <div style={{marginBottom:14}}>
        <input value={title} onChange={e=>setTitle(e.target.value)}
          placeholder={kind==='visita'?'Ex.: Visita de acompanhamento':'Ex.: Ligar para cliente, Preparar proposta'}/>
      </div>

      {/* Fazenda — só para visita */}
      {kind === 'visita' && farms.length > 0 && (
        <>
          <div className="section-label">Fazenda (opcional)</div>
          <div style={{marginBottom:14}}>
            <select value={farmId} onChange={e=>setFarmId(e.target.value)}>
              <option value="">Sem fazenda específica</option>
              {farms.map(f=>(
                <option key={f.id} value={f.id}>{f.name} - {f.city}</option>
              ))}
            </select>
          </div>
        </>
      )}

      {/* Data e hora */}
      <div className="section-label">Quando</div>
      <div style={{display:'grid',gridTemplateColumns:'1.3fr 1fr',gap:10,marginBottom:14}}>
        <div>
          <label style={{display:'block',fontSize:12,fontWeight:600,color:'var(--text-dim)',marginBottom:6}}>Data *</label>
          <input type="date" value={appointmentDate} onChange={e=>setAppointmentDate(e.target.value)}/>
        </div>
        <div>
          <label style={{display:'block',fontSize:12,fontWeight:600,color:'var(--text-dim)',marginBottom:6}}>Horário</label>
          <input type="time" value={appointmentTime} onChange={e=>setAppointmentTime(e.target.value)}/>
        </div>
      </div>

      {/* Notas */}
      <div className="section-label">Observações</div>
      <div style={{marginBottom:18}}>
        <textarea value={notes} onChange={e=>setNotes(e.target.value)}
          placeholder="Detalhes, contexto, o que preparar..."
          style={{minHeight:80}}/>
      </div>

      <button className="btn btn-primary" onClick={handleSave} disabled={!isValid}
        style={{opacity:isValid?1:0.45,cursor:isValid?'pointer':'not-allowed'}}>
        <IconCheck size={18}/> Salvar compromisso
      </button>
    </div>
  )
}
