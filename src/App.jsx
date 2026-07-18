import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/useAuth.jsx'
import { startAutoSync } from './lib/syncEngine'
import AppBar from './components/AppBar'
import TabBar from './components/TabBar'
import SplashScreen from './components/SplashScreen'
import SyncStatusBar from './components/SyncStatusBar'
import ToastHost from './components/ToastHost'

// Cada tela vira um chunk separado, carregado só quando o vendedor
// realmente navega até ela — em vez de baixar tudo (relatórios, gráficos,
// PDF etc.) de uma vez só no primeiro carregamento, o que pesa bastante
// em conexão de campo ruim.
const Login = lazy(() => import('./screens/Login'))
const Home = lazy(() => import('./screens/Home'))

const Clientes = lazy(() => import('./screens/Clientes'))
const NovaFazenda = lazy(() => import('./screens/NovaFazenda'))
const FichaCliente = lazy(() => import('./screens/FichaCliente'))

const NovaVisita = lazy(() => import('./screens/NovaVisita'))

const NovaVenda = lazy(() => import('./screens/NovaVenda'))
const Vendas = lazy(() => import('./screens/Vendas'))
const DetalheVenda = lazy(() => import('./screens/DetalheVenda'))

const Checklist = lazy(() => import('./screens/Checklist'))
const PickChecklist = lazy(() => import('./screens/PickChecklist'))

const Agenda = lazy(() => import('./screens/Agenda'))
const NovoCompromisso = lazy(() => import('./screens/NovoCompromisso'))

const Prospeccao = lazy(() => import('./screens/Prospeccao'))
const NovaCotacao = lazy(() => import('./screens/NovaCotacao'))
const DetalheCotacao = lazy(() => import('./screens/DetalheCotacao'))
const EditarCotacao = lazy(() => import('./screens/EditarCotacao'))

const Precos = lazy(() => import('./screens/Precos'))
const Mercado = lazy(() => import('./screens/Mercado'))

const DashboardVendas = lazy(() => import('./screens/DashboardVendas'))
const FazendaDados = lazy(() => import('./screens/FazendaDados'))

function CarregandoTela() {
  return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-faint)' }}>
      Carregando...
    </div>
  )
}

function AppContent() {
  const { user, loading, showSplash } = useAuth()

  useEffect(() => { startAutoSync() }, [])

  if (loading || showSplash) {
    return <SplashScreen />
  }

  if (!user) return (
    <Suspense fallback={<CarregandoTela />}>
      <Login />
    </Suspense>
  )

  return (
    <div className="phone">
      <AppBar title="Nutrialle Campo" />
      <SyncStatusBar />

      <div className="screen">
        <Suspense fallback={<CarregandoTela />}>
          <Routes>
            <Route path="/" element={<Home />} />

            <Route path="/clientes" element={<Clientes />} />
            <Route path="/clientes/novo" element={<NovaFazenda />} />
            <Route path="/clientes/:id" element={<FichaCliente />} />
            <Route path="/clientes/:id/checklist" element={<Checklist />} />

            <Route path="/checklist" element={<PickChecklist />} />

            <Route path="/visitas/nova" element={<NovaVisita />} />

            <Route path="/vendas" element={<Vendas />} />
            <Route path="/vendas/nova" element={<NovaVenda />} />
            <Route path="/vendas/:id" element={<DetalheVenda />} />

            <Route path="/agenda" element={<Agenda />} />
            <Route path="/agenda/novo" element={<NovoCompromisso />} />

            <Route path="/prospeccao" element={<Prospeccao />} />
            <Route path="/prospeccao/nova" element={<NovaCotacao />} />
            <Route path="/prospeccao/:id" element={<DetalheCotacao />} />
            <Route path="/prospeccao/:id/editar" element={<EditarCotacao />} />

            <Route path="/precos" element={<Precos />} />
            <Route path="/mercado" element={<Mercado />} />

            <Route path="/dashboard-vendas" element={<DashboardVendas />} />

            <Route path="/fazenda-dados/:id" element={<FazendaDados />} />
          </Routes>
        </Suspense>
      </div>

      <TabBar />
      <ToastHost />
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
