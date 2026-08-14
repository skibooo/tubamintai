import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import './Login.css'
import logo from '../assets/tubamintai-logo.svg';

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const res = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Login failed')
        return
      }

      localStorage.setItem('token', data.token)
      navigate('/dashboard')
    } catch (err) {
      setError('Could not reach server')
    }
  }

  return (
    <div className="login-screen">
      <div className="login-left">
        <div className="brand-mark">
          <img src={logo} alt="Tubamintai" className="logo-img" />
        </div>
        <h2>Set it once.<br />It uploads itself.</h2>
        <p>Let AI Run Your Channel While You Focus on Growth.</p>

     <form onSubmit={handleLogin}>
          <div className="field">
            <label>Email</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@studio.com"
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••"
            />
          </div>

          {error && <p className="error-text">{error}</p>}

          <button type="submit" className="btn-primary">Sign in</button>
        </form>

        <p style={{ marginTop: '28px', fontSize: '14px', color: 'var(--text-dim)', textAlign: 'center', fontWeight: 600 }}>
          Don't have an account?{' '}
          <Link to="/signup" style={{ color: 'var(--rec)', fontWeight: 700, textDecoration: 'none' }}>
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}