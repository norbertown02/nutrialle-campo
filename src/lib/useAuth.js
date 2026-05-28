import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'nutrialle_auth'

// Usuários temporários — substituir por Supabase Auth quando migrar
const USERS = [
  { id: 'u1', name: 'Carlos Eduardo', email: 'carlos@nutrialle.com.br', password: 'nutri2024', role: 'vendedor' },
  { id: 'u2', name: 'Admin Nutrialle', email: 'admin@nutrialle.com.br', password: 'admin2024', role: 'admin' },
]

function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function useAuth() {
  const [user, setUser]       = useState(loadSession)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const login = useCallback(async (email, password) => {
    setLoading(true)
    setError(null)
    await new Promise(r => setTimeout(r, 600)) // simula latência
    const found = USERS.find(u => u.email === email && u.password === password)
    if (found) {
      const session = { id: found.id, name: found.name, email: found.email, role: found.role }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
      setUser(session)
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

  return { user, loading, error, login, logout }
}