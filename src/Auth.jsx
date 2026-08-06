/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from 'react'

const API_URL = 'http://localhost:9000'
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [authenticated, setAuthenticated] = useState(false)
  const [loading, setLoading] = useState(false)

  async function login(username, password) {
    setLoading(true)

    try {
      await fetch(`${API_URL}/auth/csrf`, { credentials: 'include' })

      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      if (!response.ok) throw new Error('Usuário ou senha inválidos.')

      setAuthenticated(true)
    } finally {
      setLoading(false)
    }
  }

  async function logout() {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      })
    } finally {
      setAuthenticated(false)
    }
  }

  return (
    <AuthContext.Provider value={{ authenticated, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const auth = useContext(AuthContext)

  if (!auth) throw new Error('useAuth deve ser usado dentro de AuthProvider.')

  return auth
}