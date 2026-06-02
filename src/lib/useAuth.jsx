import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,       setUser]       = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [showSplash, setShowSplash] = useState(false)

  // Verifica sessão existente ao carregar
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id:    session.user.id,
          email: session.user.email,
          name:  session.user.user_metadata?.name || session.user.email.split('@')[0],
          role:  session.user.user_metadata?.role || 'vendedor',
        })
      }
      setLoading(false)
    })

    // Escuta mudanças de sessão (login/logout em outra aba)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id:    session.user.id,
          email: session.user.email,
          name:  session.user.user_metadata?.name || session.user.email.split('@')[0],
          role:  session.user.user_metadata?.role || 'vendedor',
        })
      } else {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const login = useCallback(async (email, password) => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('E-mail ou senha incorretos')
      setLoading(false)
      return false
    }
    setShowSplash(true)
    setTimeout(() => {
      setUser({
        id:    data.user.id,
        email: data.user.email,
        name:  data.user.user_metadata?.name || data.user.email.split('@')[0],
        role:  data.user.user_metadata?.role || 'vendedor',
      })
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
