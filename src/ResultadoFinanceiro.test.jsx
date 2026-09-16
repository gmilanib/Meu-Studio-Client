import { beforeEach, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import ResultadoFinanceiroPage from './ResultadoFinanceiro.jsx'
import { apiFetch } from './api.js'

vi.mock('./Header.jsx', () => ({ default: () => <header>Meu studio</header> }))
vi.mock('./api.js', () => ({ apiFetch: vi.fn(), getApiError: vi.fn() }))

const report = {
  faturamentoTotal: 1000,
  despesaTotal: 350,
  saldo: 650,
  pontos: [
    { periodo: '2026-09-01', faturamento: 400, despesas: 150, saldo: 250 },
    { periodo: '2026-09-02', faturamento: 600, despesas: 200, saldo: 400 },
  ],
}

beforeEach(() => {
  apiFetch.mockReset()
  apiFetch.mockResolvedValue({ ok: true, json: async () => report })
})

function openPage() {
  render(<MemoryRouter><ResultadoFinanceiroPage /></MemoryRouter>)
  return userEvent.setup()
}

it('exibe os totais realizados e as três séries do período', async () => {
  openPage()
  expect(await screen.findByText(/1\.000,00/)).toBeInTheDocument()
  expect(screen.getByText(/350,00/)).toBeInTheDocument()
  expect(screen.getByText(/650,00/)).toBeInTheDocument()
  expect(screen.getByRole('img', { name: 'Comparação entre faturamento, despesas pagas e saldo' })).toBeInTheDocument()
  expect(screen.getAllByText('01/09').length).toBeGreaterThan(0)
})

it('envia intervalo e agrupamento mensal sem misturar a data exata', async () => {
  const user = openPage()
  await screen.findByText(/1\.000,00/)
  await user.type(screen.getByLabelText('Data inicial'), '2026-09-01')
  await user.type(screen.getByLabelText('Data final'), '2026-09-30')
  await user.selectOptions(screen.getByLabelText('Agrupamento'), 'MENSAL')
  await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }))

  const path = apiFetch.mock.calls.at(-1)[0]
  expect(path).toContain('agrupamento=MENSAL')
  expect(path).toContain('dataInicio=2026-09-01')
  expect(path).toContain('dataFim=2026-09-30')
  expect(path).not.toContain('data=')
})
