import { useEffect, useMemo, useState } from 'react'
import Header from './Header.jsx'
import FinancialNav from './FinancialNav.jsx'
import { apiFetch, getApiError } from './api.js'
import './Procedimentos.css'

const initialFilters = { descricao: '', categoria: '', tipo: '', situacao: '', fornecedor: '', meioDePagamento: '', data: '', dataInicio: '', dataFim: '' }
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const date = (value) => value ? value.split('-').reverse().join('/') : '—'
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })

function Modal({ title, children, onClose }) {
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="expense-modal-title">
      <h2 id="expense-modal-title">{title}</h2>{children}
    </section>
  </div>
}

export default function RelatorioDespesasPage() {
  const [filters, setFilters] = useState(initialFilters)
  const [rows, setRows] = useState([])
  const [status, setStatus] = useState({ loading: true, error: '' })
  const [message, setMessage] = useState('')
  const [action, setAction] = useState(null)
  const [busy, setBusy] = useState(false)

  async function load(next = filters) {
    const params = new URLSearchParams({ size: '50' })
    Object.entries(next).forEach(([key, value]) => { if (value.trim()) params.set(key, value.trim()) })
    try {
      const entries = []; let page = 0
      while (true) {
        params.set('page', String(page))
        const response = await apiFetch(`/financeiro/despesas?${params}`)
        if (!response.ok) throw new Error(await getApiError(response, 'Não foi possível carregar as despesas.'))
        const data = await response.json()
        if (!data.content.length) break
        entries.push(...data.content); page += 1
      }
      setRows(entries); setStatus({ loading: false, error: '' })
    } catch (error) { setStatus({ loading: false, error: error.message || 'Não foi possível carregar as despesas.' }) }
  }

  useEffect(() => { const timer = setTimeout(() => load(initialFilters), 0); return () => clearTimeout(timer) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function updateFilter(event) {
    const { name, value } = event.target
    setFilters((current) => ({ ...current, [name]: value,
      ...(name === 'data' && value ? { dataInicio: '', dataFim: '' } : {}),
      ...((name === 'dataInicio' || name === 'dataFim') && value ? { data: '' } : {}) }))
  }

  function open(type, row) {
    setMessage('')
    if (type === 'pay') setAction({ type, row, dataPagamento: today(), valorPago: '', meioDePagamento: '' })
    else if (type === 'edit') setAction({ type, row, draft: { ...row, situacao: row.situacao === 'VENCIDA' ? 'PENDENTE' : row.situacao, valorPrevisto: String(row.valorPrevisto), valorPago: row.valorPago == null ? '' : String(row.valorPago) } })
    else setAction({ type, row })
  }

  async function confirm() {
    const { type, row } = action
    const requests = {
      payConfirm: [`/financeiro/despesas/${row.id}/pagamento`, { method: 'PUT', body: JSON.stringify({ dataPagamento: action.dataPagamento, valorPago: Number(action.valorPago), meioDePagamento: action.meioDePagamento }) }],
      cancel: [`/financeiro/despesas/${row.id}/cancelamento`, { method: 'PUT' }],
      restore: [`/financeiro/despesas/${row.id}/cancelamento`, { method: 'DELETE' }],
      undo: [`/financeiro/despesas/${row.id}/pagamento`, { method: 'DELETE' }],
      delete: [`/financeiro/despesas/${row.id}`, { method: 'DELETE' }],
      editConfirm: [`/financeiro/despesas/${row.id}`, { method: 'PUT', body: JSON.stringify({ ...action.draft, valorPrevisto: Number(action.draft?.valorPrevisto), valorPago: action.draft?.valorPago ? Number(action.draft.valorPago) : null }) }],
    }
    const messages = { payConfirm: 'Pagamento registrado', cancel: 'Despesa cancelada', restore: 'Despesa restaurada', undo: 'Pagamento desfeito', delete: 'Despesa excluída', editConfirm: 'Despesa atualizada' }
    setBusy(true)
    try {
      const [path, options] = requests[type]
      const response = await apiFetch(path, options)
      if (!response.ok) throw new Error(await getApiError(response, 'Não foi possível concluir a operação.'))
      setAction(null); setMessage(`${messages[type]} com sucesso.`); setStatus({ loading: true, error: '' }); await load(filters)
    } catch (error) { setAction(null); setMessage(error.message || 'Não foi possível concluir a operação.') }
    finally { setBusy(false) }
  }

  const chart = useMemo(() => Object.values(rows.reduce((all, row) => {
    const key = row.dataPagamento || row.vencimento
    all[key] ??= { key, value: 0 }
    all[key].value += Number(row.valorPago ?? row.valorPrevisto)
    return all
  }, {})).sort((a, b) => a.key.localeCompare(b.key)), [rows])
  const max = Math.max(...chart.map((item) => item.value), 1)

  return <main className="app-shell"><div className="app-frame"><Header /><div className="report-page">
    <p className="eyebrow">Financeiro</p><h1>Relatório de despesas</h1><p className="report-intro">Consulte, corrija e acompanhe todas as despesas do studio.</p><FinancialNav />
    <form className="report-filters" onSubmit={(event) => { event.preventDefault(); setStatus({ loading: true, error: '' }); load(filters) }}>
      <label>Descrição<input name="descricao" value={filters.descricao} onChange={updateFilter} /></label>
      <label>Categoria<input name="categoria" value={filters.categoria} onChange={updateFilter} /></label>
      <label>Tipo<select name="tipo" value={filters.tipo} onChange={updateFilter}><option value="">Todos</option><option value="FIXA">Fixa</option><option value="VARIAVEL">Variável</option></select></label>
      <label>Situação<select name="situacao" value={filters.situacao} onChange={updateFilter}><option value="">Todas</option>{['PENDENTE', 'VENCIDA', 'PAGA', 'CANCELADA'].map((item) => <option key={item}>{item}</option>)}</select></label>
      <label>Fornecedor<input name="fornecedor" value={filters.fornecedor} onChange={updateFilter} /></label>
      <label>Meio de pagamento<input name="meioDePagamento" value={filters.meioDePagamento} onChange={updateFilter} /></label>
      <label>Data exata<input name="data" type="date" value={filters.data} onChange={updateFilter} /></label>
      <label>Data inicial<input name="dataInicio" type="date" value={filters.dataInicio} onChange={updateFilter} /></label>
      <label>Data final<input name="dataFim" type="date" value={filters.dataFim} onChange={updateFilter} /></label>
      <div className="filter-actions"><button>Aplicar filtros</button><button type="button" className="secondary-action" onClick={() => { setFilters(initialFilters); load(initialFilters) }}>Limpar</button></div>
    </form>
    {status.error && <p role="alert" className="form-error">{status.error}</p>}{message && <p role="alert" className="form-message success">{message}</p>}
    <section className="report-card"><h2>Despesas por data efetiva</h2>{status.loading ? <p>Carregando relatório…</p> : <div className="revenue-chart" role="img" aria-label="Gráfico de despesas por data efetiva">{chart.map((item) => <div className="chart-column" key={item.key}><span className="chart-value">{money.format(item.value)}</span><div className="chart-bar expense-bar" style={{ height: `${Math.max(item.value / max * 100, 4)}%` }} /><span className="chart-label">{date(item.key).slice(0, 5)}</span></div>)}</div>}</section>
    <section className="report-card"><h2>Lançamentos</h2><div className="table-scroll"><table><thead><tr><th>Vencimento</th><th>Descrição</th><th>Categoria</th><th>Tipo</th><th>Situação</th><th>Previsto</th><th>Pago</th><th>Ações</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td>{date(row.vencimento)}</td><td>{row.descricao}</td><td>{row.categoria}</td><td>{row.tipo}</td><td>{row.situacao}</td><td>{money.format(row.valorPrevisto)}</td><td>{row.valorPago == null ? '—' : money.format(row.valorPago)}</td><td><div className="row-actions"><button onClick={() => open('edit', row)}>Editar</button>{['PENDENTE', 'VENCIDA'].includes(row.situacao) && <button onClick={() => open('pay', row)}>Pagar</button>}{row.situacao === 'PAGA' && <button onClick={() => open('undo', row)}>Desfazer pagamento</button>}{row.situacao === 'CANCELADA' ? <button onClick={() => open('restore', row)}>Restaurar</button> : <button onClick={() => open('cancel', row)}>Cancelar despesa</button>}<button className="danger-action" onClick={() => open('delete', row)}>Excluir</button></div></td></tr>)}</tbody></table>{!status.loading && rows.length === 0 && <p className="report-empty">Nenhuma despesa encontrada.</p>}</div></section>
  </div></div>
  {action?.type === 'pay' && <Modal title="Registrar pagamento" onClose={() => setAction(null)}><form className="modal-form" onSubmit={(event) => { event.preventDefault(); setAction({ ...action, type: 'payConfirm' }) }}><label>Data do pagamento<input type="date" required value={action.dataPagamento} onChange={(event) => setAction({ ...action, dataPagamento: event.target.value })} /></label><label>Valor pago<input type="number" min="0.01" step="0.01" required value={action.valorPago} onChange={(event) => setAction({ ...action, valorPago: event.target.value })} /></label><label>Meio de pagamento<input required maxLength="30" value={action.meioDePagamento} onChange={(event) => setAction({ ...action, meioDePagamento: event.target.value })} /></label><div className="modal-actions"><button>Revisar pagamento</button><button type="button" className="secondary-action" onClick={() => setAction(null)}>Voltar</button></div></form></Modal>}
  {action?.type === 'edit' && <Modal title="Editar despesa" onClose={() => setAction(null)}><form className="modal-form" onSubmit={(event) => { event.preventDefault(); setAction({ ...action, type: 'editConfirm' }) }}>{[['Descrição', 'descricao'], ['Categoria', 'categoria'], ['Fornecedor', 'fornecedor'], ['Observações', 'observacoes']].map(([label, name]) => <label key={name}>{label}<input required={name === 'descricao' || name === 'categoria'} value={action.draft[name] || ''} onChange={(event) => setAction({ ...action, draft: { ...action.draft, [name]: event.target.value } })} /></label>)}<label>Tipo<select value={action.draft.tipo} onChange={(event) => setAction({ ...action, draft: { ...action.draft, tipo: event.target.value } })}><option value="FIXA">Fixa</option><option value="VARIAVEL">Variável</option></select></label><label>Valor previsto<input type="number" min="0.01" step="0.01" required value={action.draft.valorPrevisto} onChange={(event) => setAction({ ...action, draft: { ...action.draft, valorPrevisto: event.target.value } })} /></label><label>Vencimento<input type="date" required value={action.draft.vencimento} onChange={(event) => setAction({ ...action, draft: { ...action.draft, vencimento: event.target.value } })} /></label><div className="modal-actions"><button>Revisar alteração</button><button type="button" className="secondary-action" onClick={() => setAction(null)}>Voltar</button></div></form></Modal>}
  {action && !['pay', 'edit'].includes(action.type) && <Modal title="Confirmar operação" onClose={() => !busy && setAction(null)}><p>{action.type === 'delete' ? 'A exclusão é definitiva.' : `Confirme a operação para ${action.row.descricao}.`}</p><div className="modal-actions"><button className={action.type === 'delete' ? 'danger-action' : ''} disabled={busy} onClick={confirm}>{({ payConfirm: 'Confirmar pagamento', cancel: 'Confirmar cancelamento', restore: 'Confirmar restauração', undo: 'Confirmar desfazer pagamento', delete: 'Excluir definitivamente', editConfirm: 'Confirmar alteração' })[action.type]}</button><button className="secondary-action" onClick={() => setAction(null)}>Voltar</button></div></Modal>}
  </main>
}
