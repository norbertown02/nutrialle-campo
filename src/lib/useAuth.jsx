import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext(null)

function formatarNomeFallback(emailOuNome) {
  if (!emailOuNome) return 'Vendedor'

  return String(emailOuNome)
    .split('@')[0]
    .replace(/[._-]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map(parte => parte.charAt(0).toUpperCase() + parte.slice(1).toLowerCase())
    .join(' ')
}

function escolherNomeProfile(profile, authUser) {
  return (
    profile?.name ||
    profile?.full_name ||
    profile?.display_name ||
    profile?.nome ||
    authUser?.user_metadata?.name ||
    authUser?.user_metadata?.full_name ||
    formatarNomeFallback(authUser?.email)
  )
}

async function montarUsuario(authUser) {
  if (!authUser) return null

  let profile = null

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle()

    if (!error && data) {
      profile = data
    }
  } catch (e) {
    console.warn('Erro ao carregar profile do usuário:', e)
  }

  return {
    id: authUser.id,
    email: authUser.email,
    name: escolherNomeProfile(profile, authUser),
    role:
      profile?.role ||
      profile?.cargo ||
      authUser.user_metadata?.role ||
      'vendedor',
    profile,
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showSplash, setShowSplash] = useState(false)

  useEffect(() => {
    let ativo = true

    async function carregarSessao() {
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        const usuario = await montarUsuario(session.user)
        if (ativo) setUser(usuario)
      }

      if (ativo) setLoading(false)
    }

    carregarSessao()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const usuario = await montarUsuario(session.user)
        if (ativo) setUser(usuario)
      } else {
        if (ativo) setUser(null)
      }
    })

    return () => {
      ativo = false
      subscription.unsubscribe()
    }
  }, [])

  const login = useCallback(async (email, password) => {
    setLoading(true)
    setError(null)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError('E-mail ou senha incorretos')
      setLoading(false)
      return false
    }

    setShowSplash(true)

    const usuario = await montarUsuario(data.user)

    setTimeout(() => {
      setUser(usuario)
      setShowSplash(false)
    }, 2200)

    setLoading(false)
    return true
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
  }, [])

  if (loading) return null

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout, showSplash }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}