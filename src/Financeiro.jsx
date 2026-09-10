import { useEffect, useState } from 'react'
import Header from './Header.jsx'
import { apiFetch, getApiError } from './api.js'

function getToday() {
  const date = new Date()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

const today = getToday()

export default function FinanceiroPage() {
  const [form, setForm] = useState({ data: today, cliente: '', procedimento: '', valor: '', meioDePagamento: '' })
  const [clientes, setClientes] = useState([])
  const [status, setStatus] = useState({ type: '', message: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function loadClientes() {
      try {
        const response = await apiFetch('/clientes')
        if (response.ok) setClientes(await response.json())
      } catch {
        // O lançamento continua disponível mesmo que a sugestão de clientes falhe.
      }
    }
    loadClientes()
  }, [])

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setStatus({ type: '', message: '' })
    setSubmitting(true)
    try {
      const response = await apiFetch('/financeiro/lancar', {
        method: 'POST',
        body: JSON.stringify({ ...form, valor: Number(form.valor) }),
      })
      if (!response.ok) throw new Error(await getApiError(response, 'Não foi possível lançar a receita.'))

      setStatus({ type: 'success', message: 'Receita lançada com sucesso.' })
      setForm({ data: today, cliente: '', procedimento: '', valor: '', meioDePagamento: '' })
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Não foi possível lançar a receita.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Header />
      <main className="page-content">
        <section className="financial-card" aria-labelledby="financial-title">
          <h1 id="financial-title">Lançar receita</h1>
          <p>Registre um faturamento já realizado pelo studio.</p>
          <form className="financial-form" onSubmit={handleSubmit}>
            <label htmlFor="data">Data</label>
            <input id="data" name="data" type="date" value={form.data} onChange={updateField} max={today} required />
            <label htmlFor="cliente">Cliente</label>
            <input id="cliente" name="cliente" type="text" value={form.cliente} onChange={updateField} list="clientes-cadastrados" maxLength="120" required />
            <datalist id="clientes-cadastrados">{clientes.map((cliente) => <option key={cliente.id} value={cliente.nome} />)}</datalist>
            <label htmlFor="procedimento">Procedimento</label>
            <input id="procedimento" name="procedimento" type="text" value={form.procedimento} onChange={updateField} maxLength="160" required />
            <label htmlFor="valor">Valor</label>
            <input id="valor" name="valor" type="number" value={form.valor} onChange={updateField} min="0.01" max="9999999999.99" step="0.01" inputMode="decimal" required />
            <label htmlFor="meioDePagamento">Meio de pagamento</label>
            <input id="meioDePagamento" name="meioDePagamento" type="text" value={form.meioDePagamento} onChange={updateField} maxLength="30" placeholder="Ex.: PIX" required />
            {status.message && <p className={`form-message ${status.type}`} role="alert">{status.message}</p>}
            <button type="submit" disabled={submitting}>{submitting ? 'Lançando…' : 'Lançar receita'}</button>
          </form>
        </section>
      </main>
    </>
  )
}
