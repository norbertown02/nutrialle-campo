import { useEffect, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/useAuth.jsx'
import { startAutoSync } from './lib/syncEngine'
import { lazyWithRetry } from './lib/lazyWithRetry'
import { useServiceWorkerUpdate } from './lib/useServiceWorkerUpdate'
import AppBar from './components/AppBar'
import TabBar from './components/TabBar'
import SplashScreen from './components/SplashScreen'
import SyncStatusBar from './components/SyncStatusBar'
import ToastHost from './components/ToastHost'
import ConfirmDialog from './components/ConfirmDialog'
import './styles/dashboard-vendas-top-v3.css'
import './styles/dashboard-refine.css'

const Login = lazyWithRetry(() => import('./screens/Login'))
const Home = lazyWithRetry(() => import('./screens/Home'))

const Clientes = lazyWithRetry(() => import('./screens/Clientes'))
const NovaFazenda = lazyWithRetry(() => import('./screens/NovaFazenda'))
const FichaCliente = lazyWithRetry(() => import('./screens/FichaCliente'))

const NovaVisita = lazyWithRetry(() => import('./screens/NovaVisita'))

const NovaVenda = lazyWithRetry(() => import('./screens/NovaVenda'))
const Vendas = lazyWithRetry(() => import('./screens/Vendas'))
const DetalheVenda = lazyWithRetry(() => import('./screens/DetalheVenda'))

const Checklist = lazyWithRetry(() => import('./screens/Checklist'))
const PickChecklist = lazyWithRetry(() => import('./screens/PickChecklist'))

const Agenda = lazyWithRetry(() => import('./screens/Agenda'))
const NovoCompromisso = lazyWithRetry(() => import('./screens/NovoCompromisso'))

const Prospeccao = lazyWithRetry(() => import('./screens/Prospeccao'))
const NovaCotacao = lazyWithRetry(() => import('./screens/NovaCotacao'))
const DetalheCotacao = lazyWithRetry(() => import('./screens/DetalheCotacao'))
const EditarCotacao = lazyWithRetry(() => import('./screens/EditarCotacao'))

const Precos = lazyWithRetry(() => import('./screens/Precos'))
const Mercado = lazyWithRetry(() => import('./screens/Mercado'))

const DashboardVendas = lazyWithRetry(() => import('./screens/DashboardVendas'))
const FazendaDados = lazyWithRetry(() => import('./screens/FazendaDados'))

const Nutricao = lazyWithRetry(() => import('./screens/Nutricao'))

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
  useServiceWorkerUpdate()

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

            <Route path="/nutricao" element={<Nutricao />} />
          </Routes>
        </Suspense>
      </div>

      <TabBar />
      <ToastHost />
      <ConfirmDialog />
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
