const normalize = (value) => value.trim().toLocaleLowerCase('pt-BR')

export default function ClienteInput({ id = 'cliente', value, clienteId, clientes, onChange, disabled = false }) {
  const query = normalize(value)
  const suggestions = query
    ? clientes.filter((cliente) => normalize(cliente.nome).includes(query)).slice(0, 6)
    : []

  function updateText(nextValue) {
    const exactMatches = clientes.filter((cliente) => normalize(cliente.nome) === normalize(nextValue))
    onChange(nextValue, exactMatches.length === 1 ? exactMatches[0].id : null)
  }

  return <div className="client-picker">
    <label htmlFor={id}>Cliente</label>
    <input id={id} name="cliente" type="text" value={value} disabled={disabled} maxLength="120" required
      autoComplete="off" aria-describedby={`${id}-status`} onChange={(event) => updateText(event.target.value)} />
    {suggestions.length > 0 && !clienteId && <div className="client-suggestions" aria-label="Sugestões de clientes">
      {suggestions.map((cliente) => <button key={cliente.id} type="button" disabled={disabled}
        onClick={() => onChange(cliente.nome, cliente.id)}>
        <span>{cliente.nome}</span><small>{cliente.telefone || 'Telefone não informado'}</small>
      </button>)}
    </div>}
    <p id={`${id}-status`} className={`client-link-status ${clienteId ? 'linked' : 'unlinked'}`}>
      {clienteId ? 'Cliente vinculado ao cadastro.' : value.trim() ? 'Aviso: cliente não cadastrado na plataforma. O lançamento será salvo como texto livre.' : ''}
    </p>
  </div>
}
