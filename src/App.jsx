import './App.css'
import { Link } from 'react-router'
import Header from './Header.jsx'

function Index(){
 return (
     <main className="app-shell"><div className="app-frame">
         <Header />
         <section className="dashboard">
           <div className="dashboard-hero">
             <div><p className="eyebrow">Visão geral</p><h1>Seu studio, em sintonia.</h1><p>Organize os atendimentos e acompanhe o financeiro com uma experiência simples, leve e feita para sua rotina.</p><Link to="/financeiro" className="primary-action">Lançar receita <span aria-hidden="true">→</span></Link></div>
             <aside className="hero-panel" aria-label="Resumo do Meu Studio"><div className="hero-panel-content"><div className="hero-icon" aria-hidden="true">✦</div><h2>Tudo sob controle</h2><p>Clareza para cuidar do que importa.</p></div></aside>
           </div>
           <div className="dashboard-grid">
             <Link to="/financeiro" className="dashboard-card card-link"><div><h2>Financeiro</h2><p>Registre receitas e mantenha seu caixa organizado.</p></div><div><div className="chart" aria-hidden="true"></div><span className="metric">+ receita</span></div></Link>
             <Link to="/clientes" className="dashboard-card card-link"><div><h2>Clientes</h2><p>Cadastre e preserve os dados de quem confia no seu trabalho.</p></div><div className="mini-orb" aria-hidden="true"></div></Link>
             <section className="dashboard-card"><h2>Acesso rápido</h2><div className="quick-actions"><Link to="/clientes" className="quick-action"><span aria-hidden="true">＋</span>Novo cliente</Link><Link to="/financeiro" className="quick-action"><span aria-hidden="true">↗</span>Nova receita</Link></div></section>
             <section className="dashboard-card"><h2>Personalize seu espaço</h2><p>Use o seletor de cor no topo para deixar a interface com a identidade do seu studio.</p></section>
           </div>
         </section>
     </div>
     </main>
)}

export default function Mainpage(){
    return(<Index></Index>)}
