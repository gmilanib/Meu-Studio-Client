import './App.css'
import Header from './Header.jsx'
import { apiFetch } from './api.js'

function PostClient() {
    async function CallPost(formData){
        const nome = formData.get('name');
        const email = formData.get('email');
        const telefone = formData.get('telefone');
        const requestBody = JSON.stringify({nome, email, telefone})

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
        <form action={CallPost}>
            <input name="name" type="text" placeholder="Nome"/>
            <br/>
            <input name="email" type="email" placeholder="Email"/>
            <br/>
            <input name="telefone" type="tel" placeholder="Telefone"/>
            <br/>
            <button type="submit">Cadastrar Cliente</button>
        </form>
    )
}

export default function ScreenPostClient() {
    return (
        <>
            <Header />
            <main className="Center">
            <PostClient />
            </main>
        </>
    )
}
