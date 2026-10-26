import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth.jsx'
import { supabase } from './supabase'
import { db } from './db'
import { enqueue, onSyncChange } from './syncEngine'
import { logError } from './logError'

const fromDB = row => row ? ({ id: row.id, farmId: row.farm_id, visitDate: row.visit_date, outcome: row.outcome, notes: row.notes, nextVisitDate: row.next_visit_date, createdAt: row.created_at, pending: !!row._pending }) : null

export function useVisits() {
  const { user } = useAuth()
  const [visits, setVisits] = useState([])

  useEffect(() => {
    let active = true
    if (!user?.id) { setVisits([]); return () => { active = false } }
    const load = async () => {
      const local = await db.visits_cache.where('seller_id').equals(user.id).toArray()
      if (active) setVisits(local.map(fromDB))
      const { data, error } = await supabase.from('visits').select('*').eq('seller_id', user.id).order('visit_date', {ascending:false})
      if (error) { logError('visits_load', error); return }
      const pending = await db.outbox.where('entity').equals('visit').toArray()
      const pendingIds = new Set(pending.map(x => x.entity_id))
      const preserved = local.filter(x => pendingIds.has(x.id))
      const merged = new Map(data.map(x => [x.id, {...x, _pending:false}]))
      for (const row of preserved) merged.set(row.id, row)
      if (!active) return
      await db.visits_cache.bulkPut([...merged.values()])
      if (active) setVisits([...merged.values()].map(fromDB))
    }
    load().catch(error => logError('visits_load', error))
    const unsub = onSyncChange(() => { load().catch(console.warn) })
    const onFocus = () => load().catch(console.warn)
    window.addEventListener('focus', onFocus)
    return () => { active = false; unsub(); window.removeEventListener('focus', onFocus) }
  }, [user?.id])

  const addVisit = useCallback(async (data) => {
    if (!user?.id) throw new Error('Entre novamente na conta para salvar.')
    const record = { id: 'v' + crypto.randomUUID(), farm_id: data.farmId, visit_date: data.visitDate, outcome: data.outcome, notes: data.notes, next_visit_date: data.nextVisitDate || null, seller_id: user.id, created_at: new Date().toISOString() }
    await db.visits_cache.put({...record, _pending:true})
    setVisits(prev => [fromDB({...record, _pending:true}), ...prev])
    await enqueue({entity:'visit', entityId:record.id, op:'upsert', payload:record})
    return {id:record.id, pending:true}
  }, [user?.id])

  const removeVisit = useCallback(async (id) => {
    const pending = await db.outbox.where('entity_id').equals(id).toArray()
    if (pending.length) throw new Error('Aguarde a sincronização antes de excluir este registro.')
    const { error } = await supabase.from('visits').delete().eq('id', id).eq('seller_id', user.id)
    if (error) throw error
    await db.visits_cache.delete(id)
    setVisits(prev => prev.filter(x => x.id !== id))
  }, [user?.id])

  const getVisitsByFarm = useCallback((farmId) => visits.filter(v => v.farmId === farmId).sort((a,b) => (b.visitDate || '').localeCompare(a.visitDate || '')), [visits])
  return { visits, addVisit, removeVisit, getVisitsByFarm }
}
