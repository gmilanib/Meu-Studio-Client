import { useState } from 'react'
import { Link } from 'react-router'
import { useProcedimentos } from './useProcedimentos.js'

export default function ProcedimentoSelect({ selected, onSelect, disabled, revision }) {
  const [query, setQuery] = useState({ nome: '', page: 0, ativo: 'true' })
  const [retry, setRetry] = useState(0)
  const result = useProcedimentos(query, `${revision}-${retry}`)
  const options = selected && !result.content.some((item) => item.id === selected.id)
    ? [selected, ...result.content] : result.content

  return <fieldset className="procedure-picker" disabled={disabled}>
    <legend>Procedimento</legend>
    <label htmlFor="buscar-procedimento">Buscar procedimento</label>
    <input id="buscar-procedimento" type="search" value={query.nome} onChange={(event) => setQuery({ ...query, nome: event.target.value, page: 0 })} />
    <label htmlFor="procedimentoId">Procedimento ativo</label>
    <select id="procedimentoId" required value={selected?.id || ''} onChange={(event) => onSelect(options.find((item) => item.id === event.target.value) || null)}>
      <option value="">Selecione um procedimento</option>
      {options.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
    </select>
    {result.loading && <p role="status">Carregando procedimentos…</p>}
    {result.error && <p role="alert">{result.error} <button type="button" onClick={() => setRetry(retry + 1)}>Tentar novamente</button></p>}
    {!result.loading && !result.error && result.content.length === 0 && <p>Nenhum procedimento ativo encontrado. <Link to="/procedimentos">Gerenciar procedimentos</Link></p>}
    {result.totalPages > 1 && <div className="procedure-actions" aria-label="Páginas de procedimentos">
      <button type="button" disabled={query.page === 0} onClick={() => setQuery({ ...query, page: query.page - 1 })}>Anteriores</button>
      <span>Página {query.page + 1} de {result.totalPages}</span>
      <button type="button" disabled={query.page + 1 >= result.totalPages} onClick={() => setQuery({ ...query, page: query.page + 1 })}>Próximos</button>
    </div>}
  </fieldset>
}
