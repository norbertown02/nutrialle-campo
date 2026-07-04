import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/useAuth.jsx'
import AppBar from './components/AppBar'
import TabBar from './components/TabBar'
import SplashScreen from './components/SplashScreen'

import Login from './screens/Login'
import Home from './screens/Home'

import Clientes from './screens/Clientes'
import NovaFazenda from './screens/NovaFazenda'
import FichaCliente from './screens/FichaCliente'

import NovaVisita from './screens/NovaVisita'

import NovaVenda from './screens/NovaVenda'
import Vendas from './screens/Vendas'
import DetalheVenda from './screens/DetalheVenda'

import Checklist from './screens/Checklist'
import PickChecklist from './screens/PickChecklist'

import Agenda from './screens/Agenda'
import NovoCompromisso from './screens/NovoCompromisso'

import Prospeccao from './screens/Prospeccao'
import NovaCotacao from './screens/NovaCotacao'
import DetalheCotacao from './screens/DetalheCotacao'
import EditarCotacao from './screens/EditarCotacao'

import Precos from './screens/Precos'
import Mercado from './screens/Mercado'

import Dados from './screens/Dados'
import DashboardVendas from './screens/DashboardVendas'
import FazendaDados from './screens/FazendaDados'

function AppContent() {
  const { user, loading, showSplash } = useAuth()

  if (loading || showSplash) {
    return <SplashScreen />
  }

  if (!user) return <Login />

  return (
    <div className="phone">
      <AppBar title="Nutrialle Campo" />

      <div className="screen">
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

          <Route path="/dados" element={<Dados />} />
          <Route path="/fazenda-dados/:id" element={<FazendaDados />} />
        </Routes>
      </div>

      <TabBar />
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