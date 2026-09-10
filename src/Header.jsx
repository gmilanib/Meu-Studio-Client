import { NavLink, useNavigate } from 'react-router'
import { useEffect, useState } from 'react'
import { useAuth } from './Auth.jsx'

export default function Header() {
    const { logout } = useAuth()
    const navigate = useNavigate()
    const [accent, setAccent] = useState(() => localStorage.getItem('meu-studio-accent') || '#775cf4')

    useEffect(() => {
        const rgb = accent.match(/[a-f\d]{2}/gi)?.map((value) => Number.parseInt(value, 16)).join(', ')
        document.documentElement.style.setProperty('--accent', accent)
        if (rgb) document.documentElement.style.setProperty('--accent-rgb', rgb)
        localStorage.setItem('meu-studio-accent', accent)
    }, [accent])

    async function handleLogout() {
        await logout()
        navigate('/login', { replace: true })
    }
    return (
        <header className="app-header">
            <NavLink to="/" className="app-brand">
                <span className="brand-mark" aria-hidden="true">✦</span>
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
            <label className="theme-control" title="Escolher cor de destaque">
                <span className="sr-only">Cor de destaque</span>
                <input className="theme-color" type="color" value={accent} onChange={(event) => setAccent(event.target.value)} />
                <span className="theme-swatch" aria-hidden="true" />
            </label>
        </header>
    )
}
