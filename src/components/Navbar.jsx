import { Link, useLocation } from 'react-router-dom'

export default function Navbar() {
  const { pathname } = useLocation()

  const links = [
    { to: '/dashboard',   label: 'Dashboard' },
    { to: '/lab-reports', label: 'Lab Reports' },
    { to: '/cgm',         label: 'CGM Data' },
  ]

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

        <Link to="/questionnaire" className="navbar-cta">
          Take Assessment
        </Link>
      </div>
    </nav>
  )
}
