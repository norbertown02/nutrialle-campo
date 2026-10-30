import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'

const BASE = import.meta.env.VITE_SUPABASE_URL || 'https://kruldbtjyhfiswmwmoyz.supabase.co'
const CONFIG_URL = BASE + '/functions/v1/visit-reminders'

function decodeVapid(publicKey) {
  const pad = '='.repeat((4 - publicKey.length % 4) % 4)
  const raw = atob((publicKey + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, char => char.charCodeAt(0))
}

export function usePushReminders(userId) {
  const [state, setState] = useState('checking')
  const [message, setMessage] = useState('')

  const suportado = typeof window !== 'undefined'
    && window.isSecureContext
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window

  useEffect(() => {
    if (!userId || !suportado) {
      setState(suportado ? 'off' : 'unsupported')
      return
    }
    let ativo = true
    const check = async () => {
      try {
        const registration = await navigator.serviceWorker.ready
        const sub = await registration.pushManager.getSubscription()
        if (ativo) setState(sub && Notification.permission === 'granted' ? 'on' : 'off')
      } catch {
        if (ativo) setState('off')
      }
    }
    check()
    return () => { ativo = false }
  }, [userId, suportado])

  const ativar = useCallback(async () => {
    if (!userId || !suportado) return
    setMessage('')
    setState('busy')
    try {
      // A solicitação de permissão deve acontecer diretamente após o clique do usuário.
      const permissao = await Notification.requestPermission()
      if (permissao !== 'granted') {
        setState('off')
        setMessage('Notificações não autorizadas. Libere o acesso nas configurações do navegador.')
        return
      }
      const response = await fetch(CONFIG_URL, { method: 'GET', cache: 'no-store' })
      if (!response.ok) throw new Error('O serviço de notificações ainda não está disponível.')
      const config = await response.json()
      if (!config?.publicKey) throw new Error('As notificações push ainda precisam ser configuradas no servidor.')
      const registration = await navigator.serviceWorker.ready
      const existing = await registration.pushManager.getSubscription()
      const subscription = existing || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeVapid(config.publicKey),
      })
      const body = subscription.toJSON()
      const { data: rows, error: readError } = await supabase.from('push_subscriptions')
        .select('id, subscription').eq('user_id', userId)
      if (readError) throw readError
      const same = (rows || []).some(row => row.subscription?.endpoint === body.endpoint)
      if (!same) {
        const { error } = await supabase.from('push_subscriptions')
          .insert({ user_id: userId, subscription: body })
        if (error) throw error
      }
      setState('on')
      setMessage('Notificações autorizadas neste aparelho.')
    } catch (error) {
      setState('off')
      setMessage(error.message || 'Não foi possível ativar. Tente novamente.')
    }
  }, [userId, suportado])

  const desativar = useCallback(async () => {
    if (!userId || !suportado) return
    setState('busy')
    setMessage('')
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        const { data: rows, error } = await supabase.from('push_subscriptions')
          .select('id, subscription').eq('user_id', userId)
        if (error) throw error
        for (const row of rows || []) {
          if (row.subscription?.endpoint !== subscription.endpoint) continue
          const result = await supabase.from('push_subscriptions').delete().eq('id', row.id).eq('user_id', userId)
          if (result.error) throw result.error
        }
        await subscription.unsubscribe()
      }
      setState('off')
      setMessage('Notificações desativadas neste aparelho.')
    } catch (error) {
      setState('on')
      setMessage(error.message || 'Não foi possível desativar.')
    }
  }, [userId, suportado])

  return { state, message, ativar, desativar, suportado }
}
