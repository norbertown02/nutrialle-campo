import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useAuth } from './useAuth.jsx'

const VAPID_PUBLIC_KEY = 'BM3cYxy0apFjF0Y2HqZ8VAEqy19vM4CX3n30rk_Rv6UbpMdbasjai_C_qguiUxWmpKrtc9WsePGpIAIlrpkwZeg'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

export function usePushNotifications() {
  const { user } = useAuth()
  const [permission, setPermission] = useState(Notification.permission)
  const [subscribed, setSubscribed] = useState(false)

  useEffect(() => {
    if (user?.id) checkSubscription()
  }, [user])

  async function checkSubscription() {
    const { data } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .single()
    setSubscribed(!!data)
  }

  async function subscribe() {
    try {
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') return false

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      })

      await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        subscription: sub.toJSON()
      }, { onConflict: 'user_id' })

      setSubscribed(true)
      return true
    } catch(e) {
      console.error('Push subscribe error:', e)
      return false
    }
  }

  async function unsubscribe() {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub) await sub.unsubscribe()
    await supabase.from('push_subscriptions').delete().eq('user_id', user.id)
    setSubscribed(false)
  }

  return { permission, subscribed, subscribe, unsubscribe }
}
