import { createClient } from '@supabase/supabase-js'

// Lê das variáveis de ambiente (configuráveis por ambiente: local, preview,
// produção) com fallback pros valores atuais, pra não quebrar nada em
// quem já tinha o projeto rodando sem essas variáveis configuradas ainda.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://kruldbtjyhfiswmwmoyz.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_VcS5TqxQ6FFXN9kwkdnuoA_wSHQ5j2d'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
