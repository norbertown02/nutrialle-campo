import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'nutrialle_checklists'

function loadChecklists() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveChecklists(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch (e) {
    console.error('Erro ao salvar checklists:', e)
  }
}

export function useChecklists() {
  const [checklists, setChecklists] = useState(loadChecklists)

  useEffect(() => {
    saveChecklists(checklists)
  }, [checklists])

  const addChecklist = useCallback((data) => {
    setChecklists(prev => {
      const item = {
        ...data,
        id: 'c' + Date.now(),
        createdAt: new Date().toISOString(),
      }
      return [item, ...prev]
    })
  }, [])

  const removeChecklist = useCallback((id) => {
    setChecklists(prev => prev.filter(c => c.id !== id))
  }, [])

  const getChecklistsByFarm = useCallback((farmId) => {
    return checklists
      .filter(c => c.farmId === farmId)
      .sort((a, b) => b.appliedAt.localeCompare(a.appliedAt))
  }, [checklists])

  return { checklists, addChecklist, removeChecklist, getChecklistsByFarm }
}