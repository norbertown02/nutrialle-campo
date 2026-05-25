import { BrowserRouter, Routes, Route } from 'react-router-dom'
import StatusBar from './components/StatusBar'
import AppBar from './components/AppBar'
import TabBar from './components/TabBar'
import Home from './screens/Home'
import Clientes from './screens/Clientes'
import Agenda from './screens/Agenda'
import Vendas from './screens/Vendas'
import Mercado from './screens/Mercado'

function App() {
  return (
    <BrowserRouter>
      <div className="phone">
        <StatusBar />
        <AppBar title="Nutrialle Campo" />
        <div className="screen">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/agenda" element={<Agenda />} />
            <Route path="/vendas" element={<Vendas />} />
            <Route path="/mercado" element={<Mercado />} />
          </Routes>
        </div>
        <TabBar />
      </div>
    </BrowserRouter>
  )
}

export default App