import { useEffect, useState } from 'react'
import { apiFetch, getApiError } from './api.js'

// Cada consulta tem seu próprio ciclo de vida: respostas antigas não substituem filtros novos.
export function useProcedimentos({ nome = '', categoria = '', ativo = '', page = 0 }, revision = 0) {
  const key = JSON.stringify([nome, categoria, ativo, page, revision])
  const [state, setState] = useState({ key: '', content: [], totalPages: 0, totalElements: 0, error: '' })
  useEffect(() => {
    let current = true
    const controller = new AbortController()
    const params = new URLSearchParams({ page: String(page), size: '20' })
    if (nome.trim()) params.set('nome', nome.trim())
    if (categoria) params.set('categoria', categoria)
    if (ativo !== '') params.set('ativo', ativo)
    async function load() {
      try {
        const response = await apiFetch(`/procedimentos?${params}`, { signal: controller.signal })
        if (!response.ok) throw new Error(await getApiError(response, 'Não foi possível carregar os procedimentos.'))
        const result = await response.json()
        if (current) setState({ ...result, key, error: '' })
      } catch (error) {
        if (current) setState({ key, content: [], totalPages: 0, totalElements: 0, error: error.message })
      }
    }
    load()
    return () => { current = false; controller.abort() }
  }, [nome, categoria, ativo, page, key])
  return state.key === key ? { ...state, loading: false } : { content: [], totalPages: 0, totalElements: 0, error: '', loading: true }
}
