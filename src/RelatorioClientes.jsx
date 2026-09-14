import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import Header from './Header.jsx'
import { apiFetch, getApiError } from './api.js'

const initialFilters = { nome: '', email: '', telefone: '', criadoEm: '', criadoEmInicio: '', criadoEmFim: '', atualizadoEm: '', atualizadoEmInicio: '', atualizadoEmFim: '' }

function Modal({ title, children, onClose }) {
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title"><h2 id="modal-title">{title}</h2>{children}</section></div>
}

export default function RelatorioClientesPage() {
  const [filters, setFilters] = useState(initialFilters)
  const [result, setResult] = useState({ content: [], totalElements: 0 })
  const [status, setStatus] = useState({ loading: true, error: '' })
  const [message, setMessage] = useState({ type: '', text: '' })
  const [editor, setEditor] = useState(null)
  const [confirmation, setConfirmation] = useState(null)
  const [busy, setBusy] = useState(false)

  async function load(nextFilters = filters) {
    const params = new URLSearchParams({ size: '50' })
    Object.entries(nextFilters).forEach(([key, value]) => { const clean = value.trim(); if (clean) params.set(key, clean) })
    try {
      const entries = []; let page = 0
      while (true) {
        params.set('page', String(page))
        const response = await apiFetch(`/clientes?${params}`)
        if (!response.ok) throw new Error(await getApiError(response, 'Não foi possível carregar o relatório de clientes.'))
        const data = await response.json()
        if (!data.content.length) break
        entries.push(...data.content); page += 1
      }
      setResult({ content: entries, totalElements: entries.length }); setStatus({ loading: false, error: '' })
    } catch (error) { setStatus({ loading: false, error: error.message || 'Não foi possível carregar o relatório de clientes.' }) }
  }

  useEffect(() => { const timer = window.setTimeout(() => load(initialFilters), 0); return () => window.clearTimeout(timer) }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

  async function confirmAction() {
    setBusy(true); setMessage({ type: '', text: '' })
    try {
      const deleting = confirmation.type === 'delete'
      const client = deleting ? confirmation.client : confirmation.after
      const response = await apiFetch(`/clientes/${client.id}`, deleting ? { method: 'DELETE' } : { method: 'PUT', body: JSON.stringify({ nome: client.nome, telefone: client.telefone || null, email: client.email || null }) })
      if (!response.ok) throw new Error(await getApiError(response, deleting ? 'Não foi possível excluir o cliente.' : 'Não foi possível editar o cliente.'))
      setConfirmation(null); setEditor(null)
      setMessage({ type: 'success', text: deleting ? 'Cliente excluído com sucesso.' : 'Cliente atualizado com sucesso.' })
      setStatus({ loading: true, error: '' }); await load(filters)
    } catch (error) { setMessage({ type: 'error', text: error.message || 'Não foi possível concluir a operação.' }); setConfirmation(null) }
    finally { setBusy(false) }
  }

  const chartData = useMemo(() => Object.values(result.content.reduce((groups, client) => { const day = client.criadoEm.slice(0, 10); groups[day] ??= { day, total: 0 }; groups[day].total += 1; return groups }, {})).sort((a, b) => a.day.localeCompare(b.day)), [result.content])
  const chartMax = Math.max(...chartData.map((item) => item.total), 1)
  const formatDateTime = (value) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))

  return <main className="app-shell"><div className="app-frame"><Header /><div className="report-page">
    <p className="eyebrow">Clientes</p><h1>Relatório de clientes</h1><p className="report-intro">Pesquise clientes e acompanhe os cadastros realizados no período.</p>
    <nav className="financial-switch" aria-label="Opções de clientes"><Link to="/clientes">Cadastrar cliente</Link><Link to="/clientes/relatorio" className="active">Relatório de clientes</Link></nav>
    <form className="report-filters" onSubmit={(event) => { event.preventDefault(); setStatus({ loading: true, error: '' }); load(filters) }}>
      <label>Nome<input name="nome" value={filters.nome} onChange={updateFilter} placeholder="Buscar por nome" /></label><label>E-mail<input name="email" value={filters.email} onChange={updateFilter} placeholder="Buscar por e-mail" /></label><label>Telefone<input name="telefone" value={filters.telefone} onChange={updateFilter} placeholder="Com ou sem máscara" /></label>
      <label>Criação em<input name="criadoEm" type="date" value={filters.criadoEm} onChange={updateFilter} /></label><label>Criação inicial<input name="criadoEmInicio" type="date" value={filters.criadoEmInicio} onChange={updateFilter} max={filters.criadoEmFim || undefined} /></label><label>Criação final<input name="criadoEmFim" type="date" value={filters.criadoEmFim} onChange={updateFilter} min={filters.criadoEmInicio || undefined} /></label>
      <label>Atualização em<input name="atualizadoEm" type="date" value={filters.atualizadoEm} onChange={updateFilter} /></label><label>Atualização inicial<input name="atualizadoEmInicio" type="date" value={filters.atualizadoEmInicio} onChange={updateFilter} max={filters.atualizadoEmFim || undefined} /></label><label>Atualização final<input name="atualizadoEmFim" type="date" value={filters.atualizadoEmFim} onChange={updateFilter} min={filters.atualizadoEmInicio || undefined} /></label>
      <div className="filter-actions"><button type="submit">Aplicar filtros</button><button type="button" className="secondary-action" onClick={() => { setFilters(initialFilters); setStatus({ loading: true, error: '' }); load(initialFilters) }}>Limpar</button></div>
    </form>
    {status.error && <p className="form-error" role="alert">{status.error}</p>}{message.text && <p className={`form-message ${message.type}`} role="alert">{message.text}</p>}
    <section className="report-card" aria-labelledby="client-chart-title"><div className="report-card-heading"><div><h2 id="client-chart-title">Cadastros por dia</h2><p>{result.totalElements} cliente{result.totalElements === 1 ? '' : 's'} encontrado{result.totalElements === 1 ? '' : 's'}</p></div></div>{status.loading ? <p className="report-empty">Carregando relatório…</p> : chartData.length === 0 ? <p className="report-empty">Nenhum cliente encontrado para estes filtros.</p> : <div className="revenue-chart" role="img" aria-label="Gráfico de clientes cadastrados por dia">{chartData.map((item) => <div className="chart-column" key={item.day}><span className="chart-value">{item.total}</span><div className="chart-bar" style={{ height: `${Math.max((item.total / chartMax) * 100, 4)}%` }} /><span className="chart-label">{item.day.split('-').reverse().slice(0, 2).join('/')}</span></div>)}</div>}</section>
    <section className="report-card report-table-card" aria-labelledby="client-table-title"><h2 id="client-table-title">Clientes</h2>{status.loading ? <p className="report-empty">Carregando clientes…</p> : <div className="table-scroll"><table><thead><tr><th>Nome</th><th>E-mail</th><th>Telefone</th><th>Cadastro</th><th>Atualização</th><th>Ações</th></tr></thead><tbody>{result.content.map((client) => <tr key={client.id}><td>{client.nome}</td><td>{client.email || '—'}</td><td>{client.telefone || '—'}</td><td>{formatDateTime(client.criadoEm)}</td><td>{formatDateTime(client.atualizadoEm)}</td><td><div className="row-actions"><button type="button" onClick={() => { setEditor({ ...client }); setMessage({ type: '', text: '' }) }}>Editar</button><button type="button" className="danger-action" onClick={() => { setConfirmation({ type: 'delete', client }); setMessage({ type: '', text: '' }) }}>Excluir</button></div></td></tr>)}</tbody></table>{result.content.length === 0 && <p className="report-empty">Nenhum cliente para exibir.</p>}</div>}</section>
  </div></div>
  {editor && !confirmation && <Modal title="Editar cliente" onClose={() => setEditor(null)}><form className="modal-form" onSubmit={(event) => { event.preventDefault(); setConfirmation({ type: 'edit', before: result.content.find((item) => item.id === editor.id), after: editor }) }}><label>Nome<input value={editor.nome} maxLength="120" required onChange={(event) => setEditor({ ...editor, nome: event.target.value })} /></label><label>Telefone<input value={editor.telefone || ''} maxLength="20" onChange={(event) => setEditor({ ...editor, telefone: event.target.value })} /></label><p className="modal-note">O e-mail permanece oculto e será preservado.</p><div className="modal-actions"><button type="submit">Revisar alteração</button><button type="button" className="secondary-action" onClick={() => setEditor(null)}>Cancelar</button></div></form></Modal>}
  {confirmation?.type === 'edit' && <Modal title="Confirmar alteração" onClose={() => !busy && setConfirmation(null)}><p>Confira os dados antes de salvar:</p><dl className="change-list"><dt>Nome anterior</dt><dd>{confirmation.before.nome}</dd><dt>Novo nome</dt><dd>{confirmation.after.nome}</dd><dt>Telefone anterior</dt><dd>{confirmation.before.telefone || 'Não informado'}</dd><dt>Novo telefone</dt><dd>{confirmation.after.telefone || 'Não informado'}</dd></dl><div className="modal-actions"><button disabled={busy} onClick={confirmAction}>{busy ? 'Salvando…' : 'Confirmar alteração'}</button><button disabled={busy} className="secondary-action" onClick={() => setConfirmation(null)}>Voltar</button></div></Modal>}
  {confirmation?.type === 'delete' && <Modal title="Confirmar exclusão" onClose={() => !busy && setConfirmation(null)}><p>A exclusão é definitiva. Confirme os dados do cliente:</p><dl className="change-list"><dt>Nome</dt><dd>{confirmation.client.nome}</dd><dt>Telefone</dt><dd>{confirmation.client.telefone || 'Não informado'}</dd></dl><div className="modal-actions"><button disabled={busy} className="danger-action" onClick={confirmAction}>{busy ? 'Excluindo…' : 'Excluir definitivamente'}</button><button disabled={busy} className="secondary-action" onClick={() => setConfirmation(null)}>Cancelar</button></div></Modal>}
  </main>
}
