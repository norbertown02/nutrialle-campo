import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'

function fromDB(row) {
  if (!row) return null
  return {
    id:           row.id,
    farmId:       row.farm_id,
    segment:      row.segment,
    appliedAt:    row.applied_at,
    overallScore: row.overall_score,
    stageScores:  row.stage_scores,
    answers:      row.answers,
    createdAt:    row.created_at,
  }
}

export function useChecklists() {
  const [checklists, setChecklists] = useState([])

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('checklists')
        .select('*')
        .order('applied_at', { ascending: false })
      if (!error && data) setChecklists(data.map(fromDB))
    }
    load()
  }, [])

  const addChecklist = useCallback(async (data) => {
    const item = {
      id:            'c' + Date.now(),
      farm_id:       data.farmId,
      segment:       data.segment,
      applied_at:    data.appliedAt,
      overall_score: data.overallScore,
      stage_scores:  data.stageScores,
      answers:       data.answers,
    }
    const { error } = await supabase.from('checklists').insert(item)
    if (!error) setChecklists(prev => [fromDB(item), ...prev])
  }, [])

  const removeChecklist = useCallback(async (id) => {
    const { error } = await supabase.from('checklists').delete().eq('id', id)
    if (!error) setChecklists(prev => prev.filter(c => c.id !== id))
  }, [])

  const getChecklistsByFarm = useCallback((farmId) => {
    return checklists
      .filter(c => c.farmId === farmId)
      .sort((a, b) => b.appliedAt.localeCompare(a.appliedAt))
  }, [checklists])

  return { checklists, addChecklist, removeChecklist, getChecklistsByFarm }
}
