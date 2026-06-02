import { useState, useEffect } from 'react'
import { supabase } from './supabase'

let cache = null

export function useConfig() {
  const [segments, setSegments] = useState(cache?.segments || [])
  const [states,   setStates]   = useState(cache?.states   || [])
  const [regions,  setRegions]  = useState(cache?.regions  || [])
  const [loading,  setLoading]  = useState(!cache)

  useEffect(() => {
    if (cache) return
    async function load() {
      setLoading(true)
      const [segs, sts, regs] = await Promise.all([
        supabase.from('segments').select('*').eq('active', true).order('label'),
        supabase.from('states').select('*').eq('active', true).order('label'),
        supabase.from('regions').select('*').eq('active', true).order('name'),
      ])
      const data = { segments: segs.data || [], states: sts.data || [], regions: regs.data || [] }
      cache = data
      setSegments(data.segments)
      setStates(data.states)
      setRegions(data.regions)
      setLoading(false)
    }
    load()
  }, [])

  const SEGMENTS = Object.fromEntries(segments.map(s => [s.id, s.label]))
  const SEGMENT_COLORS = Object.fromEntries(segments.map(s => [s.id, s.color]))
  const SEGMENT_OPTIONS = segments.map(s => ({ value: s.id, label: s.label }))
  const STATES = states.map(s => ({ value: s.id, label: s.label }))

  function inferRegion(city, state) {
    const c = (city || '').toLowerCase()
    const stateRegions = regions.filter(r => r.state_id === state)
    for (const region of stateRegions) {
      const keywords = region.keywords || []
      if (keywords.length > 0 && keywords.some(k => c.includes(k.toLowerCase()))) return region.name
    }
    const stateRegion = stateRegions.find(r => !r.keywords || r.keywords.length === 0)
    return stateRegion?.name || state || 'Outras regiões'
  }

  return { segments, states, regions, loading, SEGMENTS, SEGMENT_COLORS, SEGMENT_OPTIONS, STATES, inferRegion }
}
