import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://kruldbtjyhfiswmwmoyz.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_VcS5TqxQ6FFXN9kwkdnuoA_wSHQ5j2d'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
