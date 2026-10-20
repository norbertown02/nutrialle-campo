/**
 * Uma única entrada para Nutrialle Planos via proxy do próprio domínio.
 * Sessão Supabase compartilhada por origem: sem transportar refresh token em URL.
 */
export function irParaPlanos(modo='nutricional'){
  const value=modo==='introducao'?'introducao':'nutricional'
  window.location.assign('/planos?modo='+encodeURIComponent(value))
}
