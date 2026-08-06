import './App.css'
import { Link } from 'react-router'
import Header from './Header.jsx'

function Index(){
 return (
     <main>
         <Header />
         <div className="Center">
         <div className="Center-Box">
             {/*<Link to="/clientes" className="btn-link">Cadastrar cliente</Link>*/}
             {/*<Link to="/clientes" className="btn-link">Cadastrar cliente</Link>*/}
             {/*<Link to="/clientes" className="btn-link">Cadastrar cliente</Link>*/}
             <Link to="/clientes" className="btn-link">Clientes</Link>
             <Link to="/clientes" className="btn-link">Agendas</Link>
             <Link to="/clientes" className="btn-link">Finanças</Link>
             <Link to="/clientes" className="btn-link">Estoques e Materiais</Link>
             <Link to="/Login   " className="btn-link">Login</Link>

         </div>
             </div>
     </main>
)}

export default function Mainpage(){
    return(<Index></Index>)}
