import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { pathname } = useLocation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const links = [
    { to: '/dashboard',   label: 'Dashboard' },
    { to: '/lab-reports', label: 'Lab Reports' },
    { to: '/cgm',         label: 'CGM Data' },
  ]

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-logo">
          <div className="navbar-logo-icon">A</div>
          Aster Health
        </Link>

        <div className="navbar-links">
          {links.map(l => (
            <Link
              key={l.to}
              to={l.to}
              className={`navbar-link ${pathname === l.to ? 'active' : ''}`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/questionnaire" className="navbar-cta">
            Take Assessment
          </Link>

          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {user.picture
                ? <img src={user.picture} alt={user.name} style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid var(--border)' }} />
                : <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.85rem' }}>
                    {user.name?.[0]}
                  </div>
              }
              <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.name?.split(' ')[0]}
              </span>
              <button
                onClick={handleLogout}
                style={{ padding: '5px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'white', color: 'var(--text-secondary)', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
