import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconMail, IconLock, IconEye, IconEyeOff, IconArrowRight, IconTruck, IconMapPin, IconClipboardCheck } from '@tabler/icons-react'
import { useAuth } from '../lib/useAuth.jsx'
import logo from '../assets/logo-nutrialle.png'

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
    <main className="login-page">
      <section className="login-shell">
        <div className="login-brand">
          <div className="login-ring-2" />

          <div>
            <img src={logo} alt="Nutrialle" className="login-logo" />

            <h1>Sua carteira de campo, sempre à mão.</h1>

            <p>
              Cadastre fazendas, registre visitas e feche vendas direto do
              celular, conectado em tempo real com a operação Nutrialle.
            </p>
          </div>

          <div className="login-brand-footer">
            <div className="login-mini">
              <IconTruck size={18} />
              <strong>Vendas</strong>
              <span>Direto do campo</span>
            </div>

            <div className="login-mini">
              <IconMapPin size={18} />
              <strong>Fazendas</strong>
              <span>Carteira completa</span>
            </div>

            <div className="login-mini">
              <IconClipboardCheck size={18} />
              <strong>Visitas</strong>
              <span>Checklists</span>
            </div>
          </div>
        </div>

        <div className="login-form-side">
          <div className="login-form-inner">
            <div className="login-form-head">
              <div className="login-kicker">Bem-vindo de volta</div>
              <h2>Acesso do vendedor</h2>
              <p>Entre com seu e-mail e senha para continuar.</p>
            </div>

            <form onSubmit={handleSubmit} className="login-form">
              <div>
                <label>E-mail</label>
                <div className="login-input-wrap">
                  <IconMail size={16} />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="seu@email.com.br"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <label>Senha</label>
                <div className="login-input-wrap">
                  <IconLock size={16} />
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={senha}
                    onChange={e => setSenha(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    style={{ paddingRight: 44 }}
                  />
                  <button
                    type="button"
                    className="login-password-btn"
                    onClick={() => setShowPw(p => !p)}
                    aria-label={showPw ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPw ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                  </button>
                </div>
              </div>

              {error && <div className="login-error">{error}</div>}

              <button
                type="submit"
                className="login-submit"
                disabled={loading || !email || !senha}
              >
                {loading ? 'Entrando...' : (
                  <>
                    Entrar
                    <IconArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <div className="login-note">
              Nutrialle Campo v1.0 · Acesso restrito
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
