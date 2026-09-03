/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from 'react'
import { apiFetch } from './api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [authenticated, setAuthenticated] = useState(false)
  const [loading, setLoading] = useState(false)

  async function login(username, password) {
    setLoading(true)

    try {
      const response = await apiFetch('/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
      const response =await apiFetch('/auth/logout', {
        method: 'POST',})

        if (!response.ok) throw new Error ('Erro ao fazer logout')
        
      
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
