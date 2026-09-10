import { NavLink, useNavigate } from 'react-router'
import { useAuth } from './Auth.jsx'

export default function Header() {
    const { logout } = useAuth()
    const navigate = useNavigate()

    async function handleLogout() {
        await logout()
        navigate('/login', { replace: true })
    }
    return (
        <header className="app-header">
            <NavLink to="/" className="app-brand">
                Meu Studio
            </NavLink>

            <nav className="app-nav" aria-label="Navegação principal">
                <NavLink
                    to="/"
                    end
                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                    Início
                </NavLink>
                <NavLink
                    to="/clientes"
                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                    Clientes
                </NavLink>
                <NavLink
                    to="/financeiro"
                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                    Finanças
                </NavLink>
                <button className="nav-link logout-button" type="button" onClick={handleLogout}>
                    Sair
                </button>
            </nav>
        </header>
    )
}
