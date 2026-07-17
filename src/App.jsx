import './App.css'
import { Link } from 'react-router'

function Index(){
 return(
     <main>
         <p>Olá mundo!</p>
         <Link to="/clientes">Cadastrar cliente</Link>
     </main>
)}

export default function Mainpage(){
    return(<Index></Index>)}
