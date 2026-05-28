import { useState, useCallback, createContext, useContext } from 'react'

const STORAGE_KEY = 'nutrialle_auth'

const USERS = [
  { id: 'u1', name: 'Teste', email: 'teste@gmail.com', password: '123456', role: 'vendedor' },
  { id: 'u2', name: 'Admin Nutrialle', email: 'admin@nutrialle.com.br', password: 'admin2024', role: 'admin' },
]

function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]             = useState(loadSession)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)
  const [showSplash, setShowSplash] = useState(false)

  const login = useCallback(async (email, password) => {
    setLoading(true)
    setError(null)
    await new Promise(r => setTimeout(r, 600))
    const found = USERS.find(u => u.email === email && u.password === password)
    if (found) {
      const session = { id: found.id, name: found.name, email: found.email, role: found.role }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
      setShowSplash(true)
      setTimeout(() => {
        setUser(session)
        setShowSplash(false)
      }, 2200)
      setLoading(false)
      return true
    }
    setError('E-mail ou senha incorretos')
    setLoading(false)
    return false
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout, showSplash }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
