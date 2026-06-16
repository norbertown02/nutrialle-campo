import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT')!

async function sendPushNotification(subscription: any, payload: object) {
  const { default: webpush } = await import('npm:web-push@3.6.7')
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
  await webpush.sendNotification(subscription, JSON.stringify(payload))
}

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const hoje = new Date().toISOString().split('T')[0]
  const em2dias = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const agora = new Date()
  const horaAgora = agora.getHours().toString().padStart(2, '0') + ':' + agora.getMinutes().toString().padStart(2, '0')

  // Busca todas as subscriptions
  const { data: subs } = await supabase.from('push_subscriptions').select('*')
  if (!subs?.length) return new Response('no subscriptions', { status: 200 })

  const notificacoes = []

  for (const sub of subs) {
    const userId = sub.user_id

    // 1. Cotações vencendo em 2 dias
    const { data: cotacoes } = await supabase
      .from('quotes')
      .select('id, total, farms(name)')
      .eq('seller_id', userId)
      .eq('status', 'enviada')
      .eq('valid_until', em2dias)

    for (const cot of cotacoes || []) {
      notificacoes.push({
        subscription: sub.subscription,
        payload: {
          title: '⚠️ Cotação vencendo em 2 dias',
          body: `Cotação para ${cot.farms?.name} vence em 2 dias. Entre em contato!`,
          url: `/prospeccao/${cot.id}`
        }
      })
    }

    // 2. Cotações vencidas hoje
    const { data: vencidas } = await supabase
      .from('quotes')
      .select('id, farms(name)')
      .eq('seller_id', userId)
      .eq('status', 'enviada')
      .eq('valid_until', hoje)

    for (const cot of vencidas || []) {
      notificacoes.push({
        subscription: sub.subscription,
        payload: {
          title: '🔴 Cotação vencida hoje',
          body: `Cotação para ${cot.farms?.name} venceu hoje. Renove ou converta em venda!`,
          url: `/prospeccao/${cot.id}`
        }
      })
    }

    // 3. Compromissos no horário (±15 min)
    const { data: compromissos } = await supabase
      .from('appointments')
      .select('id, title, appointment_time')
      .eq('seller_id', userId)
      .eq('appointment_date', hoje)
      .eq('status', 'agendado')
      .not('appointment_time', 'is', null)

    for (const comp of compromissos || []) {
      if (!comp.appointment_time) continue
      const [h, m] = comp.appointment_time.split(':').map(Number)
      const diffMin = (h * 60 + m) - (agora.getHours() * 60 + agora.getMinutes())
      if (diffMin >= 0 && diffMin <= 15) {
        notificacoes.push({
          subscription: sub.subscription,
          payload: {
            title: '📅 Compromisso agora',
            body: `${comp.title} às ${comp.appointment_time}`,
            url: '/agenda'
          }
        })
      }
    }
  }

  // Envia todas as notificações
  const resultados = await Promise.allSettled(
    notificacoes.map(n => sendPushNotification(n.subscription, n.payload))
  )

  const enviados = resultados.filter(r => r.status === 'fulfilled').length
  const erros = resultados.filter(r => r.status === 'rejected').length

  return new Response(
    JSON.stringify({ enviados, erros, total: notificacoes.length }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
