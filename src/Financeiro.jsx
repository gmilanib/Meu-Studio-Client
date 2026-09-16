import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import Header from './Header.jsx'
import { apiFetch, getApiError } from './api.js'
import ProcedimentoSelect from './ProcedimentoSelect.jsx'
import ClienteInput from './ClienteInput.jsx'
import './Procedimentos.css'

function getToday() {
  const date = new Date()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function getCurrentTime() {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(new Date())
}

export default function FinanceiroPage() {
  const today = getToday()
  const [form, setForm] = useState({ data: today, horario: getCurrentTime(), cliente: '', clienteId: null, procedimentoId: '', valor: '', meioDePagamento: '' })
  const [selected, setSelected] = useState(null)
  const [catalogRevision, setCatalogRevision] = useState(0)
  const [clientes, setClientes] = useState([])
  const [status, setStatus] = useState({ type: '', message: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function loadClientes() {
      try {
        const entries = []
        let page = 0
        while (true) {
          const response = await apiFetch(`/clientes?page=${page}&size=50`)
          if (!response.ok) return
          const clientPage = await response.json()
          if (!clientPage.content?.length) break
          entries.push(...clientPage.content)
          page += 1
        }
        setClientes(entries)
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
    if (submitting || !selected) return
    setStatus({ type: '', message: '' })
    setSubmitting(true)
    try {
      const response = await apiFetch('/financeiro/lancar', {
        method: 'POST',
        body: JSON.stringify({ ...form, valor: Number(form.valor) }),
      })
      if (!response.ok) {
        if (response.status === 400 || response.status === 404) {
          setSelected(null)
          setForm((current) => ({ ...current, procedimentoId: '' }))
          setCatalogRevision((current) => current + 1)
        }
        throw new Error(await getApiError(response, 'Não foi possível lançar a receita.'))
      }

      setStatus({ type: 'success', message: 'Receita lançada com sucesso.' })
      setForm({ data: getToday(), horario: getCurrentTime(), cliente: '', clienteId: null, procedimentoId: '', valor: '', meioDePagamento: '' })
      setSelected(null)
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Não foi possível lançar a receita.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="app-shell"><div className="app-frame"><Header />
      <div className="page-content">
        <section className="financial-card" aria-labelledby="financial-title">
          <p className="eyebrow">Financeiro</p>
          <h1 id="financial-title">Lançar receita</h1>
          <p>Registre um faturamento já realizado pelo studio.</p>
          <nav className="financial-switch" aria-label="Opções financeiras"><Link to="/financeiro" className="active">Lançar faturamento</Link><Link to="/financeiro/relatorio">Relatório de faturamentos</Link></nav>
          <form className="financial-form" onSubmit={handleSubmit}>
            <label htmlFor="data">Data</label>
            <input id="data" name="data" type="date" value={form.data} onChange={updateField} max={today} required />
            <label htmlFor="horario">Horário</label>
            <input id="horario" name="horario" type="time" value={form.horario} onChange={updateField} />
            <ClienteInput value={form.cliente} clienteId={form.clienteId} clientes={clientes} disabled={submitting}
              onChange={(cliente, clienteId) => setForm((current) => ({ ...current, cliente, clienteId }))} />
            <ProcedimentoSelect selected={selected} disabled={submitting} revision={catalogRevision} onSelect={(item) => {
              setSelected(item)
              setForm((current) => ({ ...current, procedimentoId: item?.id || '', valor: item ? String(item.preco) : '' }))
            }} />
            <label htmlFor="valor">Valor</label>
            <input id="valor" name="valor" type="number" value={form.valor} onChange={updateField} min="0.01" max="9999999999.99" step="0.01" inputMode="decimal" required />
            <label htmlFor="meioDePagamento">Meio de pagamento</label>
            <input id="meioDePagamento" name="meioDePagamento" type="text" value={form.meioDePagamento} onChange={updateField} maxLength="30" placeholder="Ex.: PIX" required />
            {status.message && <p className={`form-message ${status.type}`} role="alert">{status.message}</p>}
            <button type="submit" disabled={submitting || !selected}>{submitting ? 'Lançando…' : 'Lançar receita'}</button>
          </form>
        </section>
      </div>
    </div></main>
  )
}
