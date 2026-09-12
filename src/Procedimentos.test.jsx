import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import ProcedimentosPage from './Procedimentos.jsx'
import { apiFetch } from './api.js'

vi.mock('./Header.jsx', () => ({ default: () => <header>Meu studio</header> }))
vi.mock('./api.js', () => ({ apiFetch: vi.fn(), getApiError: async (response, fallback) => (await response.json()).mensagem || fallback }))

const item = { id: 'p1', nome: 'Design', descricao: 'Design personalizado', preco: 150, duracaoMinutos: 45, categoria: 'Sobrancelhas', ativo: true }
const response = (data, ok = true) => ({ ok, json: async () => data })
let items

beforeEach(() => {
  items = [{ ...item }]
  apiFetch.mockReset()
  apiFetch.mockImplementation(async (path, options = {}) => {
    if (path === '/procedimentos/categorias') return response(['Sobrancelhas'])
    if (options.method === 'POST') { const saved = { ...JSON.parse(options.body), id: 'p2', ativo: true }; items.push(saved); return response(saved) }
    if (options.method === 'PUT') {
      const data = JSON.parse(options.body)
      items[0] = { ...items[0], ...data }
      return response(items[0])
    }
    const params = new URL(path, 'http://teste').searchParams
    const content = items.filter((entry) => (!params.has('ativo') || String(entry.ativo) === params.get('ativo')) && entry.nome.toLowerCase().includes((params.get('nome') || '').toLowerCase()) && (!params.has('categoria') || entry.categoria === params.get('categoria')))
    return response({ content, totalElements: content.length, totalPages: content.length ? 1 : 0 })
  })
})

function openPage() { render(<MemoryRouter><ProcedimentosPage /></MemoryRouter>); return userEvent.setup() }

describe('Catálogo de procedimentos', () => {
  it('lista ativos e cadastra dados válidos com categoria livre; espera novo item na listagem', async () => {
    const user = openPage()
    expect(await screen.findByText('Design')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cadastrar procedimento' }))
    await user.type(screen.getByLabelText('Nome'), 'Limpeza de pele')
    await user.type(screen.getByLabelText('Preço (R$)'), '200.50')
    await user.type(screen.getByLabelText('Duração (minutos)'), '60')
    await user.type(screen.getByLabelText('Categoria'), 'Facial')
    await user.click(screen.getByRole('button', { name: 'Salvar procedimento' }))
    expect(await screen.findByText('Procedimento salvo com sucesso.')).toBeInTheDocument()
    expect(await screen.findByText('Limpeza de pele')).toBeInTheDocument()
    expect(apiFetch).toHaveBeenCalledWith('/procedimentos', expect.objectContaining({ method: 'POST', body: JSON.stringify({ nome: 'Limpeza de pele', descricao: '', preco: 200.5, duracaoMinutos: 60, categoria: 'Facial' }) }))
  })

  it('impede cadastro sem obrigatórios ou com preço e duração inválidos', async () => {
    const user = openPage()
    await user.click(screen.getByRole('button', { name: 'Cadastrar procedimento' }))
    await user.click(screen.getByRole('button', { name: 'Salvar procedimento' }))
    expect(screen.getByLabelText('Nome')).toBeInvalid()
    await user.type(screen.getByLabelText('Nome'), 'Teste')
    await user.type(screen.getByLabelText('Preço (R$)'), '-1')
    await user.type(screen.getByLabelText('Duração (minutos)'), '1.5')
    await user.click(screen.getByRole('button', { name: 'Salvar procedimento' }))
    expect(screen.getByLabelText('Preço (R$)')).toBeInvalid()
    expect(screen.getByLabelText('Duração (minutos)')).toBeInvalid()
    expect(apiFetch.mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(0)
  })

  it('edita o cadastro e preserva os valores no formulário quando a API rejeita duplicidade', async () => {
    const user = openPage()
    await user.click(await screen.findByRole('button', { name: 'Editar Design' }))
    expect(screen.getByLabelText('Preço (R$)')).toHaveValue(150)
    await user.clear(screen.getByLabelText('Nome'))
    await user.type(screen.getByLabelText('Nome'), 'Design completo')
    const original = apiFetch.getMockImplementation()
    apiFetch.mockImplementation((path, options) => options?.method === 'PUT' ? Promise.resolve(response({ mensagem: 'Nome já cadastrado' }, false)) : original(path, options))
    await user.click(screen.getByRole('button', { name: 'Salvar procedimento' }))
    expect(await screen.findByText('Nome já cadastrado')).toBeInTheDocument()
    expect(screen.getByLabelText('Nome')).toHaveValue('Design completo')
    apiFetch.mockImplementation(original)
    await user.click(screen.getByRole('button', { name: 'Salvar procedimento' }))
    expect(await screen.findByText('Design completo')).toBeInTheDocument()
  })

  it('só desativa após confirmação e permite reativar pela lista de inativos', async () => {
    const user = openPage()
    await user.click(await screen.findByRole('button', { name: 'Desativar Design' }))
    expect(apiFetch.mock.calls.some(([, options]) => options?.method === 'PUT')).toBe(false)
    await user.click(screen.getByRole('button', { name: 'Cancelar alteração' }))
    await user.click(screen.getByRole('button', { name: 'Desativar Design' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar alteração' }))
    expect(await screen.findByText('Procedimento desativado com sucesso.')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('Design')).not.toBeInTheDocument())
    await user.selectOptions(screen.getByLabelText('Situação'), 'false')
    await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
    await user.click(await screen.findByRole('button', { name: 'Reativar Design' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar alteração' }))
    expect(await screen.findByText('Procedimento reativado com sucesso.')).toBeInTheDocument()
  })

  it('filtra por nome, categoria e situação e mostra lista vazia', async () => {
    const user = openPage()
    await screen.findByText('Design')
    await user.type(screen.getByLabelText('Buscar por nome'), 'Não existe')
    await user.selectOptions(screen.getByLabelText('Filtrar categoria'), 'Sobrancelhas')
    await user.selectOptions(screen.getByLabelText('Situação'), '')
    await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
    expect(await screen.findByText('Nenhum procedimento encontrado para estes filtros.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }))
    expect(await screen.findByText('Design')).toBeInTheDocument()
  })

  it('mostra erro de rede e recupera a listagem ao tentar novamente', async () => {
    const original = apiFetch.getMockImplementation()
    apiFetch.mockImplementation((path, options) => path.startsWith('/procedimentos?') ? Promise.reject(new Error('Falha de rede')) : original(path, options))
    const user = openPage()
    expect(await screen.findByText('Falha de rede')).toBeInTheDocument()
    apiFetch.mockImplementation(original)
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(await screen.findByText('Design')).toBeInTheDocument()
  })

  it('navega entre páginas sem perder filtros', async () => {
    apiFetch.mockImplementation(async (path) => path === '/procedimentos/categorias' ? response([]) : response({ content: [item], totalElements: 21, totalPages: 2 }))
    const user = openPage()
    await user.click(await screen.findByRole('button', { name: 'Próxima página' }))
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith(expect.stringContaining('page=1&size=20&ativo=true'), expect.anything()))
    expect(await screen.findByText('Página 2 de 2')).toBeInTheDocument()
  })
})
