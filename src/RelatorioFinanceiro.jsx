import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import Header from './Header.jsx'
import { apiFetch, getApiError } from './api.js'

const initialFilters = { cliente: '', procedimento: '', valor: '', meioDePagamento: '', data: '', dataInicio: '', dataFim: '' }
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

function FinancialNav() {
  return <nav className="financial-switch" aria-label="Opções financeiras"><Link to="/financeiro">Lançar faturamento</Link><Link to="/financeiro/relatorio" className="active">Relatório de faturamentos</Link></nav>
}

export default function RelatorioFinanceiroPage() {
  const [filters, setFilters] = useState(initialFilters)
  const [result, setResult] = useState({ content: [], totalElements: 0 })
  const [status, setStatus] = useState({ loading: true, error: '' })

  async function load(nextFilters = filters) {
    const params = new URLSearchParams({ size: '50' })
    Object.entries(nextFilters).forEach(([key, value]) => {
      const cleanValue = value.trim()
      if (cleanValue) params.set(key, cleanValue)
    })
    try {
      const entries = []
      let nextPage = 0

      while (true) {
        params.set('page', String(nextPage))
        const response = await apiFetch(`/financeiro/faturamentos?${params.toString()}`)
        if (!response.ok) throw new Error(await getApiError(response, 'Não foi possível carregar o relatório.'))

        const pageResult = await response.json()
        if (pageResult.content.length === 0) break
        entries.push(...pageResult.content)
        nextPage += 1
      }

      setResult({ content: entries, totalElements: entries.length })
    } catch (error) {
      setStatus({ loading: false, error: error.message || 'Não foi possível carregar o relatório.' })
      return
    }
    setStatus({ loading: false, error: '' })
  }

  useEffect(() => {
    const initialRequest = window.setTimeout(() => { load(initialFilters) }, 0)
    return () => window.clearTimeout(initialRequest)
    // A consulta inicial é intencionalmente realizada uma vez, com filtros vazios.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function updateFilter(event) {
    const { name, value } = event.target
    setFilters((current) => ({
      ...current,
      [name]: value,
      ...(name === 'data' && value ? { dataInicio: '', dataFim: '' } : {}),
      ...((name === 'dataInicio' || name === 'dataFim') && value ? { data: '' } : {}),
    }))
  }

  function applyFilters(event) { event.preventDefault(); setStatus({ loading: true, error: '' }); load(filters) }
  function clearFilters() { setStatus({ loading: true, error: '' }); setFilters(initialFilters); load(initialFilters) }

  const chartData = useMemo(() => Object.values(result.content.reduce((groups, row) => {
    groups[row.data] ??= { data: row.data, valor: 0 }
    groups[row.data].valor += Number(row.valor)
    return groups
  }, {})).sort((first, second) => first.data.localeCompare(second.data)), [result.content])
  const chartMax = Math.max(...chartData.map((item) => item.valor), 1)

  return <main className="app-shell"><div className="app-frame"><Header />
    <div className="report-page">
      <p className="eyebrow">Financeiro</p><h1>Relatório de faturamentos</h1><p className="report-intro">Consulte os lançamentos e acompanhe o faturamento do período selecionado.</p>
      <FinancialNav />
      <form className="report-filters" onSubmit={applyFilters}>
        <label>Cliente<input name="cliente" value={filters.cliente} onChange={updateFilter} placeholder="Buscar por nome" /></label>
        <label>Procedimento<input name="procedimento" value={filters.procedimento} onChange={updateFilter} placeholder="Buscar por procedimento" /></label>
        <label>Valor exato<input name="valor" type="number" min="0" step="0.01" inputMode="decimal" value={filters.valor} onChange={updateFilter} placeholder="Ex.: 150,00" /></label>
        <label>Meio de pagamento<input name="meioDePagamento" value={filters.meioDePagamento} onChange={updateFilter} placeholder="Ex.: PIX" /></label>
        <label>Data exata<input name="data" type="date" value={filters.data} onChange={updateFilter} /></label>
        <label>Data inicial<input name="dataInicio" type="date" value={filters.dataInicio} onChange={updateFilter} max={filters.dataFim || undefined} /></label>
        <label>Data final<input name="dataFim" type="date" value={filters.dataFim} onChange={updateFilter} min={filters.dataInicio || undefined} /></label>
        <div className="filter-actions"><button type="submit">Aplicar filtros</button><button type="button" className="secondary-action" onClick={clearFilters}>Limpar</button></div>
      </form>
      {status.error && <p className="form-error" role="alert">{status.error}</p>}
      <section className="report-card" aria-labelledby="chart-title"><div className="report-card-heading"><div><h2 id="chart-title">Faturamento por dia</h2><p>{result.totalElements} lançamento{result.totalElements === 1 ? '' : 's'} encontrado{result.totalElements === 1 ? '' : 's'}</p></div></div>
        {status.loading ? <p className="report-empty">Carregando relatório…</p> : chartData.length === 0 ? <p className="report-empty">Nenhum faturamento encontrado para estes filtros.</p> : <div className="revenue-chart" role="img" aria-label="Gráfico de faturamento por dia">{chartData.map((item) => <div className="chart-column" key={item.data}><span className="chart-value">{money.format(item.valor)}</span><div className="chart-bar" style={{ height: `${Math.max((item.valor / chartMax) * 100, 4)}%` }} /><span className="chart-label">{item.data.split('-').reverse().slice(0, 2).join('/')}</span></div>)}</div>}
      </section>
      <section className="report-card report-table-card" aria-labelledby="table-title"><h2 id="table-title">Lançamentos</h2>{status.loading ? <p className="report-empty">Carregando lançamentos…</p> : <div className="table-scroll"><table><thead><tr><th>Data</th><th>Cliente</th><th>Procedimento</th><th>Pagamento</th><th>Valor</th></tr></thead><tbody>{result.content.map((row) => <tr key={row.id}><td>{row.data.split('-').reverse().join('/')}</td><td>{row.cliente}</td><td>{row.procedimento}</td><td>{row.meioDePagamento}</td><td>{money.format(row.valor)}</td></tr>)}</tbody></table>{result.content.length === 0 && <p className="report-empty">Nenhum lançamento para exibir.</p>}</div>}
      </section>
    </div>
  </div></main>
}
