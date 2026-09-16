import { useState } from 'react'
import Header from './Header.jsx'
import FinancialNav from './FinancialNav.jsx'
import { apiFetch, getApiError } from './api.js'
import './Procedimentos.css'

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
const initialForm = () => ({
  descricao: '', categoria: '', tipo: 'VARIAVEL', situacao: 'PENDENTE',
  valorPrevisto: '', vencimento: today(), dataPagamento: today(), valorPago: '',
  meioDePagamento: '', fornecedor: '', observacoes: '',
})

export default function DespesasPage() {
  const [form, setForm] = useState(initialForm)
  const [status, setStatus] = useState({ type: '', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const paga = form.situacao === 'PAGA'

  function update(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function submit(event) {
    event.preventDefault()
    if (submitting) return
    setSubmitting(true); setStatus({ type: '', message: '' })
    const body = {
      ...form,
      valorPrevisto: Number(form.valorPrevisto),
      dataPagamento: paga ? form.dataPagamento : null,
      valorPago: paga ? Number(form.valorPago) : null,
      meioDePagamento: paga ? form.meioDePagamento : null,
      fornecedor: form.fornecedor || null,
      observacoes: form.observacoes || null,
    }
    try {
      const response = await apiFetch('/financeiro/despesas', { method: 'POST', body: JSON.stringify(body) })
      if (!response.ok) throw new Error(await getApiError(response, 'Não foi possível cadastrar a despesa.'))
      setForm(initialForm()); setStatus({ type: 'success', message: 'Despesa cadastrada com sucesso.' })
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Não foi possível cadastrar a despesa.' })
    } finally { setSubmitting(false) }
  }

  return <main className="app-shell"><div className="app-frame"><Header />
    <div className="page-content"><section className="financial-card" aria-labelledby="expense-title">
      <p className="eyebrow">Financeiro</p><h1 id="expense-title">Cadastrar despesa</h1>
      <p>Registre obrigações previstas, pagas ou canceladas do studio.</p><FinancialNav />
      <form className="financial-form" onSubmit={submit}>
        <label htmlFor="descricao">Descrição</label><input id="descricao" name="descricao" value={form.descricao} onChange={update} maxLength="160" required />
        <label htmlFor="categoria">Categoria</label><input id="categoria" name="categoria" value={form.categoria} onChange={update} maxLength="80" required />
        <label htmlFor="tipo">Tipo</label><select id="tipo" name="tipo" value={form.tipo} onChange={update}><option value="FIXA">Fixa</option><option value="VARIAVEL">Variável</option></select>
        <label htmlFor="situacao">Situação</label><select id="situacao" name="situacao" value={form.situacao} onChange={update}><option value="PENDENTE">Pendente</option><option value="PAGA">Paga</option><option value="CANCELADA">Cancelada</option></select>
        <label htmlFor="valorPrevisto">Valor previsto</label><input id="valorPrevisto" name="valorPrevisto" type="number" min="0.01" max="9999999999.99" step="0.01" value={form.valorPrevisto} onChange={update} required />
        <label htmlFor="vencimento">Vencimento</label><input id="vencimento" name="vencimento" type="date" value={form.vencimento} onChange={update} required />
        {paga && <div className="conditional-fields">
          <label htmlFor="dataPagamento">Data do pagamento</label><input id="dataPagamento" name="dataPagamento" type="date" value={form.dataPagamento} onChange={update} required />
          <label htmlFor="valorPago">Valor pago</label><input id="valorPago" name="valorPago" type="number" min="0.01" max="9999999999.99" step="0.01" value={form.valorPago} onChange={update} required />
          <label htmlFor="meioDePagamento">Meio de pagamento</label><input id="meioDePagamento" name="meioDePagamento" value={form.meioDePagamento} onChange={update} maxLength="30" required />
        </div>}
        <label htmlFor="fornecedor">Fornecedor</label><input id="fornecedor" name="fornecedor" value={form.fornecedor} onChange={update} maxLength="120" />
        <label htmlFor="observacoes">Observações</label><textarea id="observacoes" name="observacoes" value={form.observacoes} onChange={update} maxLength="1000" />
        {status.message && <p className={`form-message ${status.type}`} role="alert">{status.message}</p>}
        <button type="submit" disabled={submitting}>{submitting ? 'Cadastrando…' : 'Cadastrar despesa'}</button>
      </form>
    </section></div>
  </div></main>
}
