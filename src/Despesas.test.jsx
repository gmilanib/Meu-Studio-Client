import { beforeEach, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import DespesasPage from './Despesas.jsx'
import { apiFetch } from './api.js'

vi.mock('./Header.jsx', () => ({ default: () => <header>Meu studio</header> }))
vi.mock('./api.js', () => ({
  apiFetch: vi.fn(),
  getApiError: async (response, fallback) => (await response.json()).mensagem || fallback,
}))

const response = (data, ok = true) => ({ ok, json: async () => data })

beforeEach(() => {
  apiFetch.mockReset()
  apiFetch.mockResolvedValue(response({ id: 'd1' }))
})

function openPage() {
  render(<MemoryRouter><DespesasPage /></MemoryRouter>)
  return userEvent.setup()
}

it('cadastra despesa paga com valores previsto e efetivo separados', async () => {
  const user = openPage()
  expect(screen.queryByLabelText('Meio de pagamento')).not.toBeInTheDocument()
  await user.type(screen.getByLabelText('Descrição'), 'Conta de luz')
  await user.type(screen.getByLabelText('Categoria'), 'Utilidades')
  await user.selectOptions(screen.getByLabelText('Tipo'), 'FIXA')
  await user.selectOptions(screen.getByLabelText('Situação'), 'PAGA')
  await user.type(screen.getByLabelText('Valor previsto'), '245.90')
  await user.clear(screen.getByLabelText('Vencimento'))
  await user.type(screen.getByLabelText('Vencimento'), '2026-09-10')
  await user.clear(screen.getByLabelText('Data do pagamento'))
  await user.type(screen.getByLabelText('Data do pagamento'), '2026-09-11')
  await user.type(screen.getByLabelText('Valor pago'), '250')
  await user.type(screen.getByLabelText('Meio de pagamento'), 'PIX')
  await user.click(screen.getByRole('button', { name: 'Cadastrar despesa' }))

  expect(await screen.findByText('Despesa cadastrada com sucesso.')).toBeInTheDocument()
  const [, options] = apiFetch.mock.calls.find(([path]) => path === '/financeiro/despesas')
  expect(JSON.parse(options.body)).toMatchObject({
    descricao: 'Conta de luz', categoria: 'Utilidades', tipo: 'FIXA', situacao: 'PAGA',
    valorPrevisto: 245.9, vencimento: '2026-09-10', dataPagamento: '2026-09-11',
    valorPago: 250, meioDePagamento: 'PIX',
  })
})

it('envia despesa pendente sem campos de pagamento', async () => {
  const user = openPage()
  await user.type(screen.getByLabelText('Descrição'), 'Material de limpeza')
  await user.type(screen.getByLabelText('Categoria'), 'Limpeza')
  await user.type(screen.getByLabelText('Valor previsto'), '50')
  await user.click(screen.getByRole('button', { name: 'Cadastrar despesa' }))

  const [, options] = apiFetch.mock.calls.find(([path]) => path === '/financeiro/despesas')
  expect(JSON.parse(options.body)).toMatchObject({ situacao: 'PENDENTE', tipo: 'VARIAVEL' })
  expect(JSON.parse(options.body).dataPagamento).toBeNull()
  expect(JSON.parse(options.body).valorPago).toBeNull()
  expect(JSON.parse(options.body).meioDePagamento).toBeNull()
})
