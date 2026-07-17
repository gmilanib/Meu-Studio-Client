import './App.css'

function PostClient() {
    function CallPost(formData){
        const nome = formData.get('name');
        const email = formData.get('email');
        const telefone = formData.get('telefone');
        const requestBody = JSON.stringify({nome, email, telefone})

        console.log(requestBody)

        fetch('http://localhost:9000/clientes',
            {
                method: 'POST',
                headers: {
                    'Content-Type':'application/json',
                },
                body: requestBody
            })

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
        <div className="Center">
            <PostClient />
        </div>);}

