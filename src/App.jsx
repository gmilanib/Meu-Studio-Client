import './App.css'
import { Link } from 'react-router'
import Header from './Header.jsx'

function Index(){
 return (
     <main>
         <Header />
         <div className="Center">
         <div className="Center-Box">
             <Link to="/clientes" className="btn-link">Clientes</Link>
             <Link to="/financeiro" className="btn-link">Lançar receita</Link>

         </div>
             </div>
     </main>
)}

export default function Mainpage(){
    return(<Index></Index>)}
