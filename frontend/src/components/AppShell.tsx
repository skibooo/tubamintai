import type { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom'
import './AppShell.css'
import logo from '../assets/tubamintai-logo.svg';

// then in JSX:
<img src={logo} alt="Tubamintai" className="logo-img" />

const navItems = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Billing', path: '/billing' },
]

export default function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/')
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark">
          <img src={logo} alt="Tubamintai" className="logo-img" />
        </div>
        {navItems.map((item) => (
          <Link to={item.path} key={item.label} style={{ textDecoration: 'none' }}>
            <div className={`side-item ${location.pathname === item.path ? 'active' : ''}`}>
              <div className="side-dot" />
              {item.label}
            </div>
          </Link>
        ))}
        <div className="side-item" onClick={handleLogout} style={{ marginTop: '20px', cursor: 'pointer' }}>
          <div className="side-dot" />
          Logout
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  )
}
