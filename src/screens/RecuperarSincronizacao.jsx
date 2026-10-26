import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/useAuth.jsx'
import { db } from '../lib/db'
import { getOutboxItems, processOutbox } from '../lib/syncEngine'

const TITLES = { farm: 'Cliente', visit: 'Visita', appointment: 'Compromisso', quote: 'Cotação' }
function titleOf(item) {
  const p = item.payload || {}
  return p.name || p.title || (item.entity === 'visit' ? (p.visit_date || 'Visita') : item.entity_id)
}
function safeDoc(p) {
  const val = String(p.cpf_cnpj || p.cnpj || p.cpf || '').replace(/\D/g,'')
  return val.length > 4 ? '••••' + val.slice(-4) : 'Documento não informado'
}
export default function RecuperarSincronizacao() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [visits, setVisits] = useState([])
  const [appointments, setAppointments] = useState([])
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')

  const refresh = useCallback(async () => {
    if (!user?.id) return
    const [queue, vc, ac] = await Promise.all([
      getOutboxItems(), db.visits_cache.toArray(), db.appointments_cache.toArray()
    ])
    setItems(queue.filter(x => x.payload?.seller_id === user.id))
    setVisits(vc.filter(x => x.seller_id === user.id))
    setAppointments(ac.filter(x => x.seller_id === user.id))
  }, [user?.id])
  useEffect(() => { refresh().catch(e => setFeedback(e.message)) }, [refresh])

  const retryVisits = async () => {
    setBusy(true)
    setFeedback('')
    try {
      const queue = (await getOutboxItems()).filter(x =>
        x.payload?.seller_id === user?.id && (x.entity === 'visit' || x.entity === 'appointment')
      )
      for (const item of queue) {
        if (item.status === 'error' || item.status === 'failed') {
          await db.outbox.update(item._seq, { status: 'pending', attempts: 0, error: null })
        }
      }
      await processOutbox()
      await refresh()
      setFeedback('Reenvio solicitado. Confira os registros que ainda apresentam erro ou estão pendentes.')
    } catch (e) { setFeedback('Falha ao solicitar reenvio: ' + (e.message || String(e))) }
    finally { setBusy(false) }
  }

  // Nunca envia automaticamente CPF/CNPJ ou detalhes comerciais para outro destino.
  const copyDiagnostic = async () => {
    const report = {
      user_id: user?.id,
      generated_at: new Date().toISOString(),
      pending: items.map(x => ({
        type: x.entity, id: x.entity_id, name: titleOf(x),
        document_last4: x.entity === 'farm' ? safeDoc(x.payload || {}) : undefined,
        farm_id: x.payload?.farm_id, date: x.payload?.visit_date || x.payload?.appointment_date,
        status: x.status, error: x.error, attempts: x.attempts
      })),
      locally_stored_visits: visits.map(v => ({ id:v.id, farm_id:v.farm_id, date:v.visit_date, pending:!!v._pending })),
      locally_stored_appointments: appointments.map(a => ({ id:a.id, farm_id:a.farm_id, title:a.title, date:a.appointment_date, pending:!!a._pending }))
    }
    try { await navigator.clipboard.writeText(JSON.stringify(report,null,2)); setFeedback('Diagnóstico copiado. Cole a mensagem na conversa de suporte.') }
    catch { setFeedback('Não foi possível copiar. Faça uma captura de tela dos registros.') }
  }

  return <div className="content" style={{ paddingBottom:40 }}>
    <button className="btn btn-ghost" onClick={() => navigate(-1)}>Voltar</button>
    <div className="page-head"><h2>Recuperação da sincronização</h2></div>
    <p style={{fontSize:13, color:'var(--text-dim)'}}>Dados preservados neste aparelho. Não limpe os dados do navegador nem reinstale o aplicativo enquanto houver registros pendentes.</p>
    <div style={{display:'flex', gap:8, flexWrap:'wrap',margin:'14px 0'}}>
      <button className="btn btn-primary" disabled={busy} onClick={retryVisits}>{busy ? 'Reenviando…' : 'Reenviar visitas e compromissos'}</button>
      <button className="btn btn-ghost" onClick={copyDiagnostic}>Copiar diagnóstico</button>
      <button className="btn btn-ghost" onClick={() => refresh()}>Atualizar</button>
    </div>
    {feedback && <p role="status" style={{fontSize:13}}>{feedback}</p>}
    <h3>Registros na fila ({items.length})</h3>
    {items.length === 0 && <p>Não há registros na fila local desta conta neste navegador.</p>}
    {items.map(x => <div key={x._seq} className="row-item" style={{display:'block',padding:12,marginBottom:8}}>
      <strong>{TITLES[x.entity] || x.entity}: {titleOf(x)}</strong>
      <div style={{fontSize:12,color:'var(--text-dim)'}}>
        {x.entity === 'farm' ? safeDoc(x.payload || {}) : (x.payload?.visit_date || x.payload?.appointment_date || '')}
        {' · '} {x.status} {x.error ? ' · ' + x.error : ''}
      </div>
    </div>)}
    <h3>Visitas salvas localmente ({visits.length})</h3>
    {visits.map(x => <p key={x.id}>{x.visit_date} · {x.farm_id} {x._pending ? '· Pendente' : ''}</p>)}
    {visits.length === 0 && <p>Nenhuma visita encontrada no cache local desta conta.</p>}
    <h3>Compromissos locais ({appointments.length})</h3>
    {appointments.map(x => <p key={x.id}>{x.appointment_date} · {x.title} {x._pending ? '· Pendente' : ''}</p>)}
    {appointments.length === 0 && <p>Nenhum compromisso encontrado no cache local desta conta.</p>}
  </div>
}
