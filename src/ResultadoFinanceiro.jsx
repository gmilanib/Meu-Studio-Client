import { useEffect, useMemo, useState } from 'react'
import Header from './Header.jsx'
import FinancialNav from './FinancialNav.jsx'
import { apiFetch, getApiError } from './api.js'
import './Procedimentos.css'

const initialFilters = { data: '', dataInicio: '', dataFim: '', agrupamento: 'DIARIO' }
const emptyResult = { faturamentoTotal: 0, despesaTotal: 0, saldo: 0, pontos: [] }
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

function periodLabel(period) {
  const parts = period.split('-')
  return parts.length === 2 ? `${parts[1]}/${parts[0]}` : `${parts[2]}/${parts[1]}`
}

export default function ResultadoFinanceiroPage() {
  const [filters, setFilters] = useState(initialFilters)
  const [result, setResult] = useState(emptyResult)
  const [status, setStatus] = useState({ loading: true, error: '' })

  async function load(next = filters) {
    const params = new URLSearchParams({ agrupamento: next.agrupamento })
    Object.entries(next).forEach(([key, value]) => { if (key !== 'agrupamento' && value) params.set(key, value) })
    setStatus({ loading: true, error: '' })
    try {
      const response = await apiFetch(`/financeiro/relatorio/resultado?${params}`)
      if (!response.ok) throw new Error(await getApiError(response, 'Não foi possível carregar o resultado financeiro.'))
      setResult(await response.json())
      setStatus({ loading: false, error: '' })
    } catch (error) {
      setStatus({ loading: false, error: error.message || 'Não foi possível carregar o resultado financeiro.' })
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => load(initialFilters), 0)
    return () => window.clearTimeout(timer)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function updateFilter(event) {
    const { name, value } = event.target
    setFilters((current) => ({
      ...current,
      [name]: value,
      ...(name === 'data' && value ? { dataInicio: '', dataFim: '' } : {}),
      ...((name === 'dataInicio' || name === 'dataFim') && value ? { data: '' } : {}),
    }))
  }

  const scale = useMemo(() => Math.max(...result.pontos.flatMap((point) => [Number(point.faturamento), Number(point.despesas), Math.abs(Number(point.saldo))]), 1), [result.pontos])

  return <main className="app-shell"><div className="app-frame"><Header /><div className="report-page">
    <p className="eyebrow">Financeiro</p><h1>Resultado financeiro</h1>
    <p className="report-intro">Compare o faturamento realizado com as despesas efetivamente pagas.</p>
    <FinancialNav />
    <form className="report-filters" onSubmit={(event) => { event.preventDefault(); load(filters) }}>
      <label>Data exata<input name="data" type="date" value={filters.data} onChange={updateFilter} /></label>
      <label>Data inicial<input name="dataInicio" type="date" value={filters.dataInicio} onChange={updateFilter} max={filters.dataFim || undefined} /></label>
      <label>Data final<input name="dataFim" type="date" value={filters.dataFim} onChange={updateFilter} min={filters.dataInicio || undefined} /></label>
      <label>Agrupamento<select name="agrupamento" value={filters.agrupamento} onChange={updateFilter}><option value="DIARIO">Diário</option><option value="MENSAL">Mensal</option></select></label>
      <div className="filter-actions"><button>Aplicar filtros</button><button type="button" className="secondary-action" onClick={() => { setFilters(initialFilters); load(initialFilters) }}>Limpar</button></div>
    </form>
    {status.error && <p className="form-error" role="alert">{status.error}</p>}
    <section className="financial-summary" aria-label="Totais do resultado financeiro">
      <article><span>Faturamento</span><strong>{money.format(result.faturamentoTotal)}</strong></article>
      <article><span>Despesas pagas</span><strong>{money.format(result.despesaTotal)}</strong></article>
      <article className={Number(result.saldo) < 0 ? 'negative-balance' : ''}><span>Saldo</span><strong>{money.format(result.saldo)}</strong></article>
    </section>
    <section className="report-card"><h2>Faturamento × despesas × saldo</h2>
      {status.loading ? <p className="report-empty">Carregando resultado…</p> : result.pontos.length === 0 ? <p className="report-empty">Nenhum movimento encontrado para este período.</p> :
        <div className="comparison-chart" role="img" aria-label="Comparação entre faturamento, despesas pagas e saldo">
          {result.pontos.map((point) => <div className="comparison-column" key={point.periodo}>
            <div className="comparison-bars">
              <span className="comparison-bar revenue" style={{ height: `${Math.max(Number(point.faturamento) / scale * 100, 3)}%` }} title={`Faturamento: ${money.format(point.faturamento)}`} />
              <span className="comparison-bar expense" style={{ height: `${Math.max(Number(point.despesas) / scale * 100, 3)}%` }} title={`Despesas: ${money.format(point.despesas)}`} />
              <span className={`comparison-bar balance ${Number(point.saldo) < 0 ? 'negative' : ''}`} style={{ height: `${Math.max(Math.abs(Number(point.saldo)) / scale * 100, 3)}%` }} title={`Saldo: ${money.format(point.saldo)}`} />
            </div><span className="chart-label">{periodLabel(point.periodo)}</span>
          </div>)}
        </div>}
      <div className="chart-legend"><span className="revenue">Faturamento</span><span className="expense">Despesas pagas</span><span className="balance">Saldo</span></div>
    </section>
  </div></div></main>
}
