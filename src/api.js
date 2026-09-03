import { API_URL } from './apiConfig.js'

const METHODS_WITHOUT_CSRF = new Set(['GET', 'HEAD', 'OPTIONS'])

async function getCsrfToken() {
  const response = await fetch(`${API_URL}/auth/csrf`, {
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error('Não foi possível obter o token CSRF.')
  }

  const data = await response.json()

  if (!data.token) {
    throw new Error('O servidor não retornou um token CSRF.')
  }

  return data.token
}

export async function apiFetch(path, options = {}) {
  const method = (options.method ?? 'GET').toUpperCase()
  const headers = new Headers(options.headers)

  if (!METHODS_WITHOUT_CSRF.has(method)) {
    headers.set('X-XSRF-TOKEN', await getCsrfToken())
  }

  return fetch(`${API_URL}${path}`, {
    ...options,
    method,
    headers,
    credentials: 'include',
  })
}
