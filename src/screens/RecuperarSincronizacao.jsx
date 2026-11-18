import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/useAuth.jsx'
import { db } from '../lib/db'
import { getOutboxItems, processOutbox } from '../lib/syncEngine'
import { useFarms } from '../lib/useFarms'
import { supabase } from '../lib/supabase'

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
  const { farms, loading: farmsLoading } = useFarms()
  const [items, setItems] = useState([])
  const [localFarmNames, setLocalFarmNames] = useState({})
  const [quoteClientSearch, setQuoteClientSearch] = useState({})
  const [selectedQuoteClient, setSelectedQuoteClient] = useState({})
  const [visits, setVisits] = useState([])
  const [appointments, setAppointments] = useState([])
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')

  const refresh = useCallback(async () => {
    if (!user?.id) return
    const [queue, vc, ac] = await Promise.all([
      getOutboxItems(), db.visits_cache.toArray(), db.appointments_cache.toArray()
    ])
    const localFarms = await db.farms_cache.toArray()
    setLocalFarmNames(Object.fromEntries(localFarms.map(f => [f.id, f.name]).filter(([,name]) => name)))
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

  // Corrige somente a referência de cliente de uma cotação que foi recusada
  // por FK. A escolha é explícita: o sistema nunca adivinha qual é o cliente.
  const recuperarCotacao = async (item) => {
    if (busy || item.entity !== 'quote' || item.status !== 'error' ||
        !String(item.error || '').includes('quotes_farm_id_fkey')) return
    const newFarmId = selectedQuoteClient[item.entity_id]
    const selectedFarm = farms.find(f => f.id === newFarmId && !f.supportOnly)
    if (!selectedFarm) { setFeedback('Selecione o cliente correto para esta cotação.'); return }
    const ok = window.confirm(
      'Vincular a cotação ' + item.entity_id.slice(0, 8) +
      ' ao cliente ' + selectedFarm.name +
      '? Os produtos, quantidades, preços e condições serão preservados.'
    )
    if (!ok) return

    setBusy(true)
    setFeedback('')
    try {
      const { data: remoteFarm, error: farmError } = await supabase
        .from('farms').select('id,name,support_only').eq('id', newFarmId).maybeSingle()
      if (farmError) throw farmError
      if (!remoteFarm || remoteFarm.support_only) throw new Error('O cliente escolhido não existe no servidor ou é uma propriedade de suporte.')

      const { data: remoteQuote, error: quoteError } = await supabase
        .from('quotes').select('id').eq('id', item.entity_id).maybeSingle()
      if (quoteError) throw quoteError
      if (remoteQuote) throw new Error('Esta cotação já existe no servidor. Não é necessário corrigir seu vínculo local.')

      await db.transaction('rw', db.outbox, db.quotes_cache, async () => {
        const current = await db.outbox.get(item._seq)
        if (!current || current.entity !== 'quote' || current.entity_id !== item.entity_id ||
            current.payload?.seller_id !== user?.id) {
          throw new Error('O registro da fila mudou. Atualize a página e confira novamente.')
        }
        if (!String(current.error || '').includes('quotes_farm_id_fkey')) {
          throw new Error('O erro atual é diferente; não é seguro substituir o cliente automaticamente.')
        }
        const corrected = { ...current.payload, farm_id: newFarmId }
        await db.outbox.update(current._seq, {
          payload: corrected, status: 'pending', attempts: 0, error: null
        })
        const cacheQuote = await db.quotes_cache.get(item.entity_id)
        await db.quotes_cache.put({
          ...(cacheQuote || corrected),
          farm_id: newFarmId, _pending: true
        })
      })
      await processOutbox()
      await refresh()
      setFeedback('Cotação vinculada a ' + remoteFarm.name + '. Reenvio solicitado. Confira se o registro saiu da fila.')
    } catch (error) {
      setFeedback('Não foi possível recuperar a cotação: ' + (error.message || String(error)))
    } finally { setBusy(false) }
  }

  // Nunca envia automaticamente CPF/CNPJ ou detalhes comerciais para outro destino.
  const copyDiagnostic = async () => {
    const report = {
      user_id: user?.id,
      generated_at: new Date().toISOString(),
      pending: items.map(x => ({
        type: x.entity, id: x.entity_id, name: titleOf(x),
        document_last4: x.entity === 'farm' ? safeDoc(x.payload || {}) : undefined,
        farm_id: x.payload?.farm_id, local_farm_name: x.entity === 'quote' ? (localFarmNames[x.payload?.farm_id] || null) : undefined,
        date: x.payload?.visit_date || x.payload?.appointment_date,
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
      {x.entity === 'quote' && x.status === 'error' && String(x.error || '').includes('quotes_farm_id_fkey') && (
        <div style={{marginTop:12,padding:12,borderRadius:10,border:'1px solid var(--amber)',background:'var(--surface-2)'}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:6}}>Cotação com cliente não encontrado no servidor</div>
          <p style={{fontSize:12,lineHeight:1.5,margin:'4px 0'}}>
            Código original: {x.payload?.farm_id || 'não informado'}
          </p>
          {localFarmNames[x.payload?.farm_id] && (
            <p style={{fontSize:12,lineHeight:1.5,margin:'4px 0'}}>
              Nome salvo neste aparelho: <strong>{localFarmNames[x.payload.farm_id]}</strong>
            </p>
          )}
          <p style={{fontSize:12,lineHeight:1.5,margin:'8px 0'}}>
            Selecione o cliente certo para recuperar a cotação sem alterar os itens e valores.
            Se ele não estiver cadastrado, cadastre-o primeiro e volte aqui.
          </p>
          <input
            aria-label="Buscar cliente correto"
            placeholder="Buscar cliente pelo nome ou cidade"
            value={quoteClientSearch[x.entity_id] || ''}
            onChange={e => { setQuoteClientSearch(prev => ({...prev,[x.entity_id]:e.target.value})); setSelectedQuoteClient(prev=>({...prev,[x.entity_id]:''})) }}
            style={{width:'100%',marginBottom:8}}
          />
          <select aria-label="Escolher cliente para recuperar cotação"
            value={selectedQuoteClient[x.entity_id] || ''}
            onChange={e => setSelectedQuoteClient(prev=>({...prev,[x.entity_id]:e.target.value}))}
            style={{width:'100%',marginBottom:8}} disabled={busy || farmsLoading}>
            <option value="">Selecione o cliente correto</option>
            {farms.filter(f => !f.supportOnly && (
              [f.name,f.city,f.state].filter(Boolean).join(' ').toLowerCase()
                .includes((quoteClientSearch[x.entity_id] || '').trim().toLowerCase())
            )).slice(0,60).map(f => (
              <option value={f.id} key={f.id}>{f.name}{f.city ? ' — ' + f.city : ''}</option>
            ))}
          </select>
          <button className="btn btn-primary" disabled={busy || !selectedQuoteClient[x.entity_id]}
            onClick={() => recuperarCotacao(x)}>
            {busy ? 'Conferindo...' : 'Confirmar cliente e reenviar cotação'}
          </button>
        </div>
      )}
    </div>)}
    <h3>Visitas salvas localmente ({visits.length})</h3>
    {visits.map(x => <p key={x.id}>{x.visit_date} · {x.farm_id} {x._pending ? '· Pendente' : ''}</p>)}
    {visits.length === 0 && <p>Nenhuma visita encontrada no cache local desta conta.</p>}
    <h3>Compromissos locais ({appointments.length})</h3>
    {appointments.map(x => <p key={x.id}>{x.appointment_date} · {x.title} {x._pending ? '· Pendente' : ''}</p>)}
    {appointments.length === 0 && <p>Nenhum compromisso encontrado no cache local desta conta.</p>}
  </div>
}
