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
                <img className="brand-logo" src="/brand-logo.png" alt="Taynara Rosa Beauty" />
                <span>Meu studio</span>
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
                <NavLink to="/procedimentos" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Procedimentos</NavLink>
                <button className="nav-link logout-button" type="button" onClick={handleLogout}>
                    Sair
                </button>
            </nav>
        </header>
    )
}
