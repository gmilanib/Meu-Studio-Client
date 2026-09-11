import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import Header from './Header.jsx'
import { apiFetch, getApiError } from './api.js'

const initialFilters = { nome: '', email: '', telefone: '', criadoEm: '', criadoEmInicio: '', criadoEmFim: '', atualizadoEm: '', atualizadoEmInicio: '', atualizadoEmFim: '' }

function ClientNav() {
  return <nav className="financial-switch" aria-label="Opções de clientes"><Link to="/clientes">Cadastrar cliente</Link><Link to="/clientes/relatorio" className="active">Relatório de clientes</Link></nav>
}

export default function RelatorioClientesPage() {
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
        const response = await apiFetch(`/clientes?${params.toString()}`)
        if (!response.ok) throw new Error(await getApiError(response, 'Não foi possível carregar o relatório de clientes.'))
        const pageResult = await response.json()
        if (pageResult.content.length === 0) break
        entries.push(...pageResult.content)
        nextPage += 1
      }
      setResult({ content: entries, totalElements: entries.length })
    } catch (error) {
      setStatus({ loading: false, error: error.message || 'Não foi possível carregar o relatório de clientes.' })
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
    setFilters((current) => {
      const next = { ...current, [name]: value }
      if (name === 'criadoEm' && value) { next.criadoEmInicio = ''; next.criadoEmFim = '' }
      if ((name === 'criadoEmInicio' || name === 'criadoEmFim') && value) next.criadoEm = ''
      if (name === 'atualizadoEm' && value) { next.atualizadoEmInicio = ''; next.atualizadoEmFim = '' }
      if ((name === 'atualizadoEmInicio' || name === 'atualizadoEmFim') && value) next.atualizadoEm = ''
      return next
    })
  }

  function applyFilters(event) { event.preventDefault(); setStatus({ loading: true, error: '' }); load(filters) }
  function clearFilters() { setStatus({ loading: true, error: '' }); setFilters(initialFilters); load(initialFilters) }

  const chartData = useMemo(() => Object.values(result.content.reduce((groups, client) => {
    const day = client.criadoEm.slice(0, 10)
    groups[day] ??= { day, total: 0 }
    groups[day].total += 1
    return groups
  }, {})).sort((first, second) => first.day.localeCompare(second.day)), [result.content])
  const chartMax = Math.max(...chartData.map((item) => item.total), 1)
  const formatDateTime = (value) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))

  return <main className="app-shell"><div className="app-frame"><Header />
    <div className="report-page">
      <p className="eyebrow">Clientes</p><h1>Relatório de clientes</h1><p className="report-intro">Pesquise clientes e acompanhe os cadastros realizados no período.</p>
      <ClientNav />
      <form className="report-filters" onSubmit={applyFilters}>
        <label>Nome<input name="nome" value={filters.nome} onChange={updateFilter} placeholder="Buscar por nome" /></label>
        <label>E-mail<input name="email" value={filters.email} onChange={updateFilter} placeholder="Buscar por e-mail" /></label>
        <label>Telefone<input name="telefone" value={filters.telefone} onChange={updateFilter} placeholder="Com ou sem máscara" /></label>
        <label>Criação em<input name="criadoEm" type="date" value={filters.criadoEm} onChange={updateFilter} /></label>
        <label>Criação inicial<input name="criadoEmInicio" type="date" value={filters.criadoEmInicio} onChange={updateFilter} max={filters.criadoEmFim || undefined} /></label>
        <label>Criação final<input name="criadoEmFim" type="date" value={filters.criadoEmFim} onChange={updateFilter} min={filters.criadoEmInicio || undefined} /></label>
        <label>Atualização em<input name="atualizadoEm" type="date" value={filters.atualizadoEm} onChange={updateFilter} /></label>
        <label>Atualização inicial<input name="atualizadoEmInicio" type="date" value={filters.atualizadoEmInicio} onChange={updateFilter} max={filters.atualizadoEmFim || undefined} /></label>
        <label>Atualização final<input name="atualizadoEmFim" type="date" value={filters.atualizadoEmFim} onChange={updateFilter} min={filters.atualizadoEmInicio || undefined} /></label>
        <div className="filter-actions"><button type="submit">Aplicar filtros</button><button type="button" className="secondary-action" onClick={clearFilters}>Limpar</button></div>
      </form>
      {status.error && <p className="form-error" role="alert">{status.error}</p>}
      <section className="report-card" aria-labelledby="client-chart-title"><div className="report-card-heading"><div><h2 id="client-chart-title">Cadastros por dia</h2><p>{result.totalElements} cliente{result.totalElements === 1 ? '' : 's'} encontrado{result.totalElements === 1 ? '' : 's'}</p></div></div>
        {status.loading ? <p className="report-empty">Carregando relatório…</p> : chartData.length === 0 ? <p className="report-empty">Nenhum cliente encontrado para estes filtros.</p> : <div className="revenue-chart" role="img" aria-label="Gráfico de clientes cadastrados por dia">{chartData.map((item) => <div className="chart-column" key={item.day}><span className="chart-value">{item.total}</span><div className="chart-bar" style={{ height: `${Math.max((item.total / chartMax) * 100, 4)}%` }} /><span className="chart-label">{item.day.split('-').reverse().slice(0, 2).join('/')}</span></div>)}</div>}
      </section>
      <section className="report-card report-table-card" aria-labelledby="client-table-title"><h2 id="client-table-title">Clientes</h2>{status.loading ? <p className="report-empty">Carregando clientes…</p> : <div className="table-scroll"><table><thead><tr><th>Nome</th><th>E-mail</th><th>Telefone</th><th>Cadastro</th><th>Atualização</th></tr></thead><tbody>{result.content.map((client) => <tr key={client.id}><td>{client.nome}</td><td>{client.email || '—'}</td><td>{client.telefone || '—'}</td><td>{formatDateTime(client.criadoEm)}</td><td>{formatDateTime(client.atualizadoEm)}</td></tr>)}</tbody></table>{result.content.length === 0 && <p className="report-empty">Nenhum cliente para exibir.</p>}</div>}
      </section>
    </div>
  </div></main>
}
