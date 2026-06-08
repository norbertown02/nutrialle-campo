import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth.jsx'
import { supabase } from './supabase'

function fromDB(row) {
  if (!row) return null
  return {
    id:            row.id,
    farmId:        row.farm_id,
    visitDate:     row.visit_date,
    outcome:       row.outcome,
    notes:         row.notes,
    nextVisitDate: row.next_visit_date,
    createdAt:     row.created_at,
  }
}

export function useVisits() {
  const { user } = useAuth()
  const { user } = useAuth()
  const [visits, setVisits] = useState([])

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('visits')
        .select('*')
        .eq('seller_id', user && user.id)
        .order('visit_date', { ascending: false })
      if (!error && data) setVisits(data.map(fromDB))
    }
    load()
  }, [])

  const addVisit = useCallback(async (visitData) => {
    const item = {
      id:              'v' + Date.now(),
      farm_id:         visitData.farmId,
      visit_date:      visitData.visitDate,
      outcome:         visitData.outcome,
      notes:           visitData.notes,
      next_visit_date: visitData.nextVisitDate || null,
    }
    const { error } = await supabase.from('visits').insert(item)
    if (!error) setVisits(prev => [fromDB(item), ...prev])
  }, [])

  const removeVisit = useCallback(async (id) => {
    const { error } = await supabase.from('visits').delete().eq('id', id)
    if (!error) setVisits(prev => prev.filter(v => v.id !== id))
  }, [])

  const getVisitsByFarm = useCallback((farmId) => {
    return visits
      .filter(v => v.farmId === farmId)
      .sort((a, b) => b.visitDate.localeCompare(a.visitDate))
  }, [visits])

  return { visits, addVisit, removeVisit, getVisitsByFarm }
}
