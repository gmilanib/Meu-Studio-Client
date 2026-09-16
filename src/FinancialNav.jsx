import { NavLink } from 'react-router'

const links = [
  ['/financeiro', 'Lançar faturamento'],
  ['/financeiro/despesas', 'Cadastrar despesa'],
  ['/financeiro/relatorio/faturamentos', 'Faturamentos'],
  ['/financeiro/relatorio/despesas', 'Despesas'],
  ['/financeiro/relatorio/resultado', 'Resultado'],
]

export default function FinancialNav() {
  return <nav className="financial-switch" aria-label="Opções financeiras">
    {links.map(([to, label]) => <NavLink key={to} to={to} end
      className={({ isActive }) => isActive ? 'active' : ''}>{label}</NavLink>)}
  </nav>
}
