import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'nutrialle_sales'

function loadSales() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveSales(sales) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sales))
  } catch (e) {
    console.error('Erro ao salvar vendas:', e)
  }
}

export function useSales() {
  const [sales, setSales] = useState(loadSales)

  useEffect(() => {
    saveSales(sales)
  }, [sales])

  const addSale = useCallback((saleData) => {
    setSales(prev => {
      const newSale = {
        ...saleData,
        id: 's' + Date.now(),
        status: 'pendente_envio',
        createdAt: new Date().toISOString(),
      }
      return [newSale, ...prev]
    })
  }, [])

  const removeSale = useCallback((id) => {
    setSales(prev => prev.filter(s => s.id !== id))
  }, [])

  const getSalesByFarm = useCallback((farmId) => {
    return sales
      .filter(s => s.farmId === farmId)
      .sort((a, b) => b.saleDate.localeCompare(a.saleDate))
  }, [sales])

  const getPendingSales = useCallback(() => {
    return sales.filter(s => s.status === 'pendente_envio')
  }, [sales])

  const markAsSent = useCallback((saleIds) => {
    const sentAt = new Date().toISOString()
    setSales(prev => prev.map(s =>
      saleIds.includes(s.id)
        ? { ...s, status: 'enviado', sentAt }
        : s
    ))
  }, [])

  return {
    sales,
    addSale,
    removeSale,
    getSalesByFarm,
    getPendingSales,
    markAsSent
  }
}