import { supabase } from './supabase'

// Manda um erro para a tabela error_logs no Supabase, pra dar visibilidade
// de problemas que acontecem em campo sem depender do vendedor avisar.
// Best-effort: se estiver offline ou o próprio envio falhar, não faz nada
// além de um aviso no console — não pode travar o app por causa de um log.
export async function logError(source, error, extra = {}) {
  try {
    const { data: { user } = {} } = await supabase.auth.getUser()

    await supabase.from('error_logs').insert({
      user_id: user?.id || null,
      source,
      message: error?.message || String(error),
      stack: error?.stack || null,
      route: typeof window !== 'undefined' ? window.location.pathname : null,
      online: typeof navigator !== 'undefined' ? navigator.onLine : null,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      extra,
    })
  } catch (e) {
    console.warn('Não foi possível registrar o erro no Supabase:', e)
  }
}
