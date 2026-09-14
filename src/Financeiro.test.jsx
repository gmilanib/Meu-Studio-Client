import { beforeEach, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import FinanceiroPage from './Financeiro.jsx'
import { apiFetch } from './api.js'

vi.mock('./Header.jsx', () => ({ default: () => <header>Meu studio</header> }))
vi.mock('./api.js', () => ({ apiFetch: vi.fn(), getApiError: async (response, fallback) => (await response.json()).mensagem || fallback }))
const procedures = [{ id: 'p1', nome: 'Design', preco: 150 }, { id: 'p2', nome: 'Limpeza', preco: 200 }]
const response = (data, ok = true, status = 200) => ({ ok, status, json: async () => data })

beforeEach(() => {
  apiFetch.mockReset()
  apiFetch.mockImplementation(async (path) => path.startsWith('/procedimentos?') ? response({ content: procedures, totalPages: 1 }) : response({ content: [] }))
})
function openPage() { render(<MemoryRouter><FinanceiroPage /></MemoryRouter>); return userEvent.setup() }

it('exige seleção, sugere preço, aceita ajuste e envia o ID; sucesso limpa o formulário', async () => {
  const user = openPage()
  expect(screen.getByRole('button', { name: 'Lançar receita' })).toBeDisabled()
  await screen.findByRole('option', { name: 'Design' })
  await user.selectOptions(screen.getByLabelText('Procedimento ativo'), 'p1')
  expect(screen.getByLabelText('Valor')).toHaveValue(150)
  await user.clear(screen.getByLabelText('Valor'))
  await user.type(screen.getByLabelText('Valor'), '125.50')
  await user.type(screen.getByLabelText('Cliente'), 'Maria')
  await user.type(screen.getByLabelText('Meio de pagamento'), 'PIX')
  await user.click(screen.getByRole('button', { name: 'Lançar receita' }))
  expect(await screen.findByText('Receita lançada com sucesso.')).toBeInTheDocument()
  const [, options] = apiFetch.mock.calls.find(([path]) => path === '/financeiro/lancar')
  expect(JSON.parse(options.body)).toMatchObject({ procedimentoId: 'p1', valor: 125.5, cliente: 'Maria' })
  expect(JSON.parse(options.body)).not.toHaveProperty('procedimento')
  expect(screen.getByLabelText('Procedimento ativo')).toHaveValue('')
  expect(screen.getByRole('button', { name: 'Lançar receita' })).toBeDisabled()
})

it('trocar procedimento substitui o preço sugerido e limpar seleção bloqueia envio', async () => {
  const user = openPage()
  await screen.findByRole('option', { name: 'Design' })
  await user.selectOptions(screen.getByLabelText('Procedimento ativo'), 'p1')
  await user.clear(screen.getByLabelText('Valor'))
  await user.type(screen.getByLabelText('Valor'), '100')
  await user.selectOptions(screen.getByLabelText('Procedimento ativo'), 'p2')
  expect(screen.getByLabelText('Valor')).toHaveValue(200)
  await user.selectOptions(screen.getByLabelText('Procedimento ativo'), '')
  expect(screen.getByRole('button', { name: 'Lançar receita' })).toBeDisabled()
})

it('vincula nome exato e avisa quando o texto não corresponde a cliente cadastrado', async () => {
  apiFetch.mockImplementation(async (path) => path.startsWith('/procedimentos?')
    ? response({ content: procedures, totalPages: 1 })
    : response({ content: path.includes('page=0') ? [{ id: 7, nome: 'Maria', telefone: '9999' }] : [] }))
  const user = openPage()
  await screen.findByRole('option', { name: 'Design' })
  await user.type(screen.getByLabelText('Cliente'), 'Maria')
  expect(screen.getByText('Cliente vinculado ao cadastro.')).toBeInTheDocument()
  await user.type(screen.getByLabelText('Cliente'), ' X')
  expect(screen.getByText(/cliente não cadastrado/i)).toBeInTheDocument()
})

it('catálogo vazio orienta cadastrar e impede lançamento', async () => {
  apiFetch.mockResolvedValue(response({ content: [], totalPages: 0 }))
  openPage()
  expect(await screen.findByRole('link', { name: 'Gerenciar procedimentos' })).toHaveAttribute('href', '/procedimentos')
  expect(screen.getByRole('button', { name: 'Lançar receita' })).toBeDisabled()
})

it('falha ao carregar catálogo permite tentar novamente e não habilita lançamento', async () => {
  apiFetch.mockImplementation(async (path) => { if (path.startsWith('/procedimentos?')) throw new Error('Rede indisponível'); return response({ content: [] }) })
  const user = openPage()
  expect(await screen.findByText('Rede indisponível')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Lançar receita' })).toBeDisabled()
  apiFetch.mockResolvedValue(response({ content: procedures, totalPages: 1 }))
  await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
  expect(await screen.findByRole('option', { name: 'Design' })).toBeInTheDocument()
})

it('rejeição de procedimento desativado limpa seleção e mantém os outros dados', async () => {
  const original = apiFetch.getMockImplementation()
  apiFetch.mockImplementation((path, options) => path === '/financeiro/lancar' ? Promise.resolve(response({ mensagem: 'Procedimento inativo' }, false, 400)) : original(path, options))
  const user = openPage()
  await screen.findByRole('option', { name: 'Design' })
  await user.selectOptions(screen.getByLabelText('Procedimento ativo'), 'p1')
  await user.type(screen.getByLabelText('Cliente'), 'Maria')
  await user.type(screen.getByLabelText('Meio de pagamento'), 'PIX')
  await user.click(screen.getByRole('button', { name: 'Lançar receita' }))
  expect(await screen.findByText('Procedimento inativo')).toBeInTheDocument()
  expect(screen.getByLabelText('Procedimento ativo')).toHaveValue('')
  expect(screen.getByLabelText('Cliente')).toHaveValue('Maria')
  expect(screen.getByRole('button', { name: 'Lançar receita' })).toBeDisabled()
})

it('busca e paginação tornam procedimentos além da primeira página selecionáveis', async () => {
  apiFetch.mockImplementation(async (path) => {
    if (!path.startsWith('/procedimentos?')) return response({ content: [] })
    const page = new URL(path, 'http://teste').searchParams.get('page')
    return response({ content: [procedures[page === '1' ? 1 : 0]], totalPages: 2 })
  })
  const user = openPage()
  await user.click(await screen.findByRole('button', { name: 'Próximos' }))
  await screen.findByRole('option', { name: 'Limpeza' })
  await user.selectOptions(screen.getByLabelText('Procedimento ativo'), 'p2')
  expect(screen.getByLabelText('Valor')).toHaveValue(200)
  await user.type(screen.getByLabelText('Buscar procedimento'), 'Design')
  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith(expect.stringContaining('page=0&size=20&nome=Design'), expect.anything()))
  expect(screen.getByLabelText('Procedimento ativo')).toHaveValue('p2')
})
