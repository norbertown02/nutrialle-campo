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

function comTimeout(promise, ms, fallback) {
  return Promise.race([
    promise,
    new Promise(resolve => {
      setTimeout(() => resolve(fallback), ms)
    }),
  ])
}

// Cache em memória do último profile buscado com sucesso, por user id.
// onAuthStateChange do Supabase dispara sozinho de tempos em tempos
// (ex: renovação automática de token), e cada disparo refaz essa busca
// com um timeout curto. Em campo, com sinal ruim, é comum a busca
// demorar mais que o timeout — sem esse cache, isso fazia o nome
// correto (vindo de profiles.name) ser substituído silenciosamente pelo
// nome "chutado" a partir do e-mail de login, mesmo a tela já tendo
// mostrado o nome certo segundos antes.
const ultimoProfileConhecido = new Map()

async function montarUsuario(authUser) {
  if (!authUser) return null

  let profile = null

  try {
    const { data, error } = await comTimeout(
      supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle(),
      5000,
      { timeout: true }
    )

    if (!error && data) {
      profile = data
      ultimoProfileConhecido.set(authUser.id, data)
    }
  } catch (e) {
    console.warn('Erro ao carregar profile do usuário:', e)
  }

  // Busca deu timeout/falhou/não achou nada: em vez de cair direto pro
  // nome chutado do e-mail, usa o último profile que já carregamos com
  // sucesso pra esse usuário nesta sessão, se tiver.
  if (!profile && ultimoProfileConhecido.has(authUser.id)) {
    profile = ultimoProfileConhecido.get(authUser.id)
  }

  return {
    id: authUser.id,
    email: authUser.email,
    name: escolherNomeProfile(profile, authUser),
    role:
      profile?.role ||
      profile?.cargo ||
      authUser?.user_metadata?.role ||
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
      setLoading(true)

      try {
        const resultado = await comTimeout(
          supabase.auth.getSession(),
          5000,
          { timeout: true }
        )

        if (!ativo) return

        if (resultado?.timeout) {
          console.warn('Supabase getSession demorou demais. Liberando tela.')
          setUser(null)
          return
        }

        const session = resultado?.data?.session

        if (session?.user) {
          const usuario = await montarUsuario(session.user)

          if (ativo) {
            setUser(usuario)
          }
        } else {
          if (ativo) {
            setUser(null)
          }
        }
      } catch (err) {
        console.error('Erro ao carregar sessão:', err)

        if (ativo) {
          setUser(null)
        }
      } finally {
        if (ativo) {
          setLoading(false)
        }
      }
    }

    carregarSessao()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!ativo) return

      try {
        if (session?.user) {
          const usuario = await montarUsuario(session.user)

          if (ativo) {
            setUser(usuario)
          }
        } else {
          if (ativo) {
            setUser(null)
          }
        }
      } catch (err) {
        console.error('Erro ao atualizar sessão:', err)

        if (ativo) {
          setUser(null)
        }
      } finally {
        if (ativo) {
          setLoading(false)
        }
      }
    })

    return () => {
      ativo = false
      subscription?.unsubscribe()
    }
  }, [])

  const login = useCallback(async (email, password) => {
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError('E-mail ou senha incorretos')
        setUser(null)
        setLoading(false)
        return false
      }

      setShowSplash(true)

      const usuario = await montarUsuario(data.user)

      setUser(usuario)
      setLoading(false)

      setTimeout(() => {
        setShowSplash(false)
      }, 1200)

      return true
    } catch (err) {
      console.error('Erro ao fazer login:', err)
      setError('Erro ao entrar. Tente novamente.')
      setUser(null)
      setLoading(false)
      setShowSplash(false)
      return false
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      setLoading(true)
      await supabase.auth.signOut()
      setUser(null)
    } catch (err) {
      console.error('Erro ao sair:', err)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        logout,
        showSplash,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}