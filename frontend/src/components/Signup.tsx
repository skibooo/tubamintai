import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import logo from '../assets/tubamintai-logo.svg';

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const res = await fetch('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Signup failed')
        return
      }

      navigate('/')
    } catch (err) {
      setError('Could not reach server')
    }
  }

  return (
    <div className="login-left" style={{ minHeight: '100vh', width: '100%' }}>
      <div className="brand-mark">
        <img src={logo} alt="Tubamintai" className="logo-img" />
      </div>
      <h2>Create your account</h2>
      <p>Start automating your channel in minutes.</p>

      <form onSubmit={handleSignup}>
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

        <button type="submit" className="btn-primary">Create account</button>
      </form>

      <p style={{ marginTop: '28px', fontSize: '14px', color: 'var(--text-dim)', textAlign: 'center', fontWeight: 600 }}>
  Don't have an account?{' '}
  <Link to="/signup" style={{ color: 'var(--rec)', fontWeight: 700, textDecoration: 'none' }}>
    Sign up
  </Link>
</p>
    </div>
  )
}