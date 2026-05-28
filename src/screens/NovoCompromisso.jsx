import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconArrowLeft, IconCheck } from '@tabler/icons-react'
import { useFarms } from '../lib/useFarms'
import { useAppointments } from '../lib/useAppointments'

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

const backBtnStyle = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--text-dim)',
  fontSize: 13,
  fontWeight: 500,
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: 0,
  marginBottom: 14,
  fontFamily: 'inherit'
}

export default function NovoCompromisso() {
  const navigate = useNavigate()
  const farmsHook = useFarms()
  const farms = farmsHook.farms
  const apptsHook = useAppointments()
  const addAppointment = apptsHook.addAppointment

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
      farmId: farmId || null,
      notes: notes.trim(),
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
        <p>Anote uma visita, reuniao ou evento na sua agenda</p>
      </div>

      <div className="section-label">O que e?</div>
      <div style={{ marginBottom: 14 }}>
        <label style={{
          display: 'block', fontSize: 12, fontWeight: 600,
          color: 'var(--text-dim)', marginBottom: 6, letterSpacing: 0.3
        }}>
          Titulo *
        </label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Ex.: Apresentar novo produto, Reuniao tecnica"
        />
      </div>

      {farms.length > 0 ? (
        <>
          <div className="section-label">Cliente (opcional)</div>
          <div style={{ marginBottom: 14 }}>
            <label style={{
              display: 'block', fontSize: 12, fontWeight: 600,
              color: 'var(--text-dim)', marginBottom: 6, letterSpacing: 0.3
            }}>
              Fazenda relacionada
            </label>
            <select value={farmId} onChange={e => setFarmId(e.target.value)}>
              <option value="">Sem fazenda especifica</option>
              {farms.map(f => (
                <option key={f.id} value={f.id}>
                  {f.name} - {f.city}
                </option>
              ))}
            </select>
          </div>
        </>
      ) : null}

      <div className="section-label">Quando</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 10, marginBottom: 14 }}>
        <div>
          <label style={{
            display: 'block', fontSize: 12, fontWeight: 600,
            color: 'var(--text-dim)', marginBottom: 6, letterSpacing: 0.3
          }}>
            Data *
          </label>
          <input
            type="date"
            value={appointmentDate}
            onChange={e => setAppointmentDate(e.target.value)}
          />
        </div>
        <div>
          <label style={{
            display: 'block', fontSize: 12, fontWeight: 600,
            color: 'var(--text-dim)', marginBottom: 6, letterSpacing: 0.3
          }}>
            Horario (opcional)
          </label>
          <input
            type="time"
            value={appointmentTime}
            onChange={e => setAppointmentTime(e.target.value)}
          />
        </div>
      </div>

      <div className="section-label">Anotacoes</div>
      <div style={{ marginBottom: 18 }}>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Detalhes do compromisso, contexto, o que preparar..."
          style={{ minHeight: 80 }}
        />
      </div>

      <div className="hint" style={{ marginBottom: 14 }}>
        Compromissos sem horario aparecem como tarefas do dia. Com horario,
        funcionam como agendamento.
      </div>

      <button
        className="btn btn-primary"
        onClick={handleSave}
        disabled={!isValid}
        style={{
          opacity: isValid ? 1 : 0.45,
          cursor: isValid ? 'pointer' : 'not-allowed'
        }}
      >
        <IconCheck size={18} />
        Salvar compromisso
      </button>
    </div>
  )
}
