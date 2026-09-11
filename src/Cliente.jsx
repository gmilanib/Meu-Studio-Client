import './App.css'
import Header from './Header.jsx'
import { Link } from 'react-router'
import { apiFetch } from './api.js'

function PostClient() {
    async function CallPost(formData){
        const nome = formData.get('name');
        const email = formData.get('email');
        const telefone = formData.get('telefone');
        const requestBody = JSON.stringify({
            nome,
            email: email || null,
            telefone: telefone || null,
        })

        const response = await apiFetch('/clientes',
            {
                method: 'POST',
                headers: {
                    'Content-Type':'application/json',
                },
                credentials: 'include',
                body: requestBody
            })

            if (!response.ok) throw new Error ('Erro ao cadastrar cliente')

    }

    return (
        <form className="client-form" action={CallPost}>
            <p className="eyebrow">Relacionamentos</p><h1>Novo cliente</h1><p>Adicione os dados para facilitar seus próximos atendimentos.</p>
            <nav className="financial-switch" aria-label="Opções de clientes"><Link to="/clientes" className="active">Cadastrar cliente</Link><Link to="/clientes/relatorio">Relatório de clientes</Link></nav>
            <label htmlFor="name">Nome</label><input id="name" name="name" type="text" placeholder="Nome completo" required />
            <label htmlFor="email">E-mail</label><input id="email" name="email" type="email" placeholder="cliente@email.com" />
            <label htmlFor="telefone">Telefone</label><input id="telefone" name="telefone" type="tel" placeholder="(00) 00000-0000" />
            <button type="submit">Cadastrar cliente</button>
        </form>
    )
}

export default function ScreenPostClient() {
    return (
        <main className="app-shell"><div className="app-frame"><Header /><div className="page-content"><PostClient /></div></div></main>
    )
}
