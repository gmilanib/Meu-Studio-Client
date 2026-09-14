import { beforeEach, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import RelatorioClientesPage from './RelatorioClientes.jsx'
import { apiFetch } from './api.js'

vi.mock('./Header.jsx', () => ({ default: () => <header>Meu studio</header> }))
vi.mock('./api.js', () => ({ apiFetch: vi.fn(), getApiError: async (response, fallback) => (await response.json()).mensagem || fallback }))
const client = { id: 1, nome: 'Maria', email: 'oculto@studio.com', telefone: '1111', criadoEm: '2026-09-10T10:00:00', atualizadoEm: '2026-09-10T10:00:00' }
const response = (data, ok = true) => ({ ok, json: async () => data })

beforeEach(() => {
  apiFetch.mockReset()
  apiFetch.mockImplementation(async (path, options) => {
    if (options?.method) return response(options.method === 'PUT' ? client : null)
    return response({ content: path.includes('page=0') ? [client] : [] })
  })
})

function openPage() { render(<MemoryRouter><RelatorioClientesPage /></MemoryRouter>); return userEvent.setup() }

it('edita nome e telefone somente depois da segunda confirmação e preserva o email oculto', async () => {
  const user = openPage()
  await user.click(await screen.findByRole('button', { name: 'Editar' }))
  const dialog = screen.getByRole('dialog')
  expect(within(dialog).queryByLabelText(/e-mail/i)).not.toBeInTheDocument()
  await user.clear(within(dialog).getByLabelText('Nome')); await user.type(within(dialog).getByLabelText('Nome'), 'Maria Silva')
  await user.click(screen.getByRole('button', { name: 'Revisar alteração' }))
  expect(apiFetch.mock.calls.some(([, options]) => options?.method === 'PUT')).toBe(false)
  expect(screen.getByText('Maria Silva')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Confirmar alteração' }))
  await screen.findByText('Cliente atualizado com sucesso.')
  const [, options] = apiFetch.mock.calls.find(([, request]) => request?.method === 'PUT')
  expect(JSON.parse(options.body)).toEqual({ nome: 'Maria Silva', telefone: '1111', email: 'oculto@studio.com' })
})

it('confirma exclusão e exibe orientação quando o backend bloqueia cliente vinculado', async () => {
  apiFetch.mockImplementation(async (path, options) => {
    if (options?.method === 'DELETE') return response({ mensagem: 'Cliente possui lançamentos financeiros. Altere ou exclua esses lançamentos na aba Financeiro antes de excluir o cliente.' }, false)
    return response({ content: path.includes('page=0') ? [client] : [] })
  })
  const user = openPage()
  await user.click(await screen.findByRole('button', { name: 'Excluir' }))
  expect(apiFetch.mock.calls.some(([, options]) => options?.method === 'DELETE')).toBe(false)
  await user.click(screen.getByRole('button', { name: 'Excluir definitivamente' }))
  expect(await screen.findByText(/Altere ou exclua esses lançamentos/)).toBeInTheDocument()
  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/clientes/1', { method: 'DELETE' }))
})
