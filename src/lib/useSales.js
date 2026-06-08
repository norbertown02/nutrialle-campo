import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth.jsx'
import { supabase } from './supabase'

function fromDB(row) {
  if (!row) return null
  return {
    id:               row.id,
    farmId:           row.farm_id,
    saleDate:         row.sale_date,
    items:            row.items,
    total:            row.total,
    paymentTerm:      row.payment_term,
    paymentTermLabel: row.payment_term_label,
    needsApproval:    row.needs_approval,
    status:           row.status,
    sentAt:           row.sent_at,
    createdAt:        row.created_at,
  }
}

export function useSales() {
  const { user } = useAuth()
  const [sales, setSales] = useState([])

  useEffect(() => {
    async function load() {
      let q = supabase.from('sales')
      if (user && user.role === 'vendedor') q = q.eq('seller_id', user.id)
      const { data, error } = await q
        .select('*')
        .order('sale_date', { ascending: false })
      if (!error && data) setSales(data.map(fromDB))
    }
    load()
  }, [])

  const addSale = useCallback(async (saleData) => {
    const item = {
      id:                 's' + Date.now(),
      farm_id:            saleData.farmId,
      sale_date:          saleData.saleDate,
      items:              saleData.items,
      total:              saleData.total,
      payment_term:       saleData.paymentTerm,
      payment_term_label: saleData.paymentTermLabel,
      needs_approval:     saleData.needsApproval ?? false,
      status:             'pendente_envio',
      seller_id:          user && user.id,
    }
    const { error } = await supabase.from('sales').insert(item)
    if (!error) setSales(prev => [fromDB(item), ...prev])
  }, [])

  const removeSale = useCallback(async (id) => {
    const { error } = await supabase.from('sales').delete().eq('id', id)
    if (!error) setSales(prev => prev.filter(s => s.id !== id))
  }, [])

  const getSalesByFarm = useCallback((farmId) => {
    return sales.filter(s => s.farmId === farmId).sort((a, b) => b.saleDate.localeCompare(a.saleDate))
  }, [sales])

  const getPendingSales = useCallback(() => {
    return sales.filter(s => s.status === 'pendente_envio')
  }, [sales])

  const markAsSent = useCallback(async (saleIds) => {
    const sentAt = new Date().toISOString()
    const { error } = await supabase.from('sales').update({ status: 'enviado', sent_at: sentAt }).in('id', saleIds)
    if (!error) setSales(prev => prev.map(s => saleIds.includes(s.id) ? { ...s, status: 'enviado', sentAt } : s))
  }, [])

  return { sales, addSale, removeSale, getSalesByFarm, getPendingSales, markAsSent }
}
