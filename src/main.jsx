import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import ScreenPostClient from './Cliente.jsx'
import LoginPage from './Login.jsx'
import { AuthProvider } from './Auth.jsx'
import ProtectedRoute from './ProtectedRoute.jsx'
import FinanceiroPage from './Financeiro.jsx'
import RelatorioFinanceiroPage from './RelatorioFinanceiro.jsx'
import DespesasPage from './Despesas.jsx'
import RelatorioDespesasPage from './RelatorioDespesas.jsx'
import ResultadoFinanceiroPage from './ResultadoFinanceiro.jsx'
import RelatorioClientesPage from './RelatorioClientes.jsx'
import ProcedimentosPage from './Procedimentos.jsx'

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ProtectedRoute><App /></ProtectedRoute>} />
        <Route path="/clientes" element={<ProtectedRoute><ScreenPostClient /></ProtectedRoute>} />
        <Route path="/procedimentos" element={<ProtectedRoute><ProcedimentosPage /></ProtectedRoute>} />
        <Route path="/clientes/relatorio" element={<ProtectedRoute><RelatorioClientesPage /></ProtectedRoute>} />
        <Route path="/financeiro" element={<ProtectedRoute><FinanceiroPage /></ProtectedRoute>} />
        <Route path="/financeiro/despesas" element={<ProtectedRoute><DespesasPage /></ProtectedRoute>} />
        <Route path="/financeiro/relatorio/faturamentos" element={<ProtectedRoute><RelatorioFinanceiroPage /></ProtectedRoute>} />
        <Route path="/financeiro/relatorio/despesas" element={<ProtectedRoute><RelatorioDespesasPage /></ProtectedRoute>} />
        <Route path="/financeiro/relatorio/resultado" element={<ProtectedRoute><ResultadoFinanceiroPage /></ProtectedRoute>} />
        <Route path="/financeiro/relatorio" element={<Navigate to="/financeiro/relatorio/faturamentos" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  </BrowserRouter>,
)
