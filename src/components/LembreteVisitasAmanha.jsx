import { useNavigate } from 'react-router-dom'
import { IconArrowRight, IconBellRinging, IconCalendar } from '@tabler/icons-react'
import { visitasDeAmanha, deslocarData, hojeLocal } from '../lib/agendaUtils'
import '../styles/agenda-nova.css'

export default function LembreteVisitasAmanha({ appointments = [], visits = [], farms = [] }) {
  const navigate = useNavigate()
  const amanha = deslocarData(hojeLocal(), 1)
  const itens = visitasDeAmanha(appointments, visits)
  const total = itens.length
  if (!total) return null
  const nomes = itens.slice(0, 2).map(item =>
    farms.find(f => f.id === item.farmId)?.name || item.title).join(' · ')

  return (
    <section className="agenda-tomorrow" aria-label="Lembrete de visitas para amanhã">
      <span className="agenda-tomorrow__icon"><IconBellRinging size={21} /></span>
      <div className="agenda-tomorrow__body">
        <strong>{total === 1 ? '1 visita amanhã' : total + ' visitas amanhã'}</strong>
        <span>{nomes}{total > 2 ? ' · +' + (total - 2) : ''}</span>
      </div>
      <button type="button" aria-label="Ver visitas de amanhã" onClick={() => navigate('/agenda?date=' + amanha)}>
        <IconArrowRight size={19} />
      </button>
    </section>
  )
}
