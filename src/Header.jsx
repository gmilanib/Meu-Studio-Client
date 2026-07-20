import { NavLink } from 'react-router'

export default function Header() {
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
            </nav>
        </header>
    )
}
