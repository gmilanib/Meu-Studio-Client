import { useEffect, useMemo, useState } from 'react'
import Header from './Header.jsx'
import FinancialNav from './FinancialNav.jsx'
import ClienteInput from './ClienteInput.jsx'
import ProcedimentoSelect from './ProcedimentoSelect.jsx'
import { apiFetch, getApiError } from './api.js'
import './Procedimentos.css'

const initialFilters = { cliente: '', procedimento: '', valor: '', meioDePagamento: '', data: '', dataInicio: '', dataFim: '' }
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const formatDate = (date) => date.split('-').reverse().join('/')

function Modal({ title, children, onClose }) {
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="financial-modal-title"><h2 id="financial-modal-title">{title}</h2>{children}</section></div>
}

export default function RelatorioFinanceiroPage() {
  const [filters, setFilters] = useState(initialFilters)
  const [result, setResult] = useState({ content: [], totalElements: 0 })
  const [clientes, setClientes] = useState([])
  const [status, setStatus] = useState({ loading: true, error: '' })
  const [message, setMessage] = useState({ type: '', text: '' })
  const [editor, setEditor] = useState(null)
  const [selectedProcedure, setSelectedProcedure] = useState(null)
  const [confirmation, setConfirmation] = useState(null)
  const [busy, setBusy] = useState(false)

  async function load(nextFilters = filters) {
    const params = new URLSearchParams({ size: '50' })
    Object.entries(nextFilters).forEach(([key, value]) => { const clean = value.trim(); if (clean) params.set(key, clean) })
    try {
      const entries = []; let page = 0
      while (true) {
        params.set('page', String(page))
        const response = await apiFetch(`/financeiro/faturamentos?${params}`)
        if (!response.ok) throw new Error(await getApiError(response, 'Não foi possível carregar o relatório.'))
        const data = await response.json()
        if (!data.content.length) break
        entries.push(...data.content); page += 1
      }
      setResult({ content: entries, totalElements: entries.length }); setStatus({ loading: false, error: '' })
    } catch (error) { setStatus({ loading: false, error: error.message || 'Não foi possível carregar o relatório.' }) }
  }

  async function loadClients() {
    try {
      const entries = []; let page = 0
      while (true) {
        const response = await apiFetch(`/clientes?page=${page}&size=50`)
        if (!response.ok) return
        const data = await response.json()
        if (!data.content.length) break
        entries.push(...data.content); page += 1
      }
      setClientes(entries)
    } catch { /* A edição ainda aceita cliente em texto livre. */ }
  }

  useEffect(() => { const timer = window.setTimeout(() => { load(initialFilters); loadClients() }, 0); return () => window.clearTimeout(timer) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function updateFilter(event) {
    const { name, value } = event.target
    setFilters((current) => ({ ...current, [name]: value, ...(name === 'data' && value ? { dataInicio: '', dataFim: '' } : {}), ...((name === 'dataInicio' || name === 'dataFim') && value ? { data: '' } : {}) }))
  }

  function openEditor(row) {
    setEditor({ ...row, valor: String(row.valor) })
    setSelectedProcedure({ id: row.procedimentoId, nome: row.procedimento, preco: row.valor })
    setMessage({ type: '', text: '' })
  }

  async function confirmAction() {
    setBusy(true); setMessage({ type: '', text: '' })
    try {
      const deleting = confirmation.type === 'delete'
      const row = deleting ? confirmation.row : confirmation.after
      const response = await apiFetch(`/financeiro/faturamentos/${row.id}`, deleting ? { method: 'DELETE' } : { method: 'PUT', body: JSON.stringify({ data: row.data, horario: row.horario, cliente: row.cliente, clienteId: row.clienteId, procedimentoId: row.procedimentoId, valor: Number(row.valor), meioDePagamento: row.meioDePagamento }) })
      if (!response.ok) throw new Error(await getApiError(response, deleting ? 'Não foi possível excluir o lançamento.' : 'Não foi possível editar o lançamento.'))
      setConfirmation(null); setEditor(null); setSelectedProcedure(null)
      setMessage({ type: 'success', text: deleting ? 'Lançamento excluído com sucesso.' : 'Lançamento atualizado com sucesso.' })
      setStatus({ loading: true, error: '' }); await load(filters)
    } catch (error) { setMessage({ type: 'error', text: error.message || 'Não foi possível concluir a operação.' }); setConfirmation(null) }
    finally { setBusy(false) }
  }

  const chartData = useMemo(() => Object.values(result.content.reduce((groups, row) => { groups[row.data] ??= { data: row.data, valor: 0 }; groups[row.data].valor += Number(row.valor); return groups }, {})).sort((a, b) => a.data.localeCompare(b.data)), [result.content])
  const chartMax = Math.max(...chartData.map((item) => item.valor), 1)

  return <main className="app-shell"><div className="app-frame"><Header /><div className="report-page">
    <p className="eyebrow">Financeiro</p><h1>Relatório de faturamentos</h1><p className="report-intro">Consulte os lançamentos e acompanhe o faturamento do período selecionado.</p>
    <FinancialNav />
    <form className="report-filters" onSubmit={(event) => { event.preventDefault(); setStatus({ loading: true, error: '' }); load(filters) }}>
      <label>Cliente<input name="cliente" value={filters.cliente} onChange={updateFilter} placeholder="Buscar por nome" /></label><label>Procedimento<input name="procedimento" value={filters.procedimento} onChange={updateFilter} placeholder="Buscar por procedimento" /></label><label>Valor exato<input name="valor" type="number" min="0" step="0.01" inputMode="decimal" value={filters.valor} onChange={updateFilter} placeholder="Ex.: 150,00" /></label><label>Meio de pagamento<input name="meioDePagamento" value={filters.meioDePagamento} onChange={updateFilter} placeholder="Ex.: PIX" /></label>
      <label>Data exata<input name="data" type="date" value={filters.data} onChange={updateFilter} /></label><label>Data inicial<input name="dataInicio" type="date" value={filters.dataInicio} onChange={updateFilter} max={filters.dataFim || undefined} /></label><label>Data final<input name="dataFim" type="date" value={filters.dataFim} onChange={updateFilter} min={filters.dataInicio || undefined} /></label><div className="filter-actions"><button type="submit">Aplicar filtros</button><button type="button" className="secondary-action" onClick={() => { setFilters(initialFilters); setStatus({ loading: true, error: '' }); load(initialFilters) }}>Limpar</button></div>
    </form>
    {status.error && <p className="form-error" role="alert">{status.error}</p>}{message.text && <p className={`form-message ${message.type}`} role="alert">{message.text}</p>}
    <section className="report-card" aria-labelledby="chart-title"><div className="report-card-heading"><div><h2 id="chart-title">Faturamento por dia</h2><p>{result.totalElements} lançamento{result.totalElements === 1 ? '' : 's'} encontrado{result.totalElements === 1 ? '' : 's'}</p></div></div>{status.loading ? <p className="report-empty">Carregando relatório…</p> : chartData.length === 0 ? <p className="report-empty">Nenhum faturamento encontrado para estes filtros.</p> : <div className="revenue-chart" role="img" aria-label="Gráfico de faturamento por dia">{chartData.map((item) => <div className="chart-column" key={item.data}><span className="chart-value">{money.format(item.valor)}</span><div className="chart-bar" style={{ height: `${Math.max((item.valor / chartMax) * 100, 4)}%` }} /><span className="chart-label">{item.data.split('-').reverse().slice(0, 2).join('/')}</span></div>)}</div>}</section>
    <section className="report-card report-table-card" aria-labelledby="table-title"><h2 id="table-title">Lançamentos</h2>{status.loading ? <p className="report-empty">Carregando lançamentos…</p> : <div className="table-scroll"><table><thead><tr><th>Data</th><th>Horário</th><th>Cliente</th><th>Procedimento</th><th>Pagamento</th><th>Valor</th><th>Ações</th></tr></thead><tbody>{result.content.map((row) => <tr key={row.id}><td>{formatDate(row.data)}</td><td>{row.horario}</td><td>{row.cliente}</td><td>{row.procedimento}</td><td>{row.meioDePagamento}</td><td>{money.format(row.valor)}</td><td><div className="row-actions"><button type="button" onClick={() => openEditor(row)}>Editar</button><button type="button" className="danger-action" onClick={() => { setConfirmation({ type: 'delete', row }); setMessage({ type: '', text: '' }) }}>Excluir</button></div></td></tr>)}</tbody></table>{result.content.length === 0 && <p className="report-empty">Nenhum lançamento para exibir.</p>}</div>}</section>
  </div></div>
  {editor && !confirmation && <Modal title="Editar lançamento" onClose={() => setEditor(null)}><form className="modal-form" onSubmit={(event) => { event.preventDefault(); setConfirmation({ type: 'edit', before: result.content.find((row) => row.id === editor.id), after: editor }) }}><label>Data<input type="date" required value={editor.data} max={new Date().toISOString().slice(0, 10)} onChange={(event) => setEditor({ ...editor, data: event.target.value })} /></label><label>Horário<input type="time" value={editor.horario} onChange={(event) => setEditor({ ...editor, horario: event.target.value })} /></label><ClienteInput id="cliente-edicao" value={editor.cliente} clienteId={editor.clienteId} clientes={clientes} disabled={busy} onChange={(cliente, clienteId) => setEditor({ ...editor, cliente, clienteId })} /><ProcedimentoSelect selected={selectedProcedure} disabled={busy} revision={0} onSelect={(item) => { setSelectedProcedure(item); setEditor({ ...editor, procedimentoId: item?.id || '', procedimento: item?.nome || '', ...(item ? { valor: String(item.preco) } : {}) }) }} /><label>Valor<input type="number" min="0.01" max="9999999999.99" step="0.01" required value={editor.valor} onChange={(event) => setEditor({ ...editor, valor: event.target.value })} /></label><label>Meio de pagamento<input maxLength="30" required value={editor.meioDePagamento} onChange={(event) => setEditor({ ...editor, meioDePagamento: event.target.value })} /></label><div className="modal-actions"><button type="submit" disabled={!editor.procedimentoId}>Revisar alteração</button><button type="button" className="secondary-action" onClick={() => setEditor(null)}>Cancelar</button></div></form></Modal>}
  {confirmation?.type === 'edit' && <Modal title="Confirmar alteração" onClose={() => !busy && setConfirmation(null)}><p>Confira todos os dados antes de salvar:</p><div className="comparison-grid"><strong>Antes</strong><strong>Depois</strong><span>{formatDate(confirmation.before.data)} às {confirmation.before.horario} · {confirmation.before.cliente}<br />{confirmation.before.procedimento} · {money.format(confirmation.before.valor)} · {confirmation.before.meioDePagamento}</span><span>{formatDate(confirmation.after.data)} às {confirmation.after.horario} · {confirmation.after.cliente}<br />{confirmation.after.procedimento} · {money.format(confirmation.after.valor)} · {confirmation.after.meioDePagamento}</span></div><div className="modal-actions"><button disabled={busy} onClick={confirmAction}>{busy ? 'Salvando…' : 'Confirmar alteração'}</button><button disabled={busy} className="secondary-action" onClick={() => setConfirmation(null)}>Voltar</button></div></Modal>}
  {confirmation?.type === 'delete' && <Modal title="Confirmar exclusão" onClose={() => !busy && setConfirmation(null)}><p>A exclusão é definitiva. Confirme o lançamento:</p><dl className="change-list"><dt>Data</dt><dd>{formatDate(confirmation.row.data)}</dd><dt>Horário</dt><dd>{confirmation.row.horario}</dd><dt>Cliente</dt><dd>{confirmation.row.cliente}</dd><dt>Procedimento</dt><dd>{confirmation.row.procedimento}</dd><dt>Valor</dt><dd>{money.format(confirmation.row.valor)}</dd><dt>Pagamento</dt><dd>{confirmation.row.meioDePagamento}</dd></dl><div className="modal-actions"><button disabled={busy} className="danger-action" onClick={confirmAction}>{busy ? 'Excluindo…' : 'Excluir definitivamente'}</button><button disabled={busy} className="secondary-action" onClick={() => setConfirmation(null)}>Cancelar</button></div></Modal>}
  </main>
}
