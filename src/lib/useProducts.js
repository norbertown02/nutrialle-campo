import { saveProductsCache, loadProductsCache } from './offlineCache'
import { useState, useEffect } from 'react'
import { supabase } from './supabase'

export function useProducts() {
  const [products,     setProducts]     = useState([])
  const [paymentTerms, setPaymentTerms] = useState([])
  const [loading,      setLoading]      = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [prod, terms] = await Promise.all([
        supabase.from('products').select('*').eq('active', true).order('segment').order('name'),
        supabase.from('payment_terms').select('*').eq('active', true).order('days'),
      ])
      if (!prod.error  && prod.data)  setProducts(prod.data)
      if (!terms.error && terms.data) setPaymentTerms(terms.data)
      setLoading(false)
    }
    load()
  }, [])

  const MAX_DISCOUNT_PERCENT = 10

  return { products, paymentTerms, loading, MAX_DISCOUNT_PERCENT }
}
