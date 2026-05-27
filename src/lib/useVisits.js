import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'nutrialle_visits'

function loadVisits() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveVisits(visits) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(visits))
  } catch (e) {
    console.error('Erro ao salvar visitas:', e)
  }
}

export function useVisits() {
  const [visits, setVisits] = useState(loadVisits)

  useEffect(() => {
    saveVisits(visits)
  }, [visits])

  const addVisit = useCallback((visitData) => {
    setVisits(prev => {
      const newVisit = {
        ...visitData,
        id: 'v' + Date.now(),
        createdAt: new Date().toISOString(),
      }
      return [newVisit, ...prev]
    })
  }, [])

  const removeVisit = useCallback((id) => {
    setVisits(prev => prev.filter(v => v.id !== id))
  }, [])

  const getVisitsByFarm = useCallback((farmId) => {
    return visits
      .filter(v => v.farmId === farmId)
      .sort((a, b) => b.visitDate.localeCompare(a.visitDate))
  }, [visits])

  return { visits, addVisit, removeVisit, getVisitsByFarm }
}