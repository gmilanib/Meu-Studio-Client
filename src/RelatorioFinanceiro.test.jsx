import { beforeEach, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import RelatorioFinanceiroPage from './RelatorioFinanceiro.jsx'
import { apiFetch } from './api.js'

vi.mock('./Header.jsx', () => ({ default: () => <header>Meu studio</header> }))
vi.mock('./api.js', () => ({ apiFetch: vi.fn(), getApiError: async (response, fallback) => (await response.json()).mensagem || fallback }))
const row = { id: 'f1', data: '2026-09-10', cliente: 'Maria', clienteId: 1, procedimento: 'Design', procedimentoId: 'p1', valor: 150, meioDePagamento: 'PIX' }
const client = { id: 1, nome: 'Maria', telefone: '1111' }
const procedure = { id: 'p1', nome: 'Design', preco: 150 }
const response = (data, ok = true) => ({ ok, json: async () => data })

beforeEach(() => {
  apiFetch.mockReset()
  apiFetch.mockImplementation(async (path, options) => {
    if (options?.method) return response(options.method === 'PUT' ? row : null)
    if (path.startsWith('/procedimentos?')) return response({ content: [procedure], totalPages: 1 })
    if (path.startsWith('/clientes?')) return response({ content: path.includes('page=0') ? [client] : [] })
    return response({ content: path.includes('page=0') ? [row] : [] })
  })
})

function openPage() { render(<MemoryRouter><RelatorioFinanceiroPage /></MemoryRouter>); return userEvent.setup() }

it('edita todos os campos, permite texto livre e envia somente após comparar os dados', async () => {
  const user = openPage()
  await user.click(await screen.findByRole('button', { name: 'Editar' }))
  const dialog = screen.getByRole('dialog')
  const clientInput = within(dialog).getByLabelText('Cliente')
  await user.clear(clientInput); await user.type(clientInput, 'Cliente avulso')
  expect(screen.getByText(/cliente não cadastrado/i)).toBeInTheDocument()
  await user.clear(within(dialog).getByLabelText('Valor')); await user.type(within(dialog).getByLabelText('Valor'), '175')
  await user.click(screen.getByRole('button', { name: 'Revisar alteração' }))
  expect(apiFetch.mock.calls.some(([, options]) => options?.method === 'PUT')).toBe(false)
  expect(screen.getByText(/Cliente avulso/)).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Confirmar alteração' }))
  await screen.findByText('Lançamento atualizado com sucesso.')
  const [, options] = apiFetch.mock.calls.find(([, request]) => request?.method === 'PUT')
  expect(JSON.parse(options.body)).toMatchObject({ cliente: 'Cliente avulso', clienteId: null, procedimentoId: 'p1', valor: 175 })
})

it('mostra todos os dados e exclui lançamento somente após confirmação', async () => {
  const user = openPage()
  await user.click(await screen.findByRole('button', { name: 'Excluir' }))
  expect(within(screen.getByRole('dialog')).getByText('10/09/2026')).toBeInTheDocument()
  expect(apiFetch.mock.calls.some(([, options]) => options?.method === 'DELETE')).toBe(false)
  await user.click(screen.getByRole('button', { name: 'Excluir definitivamente' }))
  expect(await screen.findByText('Lançamento excluído com sucesso.')).toBeInTheDocument()
  expect(apiFetch).toHaveBeenCalledWith('/financeiro/faturamentos/f1', { method: 'DELETE' })
})
