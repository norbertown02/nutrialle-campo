import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { IconArrowLeft, IconBell, IconCalendar, IconCheck, IconClock, IconMapPin, IconRoute } from '@tabler/icons-react'
import { useFarms } from '../lib/useFarms'
import { useAppointments } from '../lib/useAppointments'
import { hojeLocal, deslocarData, formatarDia } from '../lib/agendaUtils'
import '../styles/agenda-nova.css'

export default function NovoCompromisso() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const preselected = params.get('farm') || ''
  const { farms } = useFarms()
  const { addAppointment } = useAppointments()

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [kind, setKind] = useState('visita')
  const [title, setTitle] = useState(preselected ? 'Visita de acompanhamento' : '')
  const [date, setDate] = useState(hojeLocal())
  const [time, setTime] = useState('')
  const [farmId, setFarmId] = useState(preselected)
  const [notes, setNotes] = useState('')

  const isValid = title.trim().length >= 3 && date >= hojeLocal()
  const dataLembrete = date ? deslocarData(date,-1) : ''

  const handleSave = async () => {
    if (!isValid || saving) return
    setSaving(true); setSaveError('')
    try {
      await addAppointment({
        title:title.trim(), appointmentDate:date,
        appointmentTime:time||null, farmId:kind==='visita'?(farmId||null):null,
        notes:notes.trim(), kind,
      })
      navigate('/agenda')
    } catch(e){setSaveError(e.message||'Falha ao salvar compromisso.')}
    finally{setSaving(false)}
  }

  return (
    <main className="agenda-new">
      <div className="agenda-new__heading">
        <button type="button" onClick={()=>navigate(-1)}><IconArrowLeft size={17}/> Voltar</button>
        <span>PLANEJAMENTO COMERCIAL</span>
        <h1>Novo compromisso</h1>
        <p>Organize sua próxima ação e mantenha a carteira acompanhada.</p>
      </div>
      <div className="agenda-new__body">
        <section className="agenda-new__card">
          <label className="agenda-new__caption">TIPO DE COMPROMISSO</label>
          <div className="agenda-new__type">
            <button type="button" className={kind==='visita'?'is-active':''} onClick={()=>setKind('visita')}>
              <IconRoute size={20}/><strong>Visita</strong><small>Atendimento ao cliente</small>
            </button>
            <button type="button" className={kind==='lembrete'?'is-active':''} onClick={()=>setKind('lembrete')}>
              <IconBell size={20}/><strong>Lembrete</strong><small>Tarefa ou acompanhamento</small>
            </button>
          </div>
          <label className="agenda-new__field">Descrição <span>*</span>
            <input value={title} onChange={e=>setTitle(e.target.value)}
              placeholder={kind==='visita'?'Ex.: Visita de acompanhamento':'Ex.: Entrar em contato para cotação'}/>
          </label>
          {kind==='visita'&&<label className="agenda-new__field">Cliente
            <select value={farmId} onChange={e=>setFarmId(e.target.value)}>
              <option value="">Escolher cliente (opcional)</option>
              {farms.filter(f=>f.status!=='inativo').map(f=><option key={f.id} value={f.id}>{f.name}{f.city?' · '+f.city:''}</option>)}
            </select>
          </label>}
        </section>

        <section className="agenda-new__card">
          <label className="agenda-new__caption">DATA E HORÁRIO</label>
          <div className="agenda-new__dategrid">
            <label className="agenda-new__field">Data <span>*</span>
              <input type="date" min={hojeLocal()} value={date} onChange={e=>setDate(e.target.value)}/>
            </label>
            <label className="agenda-new__field">Horário
              <input type="time" value={time} onChange={e=>setTime(e.target.value)}/>
            </label>
          </div>
          <label className="agenda-new__field">Observações
            <textarea value={notes} onChange={e=>setNotes(e.target.value)}
              placeholder="Objetivo da visita, assuntos a tratar, o que preparar..." rows={3}/>
          </label>
        </section>

        {kind==='visita'&&date&&(
          <div className="agenda-new__reminder">
            <span><IconBell size={19}/></span>
            <div><strong>Preparação da visita</strong>
              <small>O Campo destacará esta visita em {formatarDia(dataLembrete)}. Com push ativado, você também poderá receber o aviso no celular.</small>
            </div>
          </div>
        )}
        {saveError&&<p className="agenda-new__error" role="alert">{saveError}</p>}
        <button type="button" className="agenda-new__save" disabled={!isValid||saving} onClick={handleSave}>
          <IconCheck size={19}/>{saving?'Salvando...':'Salvar compromisso'}
        </button>
        <p className="agenda-new__foot">Agendar uma visita não marca o atendimento como realizado. Após a visita, registre o resultado no Campo.</p>
      </div>
    </main>
  )
}
