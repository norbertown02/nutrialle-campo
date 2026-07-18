import { Component } from 'react'
import { IconAlertTriangle, IconRefresh } from '@tabler/icons-react'
import { logError } from '../lib/logError'

// Error boundaries só funcionam como componente de classe (React ainda não
// tem equivalente em hooks). Sem isso, qualquer erro de render em qualquer
// tela quebra o app inteiro e deixa uma tela branca, sem chance de
// recuperação — o usuário precisaria saber fechar e reabrir o app sozinho.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('Erro não tratado capturado pelo ErrorBoundary:', error, info)
    logError('error_boundary', error, { componentStack: info?.componentStack })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: 24,
        textAlign: 'center', background: 'var(--surface-0, #121212)', color: 'var(--text, #fff)',
      }}>
        <IconAlertTriangle size={40} style={{ color: 'var(--orange, #F07D1A)', marginBottom: 16 }} />
        <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 8 }}>
          Algo deu errado
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-faint, #999)', marginBottom: 20, maxWidth: 300 }}>
          O app encontrou um erro inesperado. Seus dados salvos (clientes, cotações) continuam
          seguros no aparelho. Tente recarregar.
        </div>
        <button
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px' }}
          onClick={() => window.location.reload()}
        >
          <IconRefresh size={16} /> Recarregar app
        </button>
      </div>
    )
  }
}
