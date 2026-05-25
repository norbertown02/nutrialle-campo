import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'nutrialle_farms'

function loadFarms() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveFarms(farms) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(farms))
  } catch (e) {
    console.error('Erro ao salvar fazendas:', e)
  }
}

function generateClientCode(existingFarms) {
  const codes = existingFarms
    .map(f => f.clientCode)
    .filter(c => c && c.startsWith('NUT-'))
    .map(c => parseInt(c.replace('NUT-', ''), 10))
    .filter(n => !isNaN(n))

  const next = codes.length > 0 ? Math.max(...codes) + 1 : 2841
  return `NUT-${next}`
}

export function useFarms() {
  const [farms, setFarms] = useState(loadFarms)

  useEffect(() => {
    saveFarms(farms)
  }, [farms])

  const addFarm = useCallback((farmData) => {
    setFarms(prev => {
      const newFarm = {
        ...farmData,
        id: 'f' + Date.now(),
        clientCode: generateClientCode(prev),
        clientSince: String(new Date().getFullYear()),
        status: 'ativo',
        hasChecklist: false,
        createdAt: new Date().toISOString(),
      }
      return [newFarm, ...prev]
    })
  }, [])

  const updateFarm = useCallback((id, changes) => {
    setFarms(prev => prev.map(f =>
      f.id === id ? { ...f, ...changes, updatedAt: new Date().toISOString() } : f
    ))
  }, [])

  const removeFarm = useCallback((id) => {
    setFarms(prev => prev.filter(f => f.id !== id))
  }, [])

  const getFarm = useCallback((id) => {
    return farms.find(f => f.id === id)
  }, [farms])

  return { farms, addFarm, updateFarm, removeFarm, getFarm }
}