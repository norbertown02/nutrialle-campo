import { supabase } from './supabase'

// Mesmo esquema já usado no painel-comercial e no nutrialle-gestao: o
// vercel.json faz proxy de /planos pro deployment do nutrialle-planos (mesmo
// domínio de verdade, appcampo.nutrialle.com.br/planos), então a sessão do
// Supabase já é compartilhada sozinha via localStorage -- o token no hash é
// só um reforço defensivo pra quem eventualmente cair fora do proxy.
export async function irParaPlanos(modo) {
  const { data: { session } } = await supabase.auth.getSession()
  const destino = '/planos?modo=' + modo
  if (session) {
    window.location.href = destino + '#sso_at=' + encodeURIComponent(session.access_token) + '&sso_rt=' + encodeURIComponent(session.refresh_token)
  } else {
    window.location.href = destino
  }
}
