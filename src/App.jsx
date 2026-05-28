import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useAuth } from './lib/useAuth'
import StatusBar from './components/StatusBar'
import AppBar from './components/AppBar'
import TabBar from './components/TabBar'
import Login from './screens/Login'
import Home from './screens/Home'
import Clientes from './screens/Clientes'
import NovaFazenda from './screens/NovaFazenda'
import FichaCliente from './screens/FichaCliente'
import NovaVisita from './screens/NovaVisita'
import NovaVenda from './screens/NovaVenda'
import Checklist from './screens/Checklist'
import PickChecklist from './screens/PickChecklist'
import Agenda from './screens/Agenda'
import NovoCompromisso from './screens/NovoCompromisso'
import Vendas from './screens/Vendas'
import Mercado from './screens/Mercado'
import Dados from './screens/Dados'
import FazendaDados from './screens/FazendaDados'

function AppContent() {
  return (
    <div className="phone">
      <StatusBar />
      <AppBar title="Nutrialle Campo" />
      <div className="screen">
        <Routes>
          <Route path="/"                        element={<Home />} />
          <Route path="/clientes"                element={<Clientes />} />
          <Route path="/clientes/novo"           element={<NovaFazenda />} />
          <Route path="/clientes/:id"            element={<FichaCliente />} />
          <Route path="/clientes/:id/checklist"  element={<Checklist />} />
          <Route path="/checklist"               element={<PickChecklist />} />
          <Route path="/visitas/nova"            element={<NovaVisita />} />
          <Route path="/vendas/nova"             element={<NovaVenda />} />
          <Route path="/agenda"                  element={<Agenda />} />
          <Route path="/agenda/novo"             element={<NovoCompromisso />} />
          <Route path="/vendas"                  element={<Vendas />} />
          <Route path="/mercado"                 element={<Mercado />} />
          <Route path="/dados"                   element={<Dados />} />
          <Route path="/fazenda-dados/:id"       element={<FazendaDados />} />
        </Routes>
      </div>
      <TabBar />
    </div>
  )
}

function App() {
  const { user } = useAuth()

  if (!user) return <Login />

  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

export default App
