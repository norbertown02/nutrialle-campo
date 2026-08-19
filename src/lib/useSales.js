import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth.jsx'
import { supabase } from './supabase'
import { db } from './db'

function fromDB(row) {
  if (!row) return null
  return {
    id: row.id,
    farmId: row.farm_id,
    saleDate: row.sale_date,
    deliveryDate: row.delivery_date,
    items: row.items,
    total: row.total,
    paymentTerm: row.payment_term,
    paymentTermLabel: row.payment_term_label,
    paymentMethodId: row.payment_method_id,
    paymentMethodLabel: row.payment_method_label,
    priceTableId: row.price_table_id,
    priceTableLabel: row.price_table_label,
    frete: row.frete,
    frete_label: row.frete_label,
    needsApproval: row.needs_approval,
    comissaoPct: Number(row.comissao_pct || 0),
    notes: row.notes,
    integrationStatus: row.integration_status,
    integrationAttempts: row.integration_attempts,
    ultraError: row.ultra_error,
    ultraOrderId: row.ultra_order_id,
    ultraOrderNumber: row.ultra_order_number,
    ultraStatus: row.ultra_status,
    createdAt: row.created_at,
  }
}

const SALE_COLUMNS = [
  'id','farm_id','sale_date','delivery_date','items','total','payment_term','payment_term_label',
  'payment_method_id','payment_method_label','price_table_id','price_table_label','frete','frete_label',
  'needs_approval','comissao_pct','notes','integration_status','integration_attempts','ultra_error',
  'ultra_order_id','ultra_order_number','ultra_status','created_at'
].join(',')

export function useSales() {
  const { user } = useAuth()
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)

      const cached = await db.sales_cache.orderBy('sale_date').reverse().toArray()
      if (!active) return
      if (cached.length) {
        setSales(cached.map(fromDB))
        setLoading(false)
      }

      setRefreshing(true)
      const { data, error } = await supabase
        .from('sales')
        .select(SALE_COLUMNS)
        .order('sale_date', { ascending: false })

      if (!active) return

      if (!error && data) {
        await db.sales_cache.clear()
        if (data.length) await db.sales_cache.bulkPut(data)
        if (active) setSales(data.map(fromDB))
      } else if (!cached.length) {
        const fallback = await db.sales_cache.orderBy('sale_date').reverse().toArray()
        if (active) setSales(fallback.map(fromDB))
      }

      if (active) {
        setLoading(false)
        setRefreshing(false)
      }
    }

    if (user) {
      load().catch(error => {
        console.warn('Falha ao carregar vendas:', error)
        if (active) {
          setLoading(false)
          setRefreshing(false)
        }
      })
    } else {
      setSales([])
      setLoading(false)
    }

    return () => { active = false }
  }, [user?.id])

  const addSale = useCallback(async (saleData) => {
    const item = {
      id: 's' + Date.now(),
      farm_id: saleData.farmId,
      sale_date: saleData.saleDate,
      delivery_date: saleData.deliveryDate || null,
      items: saleData.items,
      total: saleData.total,
      payment_term: saleData.paymentTermId,
      payment_term_label: saleData.paymentTermLabel,
      payment_method_id: saleData.paymentMethodId || null,
      payment_method_label: saleData.paymentMethodLabel || null,
      price_table_id: saleData.priceTableId || null,
      price_table_label: saleData.priceTableLabel || null,
      frete: saleData.frete || 'CIF',
      frete_label: saleData.frete_label,
      needs_approval: saleData.needsApproval ?? false,
      comissao_pct: saleData.comissaoPct ?? 0,
      notes: saleData.notes || null,
      seller_id: user && user.id,
      integration_status: 'pendente',
      created_at: new Date().toISOString(),
    }
    const { error } = await supabase.from('sales').insert(item)
    if (!error) {
      await db.sales_cache.put(item)
      setSales(prev => [fromDB(item), ...prev])
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) {
          fetch('https://kruldbtjyhfiswmwmoyz.supabase.co/functions/v1/enviar-pedido-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ sale_id: item.id }),
          }).catch(e => console.warn('Email nao enviado:', e))
        }
      } catch(e) {
        console.warn('Erro ao disparar email:', e)
      }
    }
    return { error }
  }, [user])

  const resendSaleToUltra = useCallback(async (id) => {
    const sale = sales.find(s => s.id === id)
    if (!sale) return { error: new Error('Venda não encontrada.') }
    if (sale.ultraOrderId) return { error: new Error(`Esta venda já possui pedido no Ultra (${sale.ultraOrderNumber || sale.ultraOrderId}).`) }

    const { error: markError } = await supabase
      .from('sales')
      .update({ integration_status: 'reenviando', ultra_error: null, ultra_response: null })
      .eq('id', id)
    if (markError) return { error: markError }

    setSales(prev => prev.map(s => s.id === id ? { ...s, integrationStatus: 'reenviando', ultraError: null } : s))

    try {
      const { data, error } = await supabase.functions.invoke('push-sales', { body: { saleIds: [id] } })
      if (error) throw error
      const result = Array.isArray(data?.results) ? data.results[0] : null
      if (result?.status === 'erro') throw new Error(result.error || 'A Ultra recusou o pedido.')

      const { data: updatedRow, error: refreshError } = await supabase
        .from('sales').select(SALE_COLUMNS).eq('id', id).maybeSingle()
      if (!refreshError && updatedRow) {
        await db.sales_cache.put(updatedRow)
        setSales(prev => prev.map(s => s.id === id ? fromDB(updatedRow) : s))
      }
      return { data, error: null }
    } catch (error) {
      await supabase.from('sales').update({ integration_status: 'erro', ultra_error: error?.message || String(error) }).eq('id', id)
      setSales(prev => prev.map(s => s.id === id ? { ...s, integrationStatus: 'erro', ultraError: error?.message || String(error) } : s))
      return { error }
    }
  }, [sales])

  const removeSale = useCallback(async (id) => {
    const { error } = await supabase.from('sales').delete().eq('id', id)
    if (!error) {
      setSales(prev => prev.filter(s => s.id !== id))
      await db.sales_cache.delete(id)
    }
    return { error }
  }, [])

  const getSalesByFarm = useCallback((farmId) => {
    return sales.filter(s => s.farmId === farmId).sort((a, b) => b.saleDate.localeCompare(a.saleDate))
  }, [sales])

  return { sales, loading, refreshing, addSale, resendSaleToUltra, removeSale, getSalesByFarm }
}
