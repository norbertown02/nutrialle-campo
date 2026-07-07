import { supabase } from './supabase'

const FUNCTION_URL = 'https://kruldbtjyhfiswmwmoyz.supabase.co/functions/v1/criar-acesso-cliente'
const ANON_KEY = 'sb_publishable_VcS5TqxQ6FFXN9kwkdnuoA_wSHQ5j2d'

export async function criarAcessoCliente({ farmId, email }) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    throw new Error('Sessão expirada. Saia e entre de novo.')
  }

  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ farmId, email }),
  })

  const body = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error(body?.error || 'Não foi possível criar o acesso agora.')
  }

  return body // { link, reused, email }
}
