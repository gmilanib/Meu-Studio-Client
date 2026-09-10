import { API_URL } from './apiConfig.js'

const METHODS_WITHOUT_CSRF = new Set(['GET', 'HEAD', 'OPTIONS'])
let csrfToken = null

export async function refreshCsrfToken() {
  const response = await fetch(`${API_URL}/auth/csrf`, { credentials: 'include' })
  if (!response.ok) throw new Error('Não foi possível obter o token de segurança.')

  const csrf = await response.json()
  if (!csrf.token || !csrf.headerName) {
    throw new Error('O servidor não retornou um token de segurança válido.')
  }

  csrfToken = csrf
  return csrf
}

export async function apiFetch(path, options = {}) {
  const method = (options.method ?? 'GET').toUpperCase()
  const changesData = !METHODS_WITHOUT_CSRF.has(method)
  if (changesData && !csrfToken) await refreshCsrfToken()

  const headers = new Headers(options.headers)
  headers.set('Accept', 'application/json')
  if (options.body) headers.set('Content-Type', 'application/json')
  if (changesData && csrfToken) headers.set(csrfToken.headerName, csrfToken.token)

  return fetch(`${API_URL}${path}`, { ...options, method, headers, credentials: 'include' })
}

export async function getApiError(response, fallbackMessage) {
  const error = await response.json().catch(() => null)
  const fieldErrors = error?.erros ? Object.values(error.erros).join(' ') : ''
  return fieldErrors || error?.mensagem || fallbackMessage
}
