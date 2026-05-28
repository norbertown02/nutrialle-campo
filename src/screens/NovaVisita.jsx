import { useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import {
  IconArrowLeft, IconCheck, IconMoodSmile,
  IconMinus, IconMoodSad, IconCalendar
} from '@tabler/icons-react'
import { useFarms } from '../lib/useFarms'
import { useVisits } from '../lib/useVisits'
import { useAppointments } from '../lib/useAppointments'

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

function addDays(isoDate, days) {
  const d = new Date(isoDate + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

const OUTCOMES = [
  { id: 'positiva', label: 'Positiva', desc: 'Bom alinhamento, chance de negocio', Icon: IconMoodSmile, color: 'var(--green)',      bg: 'var(--green-bg)'   },
  { id: 'neutra',   label: 'Neutra',   desc: 'Conversa boa, sem definicao',        Icon: IconMinus,     color: 'var(--silver-dim)', bg: 'var(--surface-2)'  },
  { id: 'negativa', label: 'Negativa', desc: 'Sem interesse no momento',           Icon: IconMoodSad,   color: 'var(--red)',        bg: 'var(--red-bg)'     },
]

export default function NovaVisita() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { farms, getFarm } = useFarms()
  const { addVisit } = useVisits()
  const { addAppointment } = useAppointments()

  const preselectedFarmId = searchParams.get('farm')
  const preselectedFarm   = preselectedFarmId ? getFarm(preselectedFarmId) : null

  const [farmId,        setFarmId]        = useState(preselectedFarmId || '')
  const [visitDate,     setVisitDate]     = useState(todayISO())
  const [outcome,       setOutcome]       = useState('')
  const [notes,         setNotes]         = useState('')
  const [nextVisitDate, setNextVisitDate] = useState(addDays(todayISO(), 15))

  const selectedFarm = farmId ? getFarm(farmId) : preselectedFarm
  const isValid = farmId && outcome && visitDate

  const handleSave = () => {
    if (!isValid) return

    // Salva a visita
    addVisit({ farmId, visitDate, outcome, notes: notes.trim(), nextVisitDate: nextVisitDate || null })

    // Cria compromisso automático para a próxima visita
    if (nextVisitDate) {
      addAppointment({
        title: `Visita — ${selectedFarm?.name || ''}`,
        appointmentDate: nextVisitDate,
        appointmentTime: null,
        farmId,
        notes: 'Agendado automaticamente após visita.',
      })
    }

    navigate('/clientes/' + farmId)
  }

  return (
    <div className="content">
      <button
        onClick={() => navigate(-1)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4, padding: 0, marginBottom: 14, fontFamily: 'inherit' }}
      >
        <IconArrowLeft size={16} /> Voltar
      </button>

      <div className="page-head">
        <div className="eyebrow">Nova visita</div>
        <h2>Registrar visita</h2>
        <p>{selectedFarm ? selectedFarm.name : 'Escolha a fazenda visitada e como foi a conversa'}</p>
      </div>

      {!preselectedFarm && (
        <>
          <div className="section-label">Fazenda</div>
          {farms.length === 0 ? (
            <div className="hint" style={{ marginBottom: 18 }}>
              Você ainda não tem fazendas cadastradas. Volte para Clientes e cadastre primeiro.
            </div>
          ) : (
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 6, letterSpacing: 0.3 }}>
                Selecione a fazenda *
              </label>
              <select value={farmId} onChange={e => setFarmId(e.target.value)}>
                <option value="">Escolher...</option>
                {farms.map(f => (
                  <option key={f.id} value={f.id}>{f.name} — {f.city}</option>
                ))}
              </select>
            </div>
          )}
        </>
      )}

      <div className="section-label">Quando</div>
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 6, letterSpacing: 0.3 }}>
          Data da visita *
        </label>
        <input type="date" value={visitDate} onChange={e => setVisitDate(e.target.value)} />
        {visitDate === todayISO() && (
          <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4 }}>Hoje</div>
        )}
      </div>

      <div className="section-label">Como foi a visita *</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
        {OUTCOMES.map(o => {
          const isSelected = outcome === o.id
          const Icon = o.Icon
          return (
            <button key={o.id} type="button" onClick={() => setOutcome(o.id)} style={{
              padding: '14px 8px', borderRadius: 12,
              border: '1px solid ' + (isSelected ? o.color : 'var(--line)'),
              background: isSelected ? o.bg : 'var(--surface-2)',
              color: isSelected ? o.color : 'var(--text-dim)',
              cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, transition: '0.15s'
            }}>
              <Icon size={26} />
              <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.3 }}>{o.label}</span>
            </button>
          )
        })}
      </div>
      {outcome && (
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: -6, marginBottom: 14, textAlign: 'center' }}>
          {OUTCOMES.find(o => o.id === outcome).desc}
        </div>
      )}

      <div className="section-label">Anotações</div>
      <div style={{ marginBottom: 14 }}>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="O que foi conversado? O que o produtor pediu? Algum detalhe importante?"
          style={{ minHeight: 100 }}
        />
      </div>

      <div className="section-label">Próxima visita</div>
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 6, letterSpacing: 0.3 }}>
          Sugerimos retornar em
        </label>
        <input type="date" value={nextVisitDate} onChange={e => setNextVisitDate(e.target.value)} />
        <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4 }}>
          Será adicionada à sua agenda automaticamente.
        </div>
      </div>

      <button
        className="btn btn-primary"
        style={{ marginTop: 18, opacity: isValid ? 1 : 0.45, cursor: isValid ? 'pointer' : 'not-allowed' }}
        disabled={!isValid}
        onClick={handleSave}
      >
        <IconCheck size={18} /> Salvar visita
      </button>
    </div>
  )
}
