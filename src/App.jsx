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
           </div>
           <div className="dashboard-grid">
             <Link to="/financeiro" className="dashboard-card card-link"><h2>Financeiro</h2><p>Registre receitas e mantenha seu caixa organizado.</p></Link>
             <Link to="/clientes" className="dashboard-card card-link"><h2>Clientes</h2><p>Cadastre e preserve os dados de quem confia no seu trabalho.</p></Link>
             <section className="dashboard-card"><h2>Acesso rápido</h2><p>Navegue entre clientes e finanças pela navegação principal.</p></section>
             <section className="dashboard-card"><h2>Seu espaço</h2><p>Uma interface organizada e alinhada à identidade do seu studio.</p></section>
           </div>
         </section>
     </div>
     </main>
)}

export default function Mainpage(){
    return(<Index></Index>)}
