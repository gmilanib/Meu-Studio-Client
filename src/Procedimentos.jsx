import { useEffect, useRef, useState } from 'react'
import Header from './Header.jsx'
import { apiFetch, getApiError } from './api.js'
import { useProcedimentos } from './useProcedimentos.js'
import './Procedimentos.css'

const emptyForm = { nome: '', descricao: '', preco: '', duracaoMinutos: '', categoria: '' }
const initialFilters = { nome: '', categoria: '', ativo: 'true', page: 0 }
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export default function ProcedimentosPage() {
  const [filters, setFilters] = useState(initialFilters)
  const [draftFilters, setDraftFilters] = useState(initialFilters)
  const [revision, setRevision] = useState(0)
  const result = useProcedimentos(filters, revision)
  const [categories, setCategories] = useState([])
  const [categoryError, setCategoryError] = useState('')
  const [editor, setEditor] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [confirmation, setConfirmation] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const nameInput = useRef(null)

  useEffect(() => {
    let current = true
    async function loadCategories() {
      try {
        const response = await apiFetch('/procedimentos/categorias')
        if (!response.ok) throw new Error('Não foi possível carregar as sugestões de categorias.')
        const data = await response.json()
        if (current) { setCategories(data); setCategoryError('') }
      } catch (error) { if (current) setCategoryError(error.message) }
    }
    loadCategories()
    return () => { current = false }
  }, [revision])

  useEffect(() => { if (editor) nameInput.current?.focus() }, [editor])

  function openEditor(item = {}) {
    setConfirmation(null)
    setEditor(item)
    setForm({ nome: item.nome || '', descricao: item.descricao || '', preco: item.preco ?? '', duracaoMinutos: item.duracaoMinutos ?? '', categoria: item.categoria || '' })
    setMessage({ type: '', text: '' })
  }

  function refresh() {
    setFilters((current) => ({ ...current, page: 0 }))
    setRevision((current) => current + 1)
  }

  async function save(event) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setMessage({ type: '', text: '' })
    try {
      const response = await apiFetch(editor.id ? `/procedimentos/${editor.id}` : '/procedimentos', {
        method: editor.id ? 'PUT' : 'POST',
        body: JSON.stringify({ ...form, nome: form.nome.trim(), preco: Number(form.preco), duracaoMinutos: Number(form.duracaoMinutos) }),
      })
      if (!response.ok) throw new Error(await getApiError(response, 'Não foi possível salvar o procedimento.'))
      setEditor(null)
      setMessage({ type: 'success', text: 'Procedimento salvo com sucesso.' })
      refresh()
    } catch (error) { setMessage({ type: 'error', text: error.message }) }
    finally { setBusy(false) }
  }

  async function changeStatus() {
    if (busy) return
    setBusy(true)
    setMessage({ type: '', text: '' })
    try {
      const response = await apiFetch(`/procedimentos/${confirmation.id}/status`, {
        method: 'PUT', body: JSON.stringify({ ativo: !confirmation.ativo }),
      })
      if (!response.ok) throw new Error(await getApiError(response, 'Não foi possível alterar a situação.'))
      setMessage({ type: 'success', text: `Procedimento ${confirmation.ativo ? 'desativado' : 'reativado'} com sucesso.` })
      setConfirmation(null)
      refresh()
    } catch (error) { setMessage({ type: 'error', text: error.message }) }
    finally { setBusy(false) }
  }

  function updateForm(event) { setForm({ ...form, [event.target.name]: event.target.value }) }

  return <main className="app-shell"><div className="app-frame"><Header />
    <div className="report-page procedure-page">
      <p className="eyebrow">Catálogo</p><h1>Procedimentos</h1>
      <p className="report-intro">Organize os serviços, preços e tempos de atendimento do seu studio.</p>
      <button type="button" onClick={() => openEditor()} disabled={busy || !!editor}>Cadastrar procedimento</button>
      {message.text && <p className={`form-message ${message.type}`} role="alert">{message.text}</p>}
      {editor && <section className="report-card" aria-labelledby="procedure-editor-title">
        <h2 id="procedure-editor-title">{editor.id ? 'Editar procedimento' : 'Novo procedimento'}</h2>
        <form className="procedure-form" onSubmit={save}>
          <fieldset disabled={busy}>
            <label>Nome<input ref={nameInput} name="nome" required maxLength={160} value={form.nome} onChange={updateForm} /></label>
            <label>Descrição<textarea name="descricao" maxLength={2000} value={form.descricao} onChange={updateForm} /></label>
            <label>Preço (R$)<input name="preco" type="number" required min="0.01" max="9999999999.99" step="0.01" value={form.preco} onChange={updateForm} /></label>
            <label>Duração (minutos)<input name="duracaoMinutos" type="number" required min="1" max="2147483647" step="1" value={form.duracaoMinutos} onChange={updateForm} /></label>
            <label>Categoria<input name="categoria" list="procedure-categories" maxLength={80} value={form.categoria} onChange={updateForm} /></label>
            <datalist id="procedure-categories">{categories.map((category) => <option key={category} value={category} />)}</datalist>
            <div className="procedure-actions"><button type="submit">{busy ? 'Salvando…' : 'Salvar procedimento'}</button><button type="button" className="secondary-action" onClick={() => setEditor(null)}>Cancelar edição</button></div>
          </fieldset>
        </form>
      </section>}
      {categoryError && <p role="alert">{categoryError} <button type="button" onClick={() => setRevision(revision + 1)}>Recarregar categorias</button></p>}
      <form className="report-filters" onSubmit={(event) => { event.preventDefault(); setFilters({ ...draftFilters, page: 0 }) }}>
        <label>Buscar por nome<input type="search" value={draftFilters.nome} onChange={(event) => setDraftFilters({ ...draftFilters, nome: event.target.value })} /></label>
        <label>Filtrar categoria<select value={draftFilters.categoria} onChange={(event) => setDraftFilters({ ...draftFilters, categoria: event.target.value })}><option value="">Todas as categorias</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
        <label>Situação<select value={draftFilters.ativo} onChange={(event) => setDraftFilters({ ...draftFilters, ativo: event.target.value })}><option value="true">Ativos</option><option value="false">Inativos</option><option value="">Todos</option></select></label>
        <div className="filter-actions"><button type="submit">Aplicar filtros</button><button type="button" className="secondary-action" onClick={() => { setDraftFilters(initialFilters); setFilters(initialFilters) }}>Limpar filtros</button></div>
      </form>
      {confirmation && <section className="report-card procedure-confirmation" aria-labelledby="confirm-status-title">
        <h2 id="confirm-status-title">{confirmation.ativo ? 'Desativar' : 'Reativar'} {confirmation.nome}?</h2>
        <p>{confirmation.ativo ? 'O procedimento deixará de aparecer em novos lançamentos. O histórico será preservado.' : 'O procedimento voltará a ficar disponível para novos lançamentos.'}</p>
        <div className="procedure-actions"><button type="button" disabled={busy} onClick={changeStatus}>{busy ? 'Atualizando…' : 'Confirmar alteração'}</button><button type="button" disabled={busy} className="secondary-action" onClick={() => setConfirmation(null)}>Cancelar alteração</button></div>
      </section>}
      <section className="report-card report-table-card" aria-labelledby="procedure-list-title">
        <h2 id="procedure-list-title">Catálogo de procedimentos</h2>
        {result.loading ? <p role="status">Carregando procedimentos…</p> : result.error ? <p role="alert">{result.error} <button type="button" onClick={refresh}>Tentar novamente</button></p> : <>
          <p>{result.totalElements} procedimento(s) encontrado(s)</p>
          <div className="table-scroll"><table><thead><tr><th>Nome</th><th>Categoria</th><th>Preço</th><th>Duração</th><th>Situação</th><th>Ações</th></tr></thead>
            <tbody>{result.content.map((item) => <tr key={item.id}>
              <td><strong>{item.nome}</strong>{item.descricao && <p className="procedure-description">{item.descricao}</p>}</td><td>{item.categoria || '—'}</td><td>{money.format(item.preco)}</td><td>{item.duracaoMinutos} min</td><td>{item.ativo ? 'Ativo' : 'Inativo'}</td>
              <td><div className="procedure-actions"><button type="button" disabled={busy || !!editor} onClick={() => openEditor(item)} aria-label={`Editar ${item.nome}`}>Editar</button><button type="button" disabled={busy || !!editor} className="secondary-action" onClick={() => { setConfirmation(item); setMessage({ type: '', text: '' }) }} aria-label={`${item.ativo ? 'Desativar' : 'Reativar'} ${item.nome}`}>{item.ativo ? 'Desativar' : 'Reativar'}</button></div></td>
            </tr>)}</tbody></table></div>
          {result.content.length === 0 && <p className="report-empty">Nenhum procedimento encontrado para estes filtros.</p>}
          {result.totalPages > 1 && <nav className="procedure-actions" aria-label="Paginação do catálogo"><button type="button" disabled={filters.page === 0} onClick={() => setFilters({ ...filters, page: filters.page - 1 })}>Página anterior</button><span>Página {filters.page + 1} de {result.totalPages}</span><button type="button" disabled={filters.page + 1 >= result.totalPages} onClick={() => setFilters({ ...filters, page: filters.page + 1 })}>Próxima página</button></nav>}
        </>}
      </section>
    </div>
  </div></main>
}
