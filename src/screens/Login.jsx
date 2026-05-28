import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconMail, IconLock, IconEye, IconEyeOff } from '@tabler/icons-react'
import { useAuth } from '../lib/useAuth.jsx'
import logo from '../assets/logo-nutrialle.jpg'

export default function Login() {
  const navigate            = useNavigate()
  const { login, loading, error } = useAuth()
  const [email, setEmail]   = useState('')
  const [senha, setSenha]   = useState('')
  const [showPw, setShowPw] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    const ok = await login(email.trim().toLowerCase(), senha)
    if (ok) navigate('/', { replace: true })
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: '24px 24px 48px',
    }}>

      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <img
          src={logo}
          alt="Nutrialle"
          style={{ width: 90, height: 90, borderRadius: 22, objectFit: 'cover', marginBottom: 16 }}
        />
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 28, fontWeight: 700, color: 'var(--text)', letterSpacing: 1 }}>
          NUTRIALLE
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-faint)', marginTop: 4 }}>
          Campo · Acesso do vendedor
        </div>
      </div>

      {/* Card de login */}
      <div style={{
        width: '100%', maxWidth: 380,
        background: 'var(--surface)', border: '1px solid var(--line)',
        borderRadius: 18, padding: '28px 24px',
      }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* E-mail */}
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 500, display: 'block', marginBottom: 6 }}>
              E-mail
            </label>
            <div style={{ position: 'relative' }}>
              <IconMail size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com.br"
                required
                autoComplete="email"
                style={{
                  width: '100%', padding: '11px 12px 11px 36px',
                  background: 'var(--surface-2)', border: '1px solid var(--line)',
                  borderRadius: 10, color: 'var(--text)', fontSize: 14,
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Senha */}
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 500, display: 'block', marginBottom: 6 }}>
              Senha
            </label>
            <div style={{ position: 'relative' }}>
              <IconLock size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
              <input
                type={showPw ? 'text' : 'password'}
                value={senha}
                onChange={e => setSenha(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                style={{
                  width: '100%', padding: '11px 40px 11px 36px',
                  background: 'var(--surface-2)', border: '1px solid var(--line)',
                  borderRadius: 10, color: 'var(--text)', fontSize: 14,
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPw(p => !p)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', padding: 4 }}
              >
                {showPw ? <IconEyeOff size={15} /> : <IconEye size={15} />}
              </button>
            </div>
          </div>

          {/* Erro */}
          {error && (
            <div style={{ background: 'var(--red-bg)', border: '1px solid rgba(217,83,79,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--red)' }}>
              {error}
            </div>
          )}

          {/* Botão */}
          <button
            type="submit"
            disabled={loading || !email || !senha}
            style={{
              width: '100%', padding: '13px',
              background: loading || !email || !senha ? 'var(--surface-3)' : 'var(--orange)',
              color: loading || !email || !senha ? 'var(--text-faint)' : '#1a0d00',
              border: 'none', borderRadius: 12, cursor: loading ? 'default' : 'pointer',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700, fontSize: 16, letterSpacing: 0.8,
              textTransform: 'uppercase', marginTop: 4,
              transition: 'background 0.2s',
            }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>

      <p style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 32, textAlign: 'center' }}>
        Nutrialle Campo v1.0 · Acesso restrito
      </p>
    </div>
  )
}
