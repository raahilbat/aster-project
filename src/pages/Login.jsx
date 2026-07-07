import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { jwtDecode } from 'jwt-decode'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) navigate('/')
  }, [user])

  function handleSuccess(credentialResponse) {
    const decoded = jwtDecode(credentialResponse.credential)
    login({
      name:    decoded.name,
      email:   decoded.email,
      picture: decoded.picture,
      sub:     decoded.sub,
    })
    navigate('/')
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      padding: 24,
    }}>
      <div style={{
        background: 'white',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        padding: '48px 40px',
        width: '100%',
        maxWidth: 420,
        boxShadow: 'var(--shadow-xl)',
        textAlign: 'center',
      }}>
        {/* Logo */}
        <div style={{
          width: 56, height: 56,
          background: 'var(--primary-gradient)',
          borderRadius: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
          fontSize: '1.6rem',
        }}>
          A
        </div>

        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 8 }}>
          Welcome to Aster Health
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 36, lineHeight: 1.6 }}>
          Sign in to access your personalised diabetes risk assessment and health dashboard.
        </p>

        {/* Google button — centred */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <GoogleLogin
            onSuccess={handleSuccess}
            onError={() => console.error('Google sign-in failed')}
            theme="outline"
            size="large"
            shape="rectangular"
            logo_alignment="left"
            width="300"
          />
        </div>

        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Your health data is stored only in your browser.
          We do not send personal information to any server.
        </p>
      </div>
    </div>
  )
}
