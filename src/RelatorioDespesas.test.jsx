import { beforeEach, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import RelatorioDespesasPage from './RelatorioDespesas.jsx'
import { apiFetch } from './api.js'

vi.mock('./Header.jsx', () => ({ default: () => <header>Meu studio</header> }))
vi.mock('./api.js', () => ({
  apiFetch: vi.fn(),
  getApiError: async (response, fallback) => (await response.json()).mensagem || fallback,
}))

const row = { id: 'd1', descricao: 'Energia', categoria: 'Utilidades', tipo: 'FIXA', situacao: 'VENCIDA', valorPrevisto: 245.9, vencimento: '2026-09-10', dataPagamento: null, valorPago: null, meioDePagamento: null, fornecedor: 'Empresa', observacoes: null }
const response = (data, ok = true) => ({ ok, json: async () => data })

beforeEach(() => {
  apiFetch.mockReset()
  apiFetch.mockImplementation(async (path, options) => {
    if (options?.method) return response(row)
    return response({ content: path.includes('page=0') ? [row] : [], totalElements: 1 })
  })
})

function openPage() {
  render(<MemoryRouter><RelatorioDespesasPage /></MemoryRouter>)
  return userEvent.setup()
}

it('filtra e registra pagamento somente depois da revisão', async () => {
  const user = openPage()
  await screen.findByText('Energia')
  await user.type(screen.getByLabelText('Categoria'), 'Utilidades')
  await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
  expect(apiFetch).toHaveBeenCalledWith(expect.stringContaining('categoria=Utilidades'))

  await user.click(screen.getByRole('button', { name: 'Pagar' }))
  const dialog = screen.getByRole('dialog')
  await user.clear(within(dialog).getByLabelText('Data do pagamento'))
  await user.type(within(dialog).getByLabelText('Data do pagamento'), '2026-09-11')
  await user.type(within(dialog).getByLabelText('Valor pago'), '250')
  await user.type(within(dialog).getByLabelText('Meio de pagamento'), 'PIX')
  await user.click(within(dialog).getByRole('button', { name: 'Revisar pagamento' }))
  expect(apiFetch.mock.calls.some(([, options]) => options?.method === 'PUT')).toBe(false)
  await user.click(screen.getByRole('button', { name: 'Confirmar pagamento' }))

  expect(await screen.findByText('Pagamento registrado com sucesso.')).toBeInTheDocument()
  expect(apiFetch).toHaveBeenCalledWith('/financeiro/despesas/d1/pagamento', expect.objectContaining({ method: 'PUT' }))
})

it('cancela e exclui somente depois de confirmação explícita', async () => {
  const user = openPage()
  await screen.findByText('Energia')
  await user.click(screen.getByRole('button', { name: 'Cancelar despesa' }))
  expect(apiFetch.mock.calls.some(([, options]) => options?.method === 'PUT')).toBe(false)
  await user.click(screen.getByRole('button', { name: 'Confirmar cancelamento' }))
  expect(await screen.findByText('Despesa cancelada com sucesso.')).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'Excluir' }))
  await user.click(screen.getByRole('button', { name: 'Excluir definitivamente' }))
  expect(apiFetch).toHaveBeenCalledWith('/financeiro/despesas/d1', { method: 'DELETE' })
})

it('edita uma despesa vencida enviando a situação persistível pendente', async () => {
  const user = openPage()
  await screen.findByText('Energia')
  await user.click(screen.getByRole('button', { name: 'Editar' }))
  const dialog = screen.getByRole('dialog')
  await user.clear(within(dialog).getByLabelText('Descrição'))
  await user.type(within(dialog).getByLabelText('Descrição'), 'Energia corrigida')
  await user.click(within(dialog).getByRole('button', { name: 'Revisar alteração' }))
  await user.click(screen.getByRole('button', { name: 'Confirmar alteração' }))

  const update = apiFetch.mock.calls.find(([path, options]) => path === '/financeiro/despesas/d1' && options?.method === 'PUT')
  expect(JSON.parse(update[1].body)).toMatchObject({ descricao: 'Energia corrigida', situacao: 'PENDENTE' })
})
