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

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ProtectedRoute><App /></ProtectedRoute>} />
        <Route path="/clientes" element={<ProtectedRoute><ScreenPostClient /></ProtectedRoute>} />
        <Route path="/financeiro" element={<ProtectedRoute><FinanceiroPage /></ProtectedRoute>} />
        <Route path="/financeiro/relatorio" element={<ProtectedRoute><RelatorioFinanceiroPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  </BrowserRouter>,
)
