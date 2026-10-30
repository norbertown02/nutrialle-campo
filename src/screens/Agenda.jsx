import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  IconAlertTriangle, IconArrowRight, IconBell, IconBellOff, IconCalendar,
  IconCalendarCheck, IconCalendarEvent, IconCalendarPlus, IconCheck, IconChevronLeft,
  IconChevronRight, IconClock, IconEdit, IconMapPin, IconPlus, IconX,
} from '@tabler/icons-react'
import { useAuth } from '../lib/useAuth.jsx'
import { useVisits } from '../lib/useVisits'
import { useAppointments } from '../lib/useAppointments'
import { useFarms } from '../lib/useFarms'
import { usePushReminders } from '../lib/usePushReminders'
import { hojeLocal, deslocarData, diasRelativos, formatarDia, itensAgenda, visitasDeAmanha } from '../lib/agendaUtils'
import '../styles/agenda-nova.css'

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const MONTHS = ['janeiro','fevereiro','março','abril','maio','junho',
  'julho','agosto','setembro','outubro','novembro','dezembro']

function calendarioMes(year, month) {
  const first = new Date(year, month, 1).getDay()
  const last = new Date(year, month + 1, 0).getDate()
  return [
    ...Array.from({ length:first }, (_,i) => ({ key:'empty-'+i, empty:true })),
    ...Array.from({ length:last }, (_,i) => {
      const dia = i + 1
      return { key:dia, day:dia,
        date:year+'-'+String(month+1).padStart(2,'0')+'-'+String(dia).padStart(2,'0') }
    }),
  ]
}

export default function Agenda() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { user } = useAuth()
  const { visits, loading: visitasLoading } = useVisits()
  const { appointments, loading: compromissosLoading, markAsDone, cancelAppointment, updateAppointment } = useAppointments()
  const { farms, loading: clientesLoading } = useFarms()
  const push = usePushReminders(user?.id)

  const today = hojeLocal()
  const tomorrow = deslocarData(today,1)
  const dateFromUrl = params.get('date')
  const dateValida = dateFromUrl && /^\d{4}-\d{2}-\d{2}$/.test(dateFromUrl) ? dateFromUrl : ''
  const [selectedDate, setSelectedDate] = useState(dateValida)
  const inicio = (selectedDate || today).split('-').map(Number)
  const [year,setYear] = useState(inicio[0])
  const [month,setMonth] = useState(inicio[1]-1)
  const [tab,setTab] = useState('proximos')
  const [editing,setEditing] = useState('')
  const [draft,setDraft] = useState({ title:'',date:'',time:'',notes:'' })
  const [busy,setBusy] = useState('')
  const [notice,setNotice] = useState('')
  const [showAll,setShowAll] = useState(false)

  const all = useMemo(() => {
    const dados = itensAgenda(appointments, visits)
    const manuais = new Set(dados.filter(i => !i.automatico && i.kind === 'visita' && i.status === 'agendado')
      .map(i => i.farmId+'@'+i.date))
    return dados.filter(i => !i.automatico || !manuais.has(i.farmId+'@'+i.date))
  },[appointments, visits])

  const isScheduled = i => i.status === 'agendado'
  const proximos = all.filter(i => isScheduled(i) && i.date >= today)
  const atrasados = all.filter(i => isScheduled(i) && i.date < today)
  const historico = all.filter(i => i.status === 'realizado' || i.status === 'cancelado')
    .sort((a,b)=>b.date.localeCompare(a.date))
  const visitasAmanha = visitasDeAmanha(appointments, visits, today)
  const hojeCount = proximos.filter(i => i.date === today).length
  const loading = visitasLoading || compromissosLoading || clientesLoading

  const dateSet = new Map()
  all.forEach(i => {
    const data = dateSet.get(i.date) || { scheduled:0,done:0,late:0 }
    if (i.status === 'agendado') {
      data.scheduled += 1
      if (i.date < today) data.late += 1
    } else data.done += 1
    dateSet.set(i.date,data)
  })

  const baseItems = tab === 'atrasados' ? atrasados : tab === 'historico' ? historico : proximos
  const filtrados = selectedDate ? baseItems.filter(i => i.date === selectedDate) : baseItems
  const visiveis = showAll ? filtrados : filtrados.slice(0,12)
  const fazenda = farmId => farms.find(f => f.id === farmId)

  function changeMonth(direction) {
    const next = new Date(year, month + direction, 1)
    setYear(next.getFullYear()); setMonth(next.getMonth())
    setSelectedDate(''); setShowAll(false)
  }
  function selecionar(date) {
    setSelectedDate(v => v === date ? '' : date)
    setShowAll(false)
  }
  function selecionarAmanha() {
    setYear(Number(tomorrow.slice(0,4)))
    setMonth(Number(tomorrow.slice(5,7))-1)
    setTab('proximos')
    setSelectedDate(tomorrow); setShowAll(false)
  }
  function editar(i) {
    setEditing(i.id)
    setNotice('')
    setDraft({title:i.title||'',date:i.date,time:i.time||'',notes:i.notes||''})
  }
  async function salvarEdicao(i) {
    if (!draft.title.trim() || !draft.date || busy) return
    setBusy(i.id)
    setNotice('')
    try {
      await updateAppointment(i.id, {
        title:draft.title.trim(), appointmentDate:draft.date,
        appointmentTime:draft.time||null, notes:draft.notes,
        ...(i.status === 'agendado' ? {} : {}),
      })
      setEditing('')
      setNotice('Compromisso atualizado.')
    } catch(e) { setNotice(e.message||'Falha ao reagendar.') }
    finally { setBusy('') }
  }
  async function cancelar(i) {
    if (busy || !window.confirm('Cancelar o compromisso "' + i.title + '"?')) return
    setBusy(i.id); setNotice('')
    try { await cancelAppointment(i.id); setNotice('Compromisso cancelado.') }
    catch(e){ setNotice(e.message||'Não foi possível cancelar.') }
    finally { setBusy('') }
  }
  async function concluirLembrete(i) {
    if (busy) return
    setBusy(i.id); setNotice('')
    try { await markAsDone(i.id); setNotice('Lembrete concluído.') }
    catch(e){ setNotice(e.message||'Não foi possível concluir.') }
    finally { setBusy('') }
  }
  function registrarVisita(i) {
    let url = '/visitas/nova?'
    const query = new URLSearchParams()
    if (i.farmId) query.set('farm',i.farmId)
    if (!i.automatico) query.set('appointment',i.id)
    url += query.toString()
    navigate(url)
  }

  return (
    <main className="agenda-pro">
      <header className="agenda-pro__hero">
        <span className="agenda-pro__eyebrow">ORGANIZAÇÃO COMERCIAL</span>
        <div className="agenda-pro__hero-line">
          <div>
            <h1>Minha agenda</h1>
            <p>Compromissos, visitas e relacionamento em um só lugar.</p>
          </div>
          <button type="button" className="agenda-pro__hero-add" onClick={()=>navigate('/agenda/novo')} aria-label="Novo compromisso">
            <IconPlus size={23}/>
          </button>
        </div>
        <div className="agenda-pro__summary">
          <button type="button" onClick={() => {setTab('proximos');setSelectedDate(today);setShowAll(false)}}>
            <strong>{hojeCount}</strong><small>Hoje</small>
          </button>
          <button type="button" onClick={selecionarAmanha}>
            <strong>{visitasAmanha.length}</strong><small>Visitas amanhã</small>
          </button>
          <button type="button" onClick={() => {setTab('atrasados');setSelectedDate('');setShowAll(false)}}>
            <strong>{atrasados.length}</strong><small>Atrasados</small>
          </button>
        </div>
      </header>

      <div className="agenda-pro__content">
        {visitasAmanha.length > 0 && (
          <button className="agenda-pro__tomorrow" type="button" onClick={selecionarAmanha}>
            <span className="agenda-pro__tomorrow-icon"><IconBell size={20}/></span>
            <span><strong>{visitasAmanha.length === 1 ? 'Você tem uma visita amanhã' : 'Você tem '+visitasAmanha.length+' visitas amanhã'}</strong><small>Confira sua programação e prepare o atendimento.</small></span>
            <IconChevronRight size={18} />
          </button>
        )}

        <section className="agenda-pro__calendar" aria-label="Calendário de compromissos">
          <div className="agenda-pro__calendar-head">
            <div><span>CALENDÁRIO</span><h2>{MONTHS[month]} <b>{year}</b></h2></div>
            <div className="agenda-pro__month-actions">
              <button type="button" aria-label="Mês anterior" onClick={()=>changeMonth(-1)}><IconChevronLeft size={18}/></button>
              <button type="button" aria-label="Mês seguinte" onClick={()=>changeMonth(1)}><IconChevronRight size={18}/></button>
            </div>
          </div>
          <div className="agenda-pro__days">
            {WEEKDAYS.map((d,i)=><span key={i}>{d}</span>)}
            {calendarioMes(year,month).map(cell=>cell.empty
              ? <span key={cell.key} aria-hidden="true"/>
              : <button key={cell.key} type="button" aria-pressed={selectedDate===cell.date}
                  onClick={()=>selecionar(cell.date)}
                  className={[
                    cell.date===today?'agenda-pro__day--today':'',
                    selectedDate===cell.date?'agenda-pro__day--selected':'',
                  ].join(' ')}
                  aria-label={formatarDia(cell.date,true)}>
                  {cell.day}
                  {dateSet.has(cell.date) && <i className={dateSet.get(cell.date).late?'is-late':''}/>}
                </button>
            )}
          </div>
          {selectedDate && (
            <button type="button" className="agenda-pro__date-clear" onClick={()=>setSelectedDate('')}>
              <IconX size={13}/> {formatarDia(selectedDate,true)} · Limpar data
            </button>
          )}
        </section>

        <section className="agenda-pro__push" aria-label="Notificações de compromissos">
          <span className="agenda-pro__push-icon">{push.state==='on'?<IconBell size={19}/>:<IconBellOff size={19}/>}</span>
          <div>
            <strong>Lembretes de visitas</strong>
            <small>Receba uma notificação no dia anterior</small>
          </div>
          {push.state==='on' ?
            <button type="button" disabled={push.state==='busy'} onClick={push.desativar}>Ativadas</button>
            : <button type="button" disabled={push.state==='busy'||push.state==='checking'||push.state==='unsupported'} onClick={push.ativar}>
                {push.state==='busy'?'Ativando':push.state==='unsupported'?'Indisponível':'Ativar'}
              </button>}
        </section>
        {push.message && <p className="agenda-pro__feedback" role="status">{push.message}</p>}
        {push.state==='unsupported' && <p className="agenda-pro__feedback">Para receber push, use um navegador compatível e instale o Campo na tela inicial quando necessário.</p>}
        {notice && <p className="agenda-pro__feedback" role="status">{notice}</p>}

        <section className="agenda-pro__schedule">
          <div className="agenda-pro__section-top">
            <div>
              <span className="agenda-pro__section-kicker">SEU PLANEJAMENTO</span>
              <h2>Compromissos</h2>
            </div>
            <button type="button" onClick={()=>navigate('/agenda/novo')}><IconPlus size={15}/> Novo</button>
          </div>
          <div className="agenda-pro__tabs" role="group" aria-label="Filtrar compromissos">
            {[{id:'proximos',label:'Próximos',total:proximos.length},
              {id:'atrasados',label:'Atrasados',total:atrasados.length},
              {id:'historico',label:'Histórico',total:historico.length}].map(t=>
              <button key={t.id} type="button" aria-pressed={tab===t.id}
                className={tab===t.id?'is-active':''}
                onClick={()=>{setTab(t.id);setShowAll(false)}}>
                {t.label}<span>{t.total}</span>
              </button>
            )}
          </div>

          {loading ? (
            <div className="agenda-pro__empty">Carregando compromissos...</div>
          ) : visiveis.length === 0 ? (
            <div className="agenda-pro__empty">
              <IconCalendarCheck size={33}/>
              <strong>{selectedDate?'Nenhum compromisso nesse dia':tab==='atrasados'?'Nenhum compromisso atrasado':tab==='historico'?'Seu histórico aparecerá aqui':'Sua agenda está livre'}</strong>
              <p>{selectedDate?'Selecione outra data ou remova o filtro.':tab==='proximos'?'Comece organizando sua próxima visita.':'Nada para exibir nesse período.'}</p>
              {tab==='proximos'&&!selectedDate&&<button type="button" onClick={()=>navigate('/agenda/novo')}>Agendar visita <IconArrowRight size={15}/></button>}
            </div>
          ) : (
            <div className="agenda-pro__entries">
              {visiveis.map(i=>{
                const farm=fazenda(i.farmId)
                const delta=diasRelativos(i.date,today)
                const late=i.status==='agendado'&&delta<0
                const isVisit=i.kind==='visita'
                return <article key={i.id} className={'agenda-pro__entry'+(late?' is-late':'')}>
                  <div className="agenda-pro__entry-row">
                    <div className="agenda-pro__datebox">
                      <strong>{i.date?.slice(-2)}</strong><small>{i.date?MONTHS[Number(i.date.slice(5,7))-1].slice(0,3):''}</small>
                    </div>
                    <div className="agenda-pro__entry-copy">
                      <strong>{farm?.name || i.title || 'Compromisso'}</strong>
                      <span>{farm?i.title:(isVisit?'Visita':'Lembrete')}{i.time?' · '+i.time.slice(0,5):''}</span>
                      {farm?.city&&<small><IconMapPin size={12}/>{farm.city}{farm.state?' · '+farm.state:''}</small>}
                    </div>
                    <span className={'agenda-pro__entry-state'+(late?' is-late':'')}>
                      {i.status==='cancelado'?'Cancelado':i.status==='realizado'?'Concluído':late?Math.abs(delta)+'d atraso':delta===0?'Hoje':delta===1?'Amanhã':'Agendado'}
                    </span>
                  </div>
                  {i.notes && <p className="agenda-pro__note">{i.notes}</p>}
                  {i.status==='agendado'&& (
                    <div className="agenda-pro__entry-actions">
                      {isVisit&&<button type="button" onClick={()=>registrarVisita(i)}><IconCheck size={15}/> Registrar visita</button>}
                      {!isVisit&&!i.automatico&&<button type="button" onClick={()=>concluirLembrete(i)} disabled={busy===i.id}><IconCheck size={15}/> Concluir</button>}
                      {!i.automatico&&<button type="button" onClick={()=>editar(i)}><IconEdit size={15}/> Reagendar</button>}
                      {!i.automatico&&<button type="button" className="agenda-pro__cancel" disabled={busy===i.id} onClick={()=>cancelar(i)}><IconX size={15}/> Cancelar</button>}
                      {i.automatico&&<span className="agenda-pro__automatic">Retorno sugerido no registro de visita</span>}
                    </div>
                  )}
                  {editing===i.id&&(
                    <div className="agenda-pro__edit">
                      <label>Descrição<input value={draft.title} onChange={e=>setDraft(d=>({...d,title:e.target.value}))}/></label>
                      <div className="agenda-pro__edit-grid">
                        <label>Nova data<input type="date" value={draft.date} onChange={e=>setDraft(d=>({...d,date:e.target.value}))}/></label>
                        <label>Horário<input type="time" value={draft.time} onChange={e=>setDraft(d=>({...d,time:e.target.value}))}/></label>
                      </div>
                      <label>Observações<textarea rows={2} value={draft.notes} onChange={e=>setDraft(d=>({...d,notes:e.target.value}))}/></label>
                      <div className="agenda-pro__edit-actions">
                        <button type="button" onClick={()=>setEditing('')}>Voltar</button>
                        <button type="button" disabled={!draft.date||!draft.title.trim()||!!busy} onClick={()=>salvarEdicao(i)}>
                          <IconCheck size={15}/> Salvar alterações
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              })}
              {!showAll&&filtrados.length>12&&<button className="agenda-pro__more" type="button" onClick={()=>setShowAll(true)}>
                Mostrar mais {filtrados.length-12} compromissos <IconChevronRight size={16}/>
              </button>}
            </div>
          )}
        </section>
        <div className="agenda-pro__bottom">
          <IconCalendarEvent size={16}/>
          Visitas registradas e compromissos agendados são controles diferentes. O agendamento não conta como visita realizada.
        </div>
      </div>
    </main>
  )
}
