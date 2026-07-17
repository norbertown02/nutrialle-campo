import { useState, useEffect } from 'react'
import { db } from './db'
import { supabase } from './supabase'

export function useProducts() {
  const [products,     setProducts]     = useState([])
  const [paymentTerms, setPaymentTerms] = useState([])
  const [loading,      setLoading]      = useState(true)
  const [offline,      setOffline]      = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [prod, terms] = await Promise.all([
        supabase.from('products').select('*').eq('active', true).order('segment').order('name'),
        supabase.from('payment_terms').select('*').eq('active', true).order('days'),
      ])

      if (!prod.error && prod.data) {
        setProducts(prod.data)
        setOffline(false)
        await db.products_cache.clear()
        await db.products_cache.bulkPut(prod.data)
      } else {
        // offline: usa a última tabela de preços salva no aparelho
        const cached = await db.products_cache.toArray()
        setProducts(cached)
        setOffline(true)
      }

      if (!terms.error && terms.data) {
        setPaymentTerms(terms.data)
        await db.payment_terms_cache.clear()
        await db.payment_terms_cache.bulkPut(terms.data)
      } else {
        const cached = await db.payment_terms_cache.toArray()
        setPaymentTerms(cached)
      }

      setLoading(false)
    }
    load()
  }, [])

  const MAX_DISCOUNT_PERCENT = 10

  return { products, paymentTerms, loading, offline, MAX_DISCOUNT_PERCENT }
}
