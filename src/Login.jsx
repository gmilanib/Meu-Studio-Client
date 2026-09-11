import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import './App.css'
import { useAuth } from './Auth.jsx'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const destination = location.state?.from?.pathname ?? '/'

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    try {
      await login(username, password)
      navigate(destination, { replace: true })
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível entrar. Tente novamente.')
    }
  }

  return (
    <main className="login-page">
      <form className="login-form" onSubmit={handleSubmit}>
        <img className="login-logo" src="/brand-logo.png" alt="Taynara Rosa Beauty" />
        <h1>Meu studio</h1>
        <p>Acesse sua conta para continuar.</p>
        <label htmlFor="username">Usuário</label>
        <input id="username" name="username" type="text" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required />
        <label htmlFor="password">Senha</label>
        <input id="password" name="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="submit" disabled={loading}>{loading ? 'Entrando…' : 'Entrar'}</button>
      </form>
    </main>
  )
}
